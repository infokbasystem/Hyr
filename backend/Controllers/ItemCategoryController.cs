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

            // Apply sorting (default to Name:asc, then Id:desc for deterministic ties)
            var sortBy = filter.SortBy ?? new[] { "Name:asc", "Id:desc" };
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
        public async Task<ActionResult<ItemCategoryDto>> PostItemCategory([FromBody] ItemCategoryUpsertDto itemCategory)
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
                        .FirstOrDefaultAsync(ic => ic.Id == itemCategory.Id && ic.OfficeId == user.OfficeId);
                    if (itemCategoryInDb == null)
                    {
                        return NotFound(new { message = "ItemCategory not found" });
                    }
                }

                ApplyItemCategoryChanges(itemCategoryInDb, itemCategory);

                await _context.SaveChangesAsync();
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
            };
        }

        private static void ApplyItemCategoryChanges(ItemCategory target, ItemCategoryUpsertDto source)
        {
            target.Name = source.Name?.Trim() ?? string.Empty;
        }
    }
}
