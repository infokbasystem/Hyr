using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Hyr.Api.Data;
using Hyr.Api.Models;
using Hyr.Api.Filters;
using Hyr.Api.Utils;

namespace Hyr.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ArticleController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ArticleController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<Article>>> GetArticles([FromQuery] ArticleFilter filter)
        {
            var userIdClaim = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                             ?? User?.FindFirst("sub")?.Value
                             ?? User?.FindFirst("id")?.Value;
            _ = int.TryParse(userIdClaim, out int userId);

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var query = _context.Articles
                .Where(a => a.OfficeId == user.OfficeId)
                .Include(a => a.Account)
                .Include(a => a.VatRate)
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

            // Apply sorting (default to Name:asc if not specified)
            var sortBy = filter.SortBy ?? new[] { "Name:asc" };
            query = query.ApplyMultiSort(sortBy);

            var pagedQuery = query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize);

            var articles = await pagedQuery.Select(a => new Article
            {
                Id = a.Id,
                OfficeId = a.OfficeId,
                ArticleNr = a.ArticleNr,
                Name = a.Name,
                Price = a.Price,
                AccountId = a.AccountId,
                VatRateId = a.VatRateId,
                IsActive = a.IsActive,
            }).ToListAsync();

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
            var article = await _context.Articles
                .Include(a => a.Office)
                .Include(a => a.Account)
                .Include(a => a.VatRate)
                .FirstOrDefaultAsync(a => a.Id == id);

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
            var article = await _context.Articles.FindAsync(id);
            if (article == null)
            {
                return NotFound();
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

                var userIdClaim = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                                 ?? User?.FindFirst("sub")?.Value
                                 ?? User?.FindFirst("id")?.Value;
                _ = int.TryParse(userIdClaim, out int userId);

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return Unauthorized(new { message = "User not found" });
                }

                Article? articleInDb = null;

                if (article.Id == 0)
                {
                    articleInDb = new Article();
                    articleInDb.OfficeId = user.OfficeId;
                    _context.Articles.Add(articleInDb);
                }
                else
                {
                    articleInDb = await _context.Articles.FindAsync(article.Id);
                    if (articleInDb == null)
                    {
                        return NotFound(new { message = "Article not found" });
                    }
                }

                articleInDb.ArticleNr = article.ArticleNr;
                articleInDb.Name = article.Name;
                articleInDb.Price = article.Price;
                articleInDb.AccountId = article.AccountId;
                articleInDb.VatRateId = article.VatRateId;
                articleInDb.IsActive = article.IsActive;

                await _context.SaveChangesAsync();
                return Ok(articleInDb);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        private async Task<bool> ArticleExists(int id)
        {
            return await _context.Articles.AnyAsync(a => a.Id == id);
        }
    }
}
