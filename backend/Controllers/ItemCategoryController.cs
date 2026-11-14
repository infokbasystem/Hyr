using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Filters;
using Backend.Services;
using Backend.Utils;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ItemCategoryController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ItemCategoryController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        /// <summary>Returns the current office's articles for category assignment.</summary>
        [HttpGet("form-options")]
        [Authorize]
        [ProducesResponseType<ItemCategoryFormOptionsDto>(StatusCodes.Status200OK)]
        public async Task<ActionResult<ItemCategoryFormOptionsDto>> GetFormOptions(CancellationToken cancellationToken = default)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (!user.OfficeId.HasValue)
            {
                return BadRequest(new { message = "User has no office" });
            }

            var articles = await _context.Articles
                .AsNoTracking()
                .Where(article => article.OfficeId == user.OfficeId)
                .OrderBy(article => article.ArticleNr)
                .ThenBy(article => article.Name)
                .Select(article => new CategoryArticleOptionDto(article.Id, article.ArticleNr, article.Name, article.IsActive, article.Price))
                .ToListAsync(cancellationToken);

            return Ok(new ItemCategoryFormOptionsDto(articles));
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<ItemCategoryDto>>> GetItemCategories([FromQuery] ItemCategoryFilter filter)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var query = _context.ItemCategories
                .Where(ic => ic.OfficeId == user.OfficeId)
                .AsQueryable();

            if (filter.Id.HasValue)
                query = query.Where(ic => ic.Id == filter.Id.Value);

            if (!string.IsNullOrEmpty(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.ToLower();
                query = query.Where(ic =>
                    ic.Name.ToLower().Contains(searchTerm));
            }

            var totalRecords = await query.CountAsync();

            // Apply sorting (default to SortOrder:asc, Name:asc, then Id:desc for deterministic ties)
            var sortBy = filter.SortBy ?? new[] { "SortOrder:asc", "Name:asc", "Id:desc" };
            query = query.ApplyMultiSort(sortBy);

            var pagedQuery = query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize);

            var itemCategories = await pagedQuery
                .AsNoTracking()
                .Select(ic => new ItemCategoryDto
                {
                    Id = ic.Id,
                    OfficeId = ic.OfficeId,
                    Name = ic.Name,
                    SortOrder = ic.SortOrder,
                    ArticleIds = ic.CategoryArticles.OrderBy(link => link.ArticleId).Select(link => link.ArticleId).ToArray(),
                    Articles = ic.CategoryArticles.OrderBy(link => link.ArticleId)
                        .Select(link => new CategoryArticleDto { ArticleId = link.ArticleId, Quantity = link.Quantity }).ToArray(),
                })
                .ToListAsync();

            return Ok(new PagedResult<ItemCategoryDto>
            {
                Data = itemCategories,
                TotalRecords = totalRecords,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalRecords / filter.PageSize),
                HasNextPage = filter.Page * filter.PageSize < totalRecords,
                HasPreviousPage = filter.Page > 1
            });
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<ItemCategoryDto>> GetItemCategory(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var itemCategory = await _context.ItemCategories
                .AsNoTracking()
                .Where(ic => ic.Id == id && ic.OfficeId == user.OfficeId)
                .Select(ic => new ItemCategoryDto
                {
                    Id = ic.Id,
                    OfficeId = ic.OfficeId,
                    Name = ic.Name,
                    SortOrder = ic.SortOrder,
                    ArticleIds = ic.CategoryArticles.OrderBy(link => link.ArticleId).Select(link => link.ArticleId).ToArray(),
                    Articles = ic.CategoryArticles.OrderBy(link => link.ArticleId)
                        .Select(link => new CategoryArticleDto { ArticleId = link.ArticleId, Quantity = link.Quantity }).ToArray(),
                })
                .FirstOrDefaultAsync();

            if (itemCategory == null)
            {
                return NotFound();
            }

            return Ok(itemCategory);
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteItemCategory(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var itemCategory = await _context.ItemCategories
                .FirstOrDefaultAsync(ic => ic.Id == id && ic.OfficeId == user.OfficeId);

            if (itemCategory == null)
            {
                return NotFound();
            }

            _context.ItemCategories.Remove(itemCategory);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<ItemCategoryDto>> PostItemCategory([FromBody] ItemCategoryUpsertDto itemCategory, CancellationToken cancellationToken = default)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var user = await _currentUserService.GetCurrentUserAsync(User);
                if (user == null)
                {
                    return Unauthorized(new { message = "User not found" });
                }

                var articles = itemCategory.Articles;
                if (articles != null
                    && (articles.Any(article => article == null || article.Quantity <= 0m
                            || article.Quantity > 9999999999999.99999m
                            || decimal.Round(article.Quantity, 5) != article.Quantity)
                        || articles.Select(article => article.ArticleId).Distinct().Count() != articles.Length))
                {
                    return BadRequest(new { message = "Varje artikel får bara förekomma en gång och måste ha ett positivt antal med högst fem decimaler." });
                }

                var articleIds = articles?.Select(article => article.ArticleId).ToArray()
                    ?? itemCategory.ArticleIds?.Distinct().ToArray();
                if (articleIds != null)
                {
                    var validArticleCount = await _context.Articles
                        .CountAsync(article => articleIds.Contains(article.Id) && article.OfficeId == user.OfficeId, cancellationToken);
                    if (articleIds.Any(id => id <= 0) || validArticleCount != articleIds.Length
                        || (articleIds.Length > 0 && !user.OfficeId.HasValue))
                    {
                        return BadRequest(new { message = "Artiklarna måste tillhöra det aktuella kontoret." });
                    }
                }

                ItemCategory? itemCategoryInDb = null;

                if (itemCategory.Id == 0)
                {
                    itemCategoryInDb = new ItemCategory();
                    itemCategoryInDb.OfficeId = user.OfficeId;
                    _context.ItemCategories.Add(itemCategoryInDb);
                }
                else
                {
                    itemCategoryInDb = await _context.ItemCategories
                        .Include(ic => ic.CategoryArticles)
                        .FirstOrDefaultAsync(ic => ic.Id == itemCategory.Id && ic.OfficeId == user.OfficeId, cancellationToken);
                    if (itemCategoryInDb == null)
                    {
                        return NotFound(new { message = "ItemCategory not found" });
                    }
                }

                ApplyItemCategoryChanges(itemCategoryInDb, itemCategory);

                if (articleIds != null)
                {
                    foreach (var link in itemCategoryInDb.CategoryArticles.Where(link => !articleIds.Contains(link.ArticleId)).ToList())
                    {
                        itemCategoryInDb.CategoryArticles.Remove(link);
                        _context.CategoryArticles.Remove(link);
                    }

                    var existingArticles = itemCategoryInDb.CategoryArticles.ToDictionary(link => link.ArticleId);
                    var quantities = articles?.ToDictionary(article => article.ArticleId, article => article.Quantity);
                    foreach (var articleId in articleIds)
                    {
                        if (!existingArticles.TryGetValue(articleId, out var link))
                        {
                            link = new CategoryArticle { ArticleId = articleId };
                            itemCategoryInDb.CategoryArticles.Add(link);
                        }

                        if (quantities != null)
                        {
                            link.Quantity = quantities[articleId];
                        }
                    }
                }

                await _context.SaveChangesAsync(cancellationToken);
                return Ok(MapItemCategory(itemCategoryInDb));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        private static ItemCategoryDto MapItemCategory(ItemCategory category)
        {
            return new ItemCategoryDto
            {
                Id = category.Id,
                OfficeId = category.OfficeId,
                Name = category.Name,
                SortOrder = category.SortOrder,
                ArticleIds = category.CategoryArticles.Select(link => link.ArticleId).OrderBy(id => id).ToArray(),
                Articles = category.CategoryArticles.OrderBy(link => link.ArticleId)
                    .Select(link => new CategoryArticleDto { ArticleId = link.ArticleId, Quantity = link.Quantity }).ToArray(),
            };
        }

        private static void ApplyItemCategoryChanges(ItemCategory target, ItemCategoryUpsertDto source)
        {
            target.Name = source.Name?.Trim() ?? string.Empty;
            target.SortOrder = source.SortOrder;
        }
    }
}
