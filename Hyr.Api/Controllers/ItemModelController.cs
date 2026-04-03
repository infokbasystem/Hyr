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
    public class ItemModelController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ItemModelController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<ItemModel>>> GetItemModels([FromQuery] ItemModelFilter filter)
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

            var query = _context.ItemModels
                .Where(im => im.OfficeId == user.OfficeId)
                .Include(im => im.Office)
                .AsQueryable();

            if (filter.Id.HasValue)
                query = query.Where(im => im.Id == filter.Id.Value);

            if (!string.IsNullOrEmpty(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.ToLower();
                query = query.Where(im =>
                    im.Name.ToLower().Contains(searchTerm));
            }

            var totalRecords = await query.CountAsync();

            // Apply sorting (default to Name:asc if not specified)
            var sortBy = filter.SortBy ?? new[] { "Name:asc" };
            query = query.ApplyMultiSort(sortBy);

            var pagedQuery = query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize);

            var itemModels = await pagedQuery.Select(im => new ItemModel
            {
                Id = im.Id,
                OfficeId = im.OfficeId,
                Name = im.Name,
            }).ToListAsync();

            return Ok(new PagedResult<ItemModel>
            {
                Data = itemModels,
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
        public async Task<ActionResult<ItemModel>> GetItemModel(int id)
        {
            var itemModel = await _context.ItemModels
                .Include(im => im.Office)
                .FirstOrDefaultAsync(im => im.Id == id);

            if (itemModel == null)
            {
                return NotFound();
            }

            return Ok(itemModel);
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteItemModel(int id)
        {
            var itemModel = await _context.ItemModels.FindAsync(id);
            if (itemModel == null)
            {
                return NotFound();
            }

            _context.ItemModels.Remove(itemModel);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<ItemModel>> PostItemModel([FromBody] ItemModel itemModel)
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

                ItemModel? itemModelInDb = null;

                if (itemModel.Id == 0)
                {
                    itemModelInDb = new ItemModel();
                    itemModelInDb.OfficeId = user.OfficeId;
                    _context.ItemModels.Add(itemModelInDb);
                }
                else
                {
                    itemModelInDb = await _context.ItemModels.FindAsync(itemModel.Id);
                    if (itemModelInDb == null)
                    {
                        return NotFound(new { message = "ItemModel not found" });
                    }
                }

                itemModelInDb.Name = itemModel.Name;

                await _context.SaveChangesAsync();
                return Ok(itemModelInDb);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        private async Task<bool> ItemModelExists(int id)
        {
            return await _context.ItemModels.AnyAsync(im => im.Id == id);
        }
    }
}
