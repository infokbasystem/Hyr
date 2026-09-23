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
    public class ArticleController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ArticleController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet("form-options")]
        [Authorize]
        public async Task<ActionResult<ArticleFormOptionsDto>> GetFormOptions()
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

            var formOptions = await BuildArticleFormOptions(user.OfficeId.Value);
            return Ok(formOptions);
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<Article>>> GetArticles([FromQuery] ArticleFilter filter)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var query = _context.Articles
                .Include(a => a.Account)
                .Where(a => a.OfficeId == user.OfficeId)
                .AsQueryable();


            if (filter.Id.HasValue)
                query = query.Where(a => a.Id == filter.Id.Value);

            if (!string.IsNullOrEmpty(filter.ArticleNr))
                query = query.Where(a => a.ArticleNr == filter.ArticleNr);

            if (filter.IsActive.HasValue)
                query = query.Where(a => a.IsActive == filter.IsActive.Value);

            if (!string.IsNullOrEmpty(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.ToLower();
                query = query.Where(a =>
                    a.Name.ToLower().Contains(searchTerm) ||
                    a.ArticleNr.ToLower().Contains(searchTerm));
            }

            var totalRecords = await query.CountAsync();

            // Apply sorting (default to Name:asc, then Id:desc for deterministic ties)
            var sortBy = filter.SortBy ?? new[] { "Name:asc", "Id:desc" };
            query = query.ApplyMultiSort(sortBy);

            var pagedQuery = query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize);

            var articles = await pagedQuery
                .AsNoTracking()
                .Select(a => MapArticle(a))
                .ToListAsync();

            return Ok(new PagedResult<Article>
            {
                Data = articles,
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
        public async Task<ActionResult<Article>> GetArticle(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var article = await _context.Articles
                .AsNoTracking()
                .Include(a => a.Account)
                .Where(a => a.Id == id && a.OfficeId == user.OfficeId)
                .Select(a => MapArticle(a))
                .FirstOrDefaultAsync();

            if (article == null)
            {
                return NotFound();
            }

            return Ok(article);
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteArticle(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var article = await _context.Articles
                .FirstOrDefaultAsync(a => a.Id == id && a.OfficeId == user.OfficeId);

            if (article == null)
            {
                return NotFound();
            }

            if (!string.IsNullOrWhiteSpace(article.CalcPriceTypeCode))
            {
                return BadRequest(new { message = "Systemartiklar kan inte tas bort." });
            }

            _context.Articles.Remove(article);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Article>> PostArticle([FromBody] Article article)
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

                if (!user.OfficeId.HasValue)
                {
                    return BadRequest(new { message = "User has no office" });
                }

                Article? articleInDb = null;

                if (article.Id == 0)
                {
                    articleInDb = new Article();
                    articleInDb.OfficeId = user.OfficeId.Value;
                    _context.Articles.Add(articleInDb);
                }
                else
                {
                    articleInDb = await _context.Articles
                        .FirstOrDefaultAsync(a => a.Id == article.Id && a.OfficeId == user.OfficeId);

                    if (articleInDb == null)
                    {
                        return NotFound(new { message = "Article not found" });
                    }
                }

                ApplyArticleChanges(articleInDb, article);

                await _context.SaveChangesAsync();
                return Ok(MapArticle(articleInDb));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        private static Article MapArticle(Article source)
        {
            return new Article
            {
                Id = source.Id,
                OfficeId = source.OfficeId,
                ArticleNr = source.ArticleNr,
                Name = source.Name,
                Price = source.Price,
                AccountId = source.AccountId,
                AccountNr = source.Account?.AccountNr,
                VatRateId = source.VatRateId,
                IsActive = source.IsActive,
                CalcPriceTypeCode = source.CalcPriceTypeCode,
            };
        }

        private static void ApplyArticleChanges(Article target, Article source)
        {
            target.ArticleNr = source.ArticleNr?.Trim() ?? string.Empty;
            target.Name = source.Name?.Trim() ?? string.Empty;
            target.Price = source.Price;
            target.AccountId = source.AccountId;
            target.VatRateId = source.VatRateId;
            target.IsActive = source.IsActive;
        }

        private async Task<ArticleFormOptionsDto> BuildArticleFormOptions(int officeId)
        {
            var accounts = await _context.Accounts
                .Where(account => account.OfficeId == officeId)
                .AsNoTracking()
                .OrderBy(account => account.AccountNr)
                .ThenBy(account => account.Name)
                .Select(account => new AccountOptionDto
                {
                    Id = account.Id,
                    AccountNr = account.AccountNr,
                    Name = account.Name,
                })
                .ToListAsync();

            var vatRates = await _context.VatRates
                .Where(vatRate => vatRate.OfficeId == officeId)
                .AsNoTracking()
                .OrderByDescending(vatRate => vatRate.IsDefault)
                .ThenBy(vatRate => vatRate.Name)
                .Select(vatRate => new VatRateOptionDto
                {
                    Id = vatRate.Id,
                    Name = vatRate.Name,
                    Rate = vatRate.Rate,
                })
                .ToListAsync();

            return new ArticleFormOptionsDto
            {
                Accounts = accounts,
                VatRates = vatRates,
            };
        }
    }
}
