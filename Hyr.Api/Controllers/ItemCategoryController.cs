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
    public class ItemCategoryController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ItemCategoryController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<ItemCategory>>> GetItemCategories([FromQuery] ItemCategoryFilter filter)
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

            var query = _context.ItemCategories
                .Where(ic => ic.OfficeId == user.OfficeId)
                .Include(ic => ic.Office)
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

            // Apply sorting (default to Name:asc if not specified)
            var sortBy = filter.SortBy ?? new[] { "Name:asc" };
            query = query.ApplyMultiSort(sortBy);

            var pagedQuery = query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize);

            var itemCategories = await pagedQuery.Select(ic => new ItemCategory
            {
                Id = ic.Id,
                OfficeId = ic.OfficeId,
                Name = ic.Name,
            }).ToListAsync();

            return Ok(new PagedResult<ItemCategory>
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
        public async Task<ActionResult<ItemCategory>> GetItemCategory(int id)
        {
            var itemCategory = await _context.ItemCategories
                .Include(ic => ic.Office)
                .FirstOrDefaultAsync(ic => ic.Id == id);

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
            var itemCategory = await _context.ItemCategories.FindAsync(id);
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
        public async Task<ActionResult<ItemCategory>> PostItemCategory([FromBody] ItemCategory itemCategory)
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

                ItemCategory? itemCategoryInDb = null;

                if (itemCategory.Id == 0)
                {
                    itemCategoryInDb = new ItemCategory();
                    itemCategoryInDb.OfficeId = user.OfficeId;
                    _context.ItemCategories.Add(itemCategoryInDb);
                }
                else
                {
                    itemCategoryInDb = await _context.ItemCategories.FindAsync(itemCategory.Id);
                    if (itemCategoryInDb == null)
                    {
                        return NotFound(new { message = "ItemCategory not found" });
                    }
                }

                itemCategoryInDb.Name = itemCategory.Name;

                await _context.SaveChangesAsync();
                return Ok(itemCategoryInDb);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        private async Task<bool> ItemCategoryExists(int id)
        {
            return await _context.ItemCategories.AnyAsync(ic => ic.Id == id);
        }
    }
}
