using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Hyr.Api.Data;
using Hyr.Api.Dtos;
using Hyr.Api.Models;
using Hyr.Api.Filters;
using Hyr.Api.Services;
using Hyr.Api.Utils;

namespace Hyr.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ItemModelController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ItemModelController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<ItemModelDto>>> GetItemModels([FromQuery] ItemModelFilter filter)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var query = _context.ItemModels
                .Where(im => im.OfficeId == user.OfficeId)
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

            // Apply sorting (default to Name:asc, then Id:desc for deterministic ties)
            var sortBy = filter.SortBy ?? new[] { "Name:asc", "Id:desc" };
            query = query.ApplyMultiSort(sortBy);

            var pagedQuery = query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize);

            var itemModels = await pagedQuery
                .AsNoTracking()
                .Select(im => new ItemModelDto
                {
                    Id = im.Id,
                    OfficeId = im.OfficeId,
                    Name = im.Name,
                })
                .ToListAsync();

            return Ok(new PagedResult<ItemModelDto>
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
        public async Task<ActionResult<ItemModelDto>> GetItemModel(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var itemModel = await _context.ItemModels
                .AsNoTracking()
                .Where(im => im.Id == id && im.OfficeId == user.OfficeId)
                .Select(im => new ItemModelDto
                {
                    Id = im.Id,
                    OfficeId = im.OfficeId,
                    Name = im.Name,
                })
                .FirstOrDefaultAsync();

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
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var itemModel = await _context.ItemModels
                .FirstOrDefaultAsync(im => im.Id == id && im.OfficeId == user.OfficeId);

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
        public async Task<ActionResult<ItemModelDto>> PostItemModel([FromBody] ItemModelUpsertDto itemModel)
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

                ItemModel? itemModelInDb = null;

                if (itemModel.Id == 0)
                {
                    itemModelInDb = new ItemModel();
                    itemModelInDb.OfficeId = user.OfficeId;
                    _context.ItemModels.Add(itemModelInDb);
                }
                else
                {
                    itemModelInDb = await _context.ItemModels
                        .FirstOrDefaultAsync(im => im.Id == itemModel.Id && im.OfficeId == user.OfficeId);

                    if (itemModelInDb == null)
                    {
                        return NotFound(new { message = "ItemModel not found" });
                    }
                }

                ApplyItemModelChanges(itemModelInDb, itemModel);

                await _context.SaveChangesAsync();
                return Ok(MapItemModel(itemModelInDb));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        private static ItemModelDto MapItemModel(ItemModel model)
        {
            return new ItemModelDto
            {
                Id = model.Id,
                OfficeId = model.OfficeId,
                Name = model.Name,
            };
        }

        private static void ApplyItemModelChanges(ItemModel target, ItemModelUpsertDto source)
        {
            target.Name = source.Name?.Trim() ?? string.Empty;
        }
    }
}
