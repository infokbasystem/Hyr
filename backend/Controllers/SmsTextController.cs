using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Backend.Data;
using Backend.Dtos;
using Backend.Filters;
using Backend.Models;
using Backend.Services;
using Backend.Utils;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SmsTextController : ControllerBase
    {
        private static readonly string[] RequiredItems =
        {
            "RESERVATION",
            "RESERVATIONCONFIRMATION",
            "PICKUPREMINDER",
            "RETURNREMINDER",
            "TINKPAYMENT",
        };

        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public SmsTextController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<SmsTextDto>>> GetSmsTexts([FromQuery] SmsTextFilter filter)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user?.OfficeId == null)
            {
                return Unauthorized(new { message = "User or office not found" });
            }

            await EnsureRequiredSmsTextsAsync(user.OfficeId.Value);

            var query = _context.SmsTexts
                .Where(smsText => smsText.OfficeId == user.OfficeId.Value)
                .AsQueryable();

            if (filter.Id.HasValue)
            {
                query = query.Where(smsText => smsText.Id == filter.Id.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.Trim().ToLower();
                query = query.Where(smsText =>
                    smsText.Item.ToLower().Contains(searchTerm)
                    || smsText.Titel.ToLower().Contains(searchTerm)
                    || smsText.Text.ToLower().Contains(searchTerm));
            }

            var totalRecords = await query.CountAsync();

            var sortBy = filter.SortBy ?? new[] { "Item:asc", "Id:asc" };
            query = query.ApplyMultiSort(sortBy);

            var smsTexts = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .AsNoTracking()
                .Select(smsText => new SmsTextDto
                {
                    Id = smsText.Id,
                    OfficeId = smsText.OfficeId,
                    Item = smsText.Item,
                    Titel = smsText.Titel,
                    Text = smsText.Text,
                })
                .ToListAsync();

            return Ok(new PagedResult<SmsTextDto>
            {
                Data = smsTexts,
                TotalRecords = totalRecords,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalRecords / filter.PageSize),
                HasNextPage = filter.Page * filter.PageSize < totalRecords,
                HasPreviousPage = filter.Page > 1,
            });
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<SmsTextDto>> GetSmsText(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user?.OfficeId == null)
            {
                return Unauthorized(new { message = "User or office not found" });
            }

            await EnsureRequiredSmsTextsAsync(user.OfficeId.Value);

            var smsText = await _context.SmsTexts
                .AsNoTracking()
                .Where(entry => entry.Id == id && entry.OfficeId == user.OfficeId.Value)
                .Select(entry => new SmsTextDto
                {
                    Id = entry.Id,
                    OfficeId = entry.OfficeId,
                    Item = entry.Item,
                    Titel = entry.Titel,
                    Text = entry.Text,
                })
                .FirstOrDefaultAsync();

            if (smsText == null)
            {
                return NotFound();
            }

            return Ok(smsText);
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteSmsText(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user?.OfficeId == null)
            {
                return Unauthorized(new { message = "User or office not found" });
            }

            var smsText = await _context.SmsTexts
                .FirstOrDefaultAsync(entry => entry.Id == id && entry.OfficeId == user.OfficeId.Value);

            if (smsText == null)
            {
                return NotFound();
            }

            _context.SmsTexts.Remove(smsText);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<SmsTextDto>> PostSmsText([FromBody] SmsTextUpsertDto smsText)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var user = await _currentUserService.GetCurrentUserAsync(User);
                if (user?.OfficeId == null)
                {
                    return Unauthorized(new { message = "User or office not found" });
                }

                SmsText? smsTextInDb;
                if (smsText.Id == 0)
                {
                    smsTextInDb = new SmsText
                    {
                        OfficeId = user.OfficeId.Value,
                    };

                    _context.SmsTexts.Add(smsTextInDb);
                }
                else
                {
                    smsTextInDb = await _context.SmsTexts
                        .FirstOrDefaultAsync(entry => entry.Id == smsText.Id && entry.OfficeId == user.OfficeId.Value);

                    if (smsTextInDb == null)
                    {
                        return NotFound(new { message = "Sms text not found" });
                    }
                }

                ApplySmsTextChanges(smsTextInDb, smsText);

                await _context.SaveChangesAsync();
                return Ok(MapSmsText(smsTextInDb));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        private async Task EnsureRequiredSmsTextsAsync(int officeId)
        {
            var existingItems = await _context.SmsTexts
                .Where(smsText => smsText.OfficeId == officeId)
                .Select(smsText => smsText.Item)
                .ToListAsync();

            var existingItemSet = new HashSet<string>(existingItems, StringComparer.OrdinalIgnoreCase);
            var missingItems = RequiredItems.Where(item => !existingItemSet.Contains(item)).ToList();

            if (missingItems.Count == 0)
            {
                return;
            }

            foreach (var missingItem in missingItems)
            {
                _context.SmsTexts.Add(new SmsText
                {
                    OfficeId = officeId,
                    Item = missingItem,
                    Titel = string.Empty,
                    Text = string.Empty,
                });
            }

            await _context.SaveChangesAsync();
        }

        private static SmsTextDto MapSmsText(SmsText smsText)
        {
            return new SmsTextDto
            {
                Id = smsText.Id,
                OfficeId = smsText.OfficeId,
                Item = smsText.Item,
                Titel = smsText.Titel,
                Text = smsText.Text,
            };
        }

        private static void ApplySmsTextChanges(SmsText target, SmsTextUpsertDto source)
        {
            target.Item = source.Item?.Trim() ?? string.Empty;
            target.Titel = source.Titel?.Trim() ?? string.Empty;
            target.Text = source.Text ?? string.Empty;
        }
    }
}
