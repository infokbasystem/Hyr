using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Backend.Data;
using Backend.Dtos;
using Backend.Services;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ItemTypeController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ItemTypeController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<ActionResult<List<ItemTypeOptionDto>>> GetItemTypes()
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

            var officeId = user.OfficeId.Value;

            var itemTypes = await _context.OfficeItemTypes
                .Where(officeItemType => officeItemType.OfficeId == officeId)
                .Select(officeItemType => officeItemType.ItemType)
                .AsNoTracking()
                .OrderBy(itemType => itemType.Name)
                .Select(itemType => new ItemTypeOptionDto
                {
                    Id = itemType!.Id,
                    Code = itemType.Code,
                    Name = itemType.Name,
                })
                .ToListAsync();

            return Ok(itemTypes);
        }
    }
}