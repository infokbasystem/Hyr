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
    public class MailTextController : ControllerBase
    {
        private static readonly string[] RequiredItems =
        {
            "RESERVATION",
            "INVOICE",
            "INVOICEREMINDER",
            "RESERVATIONCONFIRMATION",
            "TINKPAYMENT",
        };

        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public MailTextController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<MailTextDto>>> GetMailTexts([FromQuery] MailTextFilter filter)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user?.OfficeId == null)
            {
                return Unauthorized(new { message = "User or office not found" });
            }

            await EnsureRequiredMailTextsAsync(user.OfficeId.Value);

            var query = _context.MailTexts
                .Where(mailText => mailText.OfficeId == user.OfficeId.Value)
                .AsQueryable();

            if (filter.Id.HasValue)
            {
                query = query.Where(mailText => mailText.Id == filter.Id.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.Trim().ToLower();
                query = query.Where(mailText =>
                    mailText.Item.ToLower().Contains(searchTerm)
                    || mailText.Subject.ToLower().Contains(searchTerm)
                    || mailText.BodyHtml.ToLower().Contains(searchTerm));
            }

            var totalRecords = await query.CountAsync();

            var sortBy = filter.SortBy ?? new[] { "Item:asc", "Id:asc" };
            query = query.ApplyMultiSort(sortBy);

            var mailTexts = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .AsNoTracking()
                .Select(mailText => new MailTextDto
                {
                    Id = mailText.Id,
                    OfficeId = mailText.OfficeId,
                    Item = mailText.Item,
                    Subject = mailText.Subject,
                    BodyHtml = mailText.BodyHtml,
                })
                .ToListAsync();

            return Ok(new PagedResult<MailTextDto>
            {
                Data = mailTexts,
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
        public async Task<ActionResult<MailTextDto>> GetMailText(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user?.OfficeId == null)
            {
                return Unauthorized(new { message = "User or office not found" });
            }

            await EnsureRequiredMailTextsAsync(user.OfficeId.Value);

            var mailText = await _context.MailTexts
                .AsNoTracking()
                .Where(entry => entry.Id == id && entry.OfficeId == user.OfficeId.Value)
                .Select(entry => new MailTextDto
                {
                    Id = entry.Id,
                    OfficeId = entry.OfficeId,
                    Item = entry.Item,
                    Subject = entry.Subject,
                    BodyHtml = entry.BodyHtml,
                })
                .FirstOrDefaultAsync();

            if (mailText == null)
            {
                return NotFound();
            }

            return Ok(mailText);
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteMailText(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user?.OfficeId == null)
            {
                return Unauthorized(new { message = "User or office not found" });
            }

            var mailText = await _context.MailTexts
                .FirstOrDefaultAsync(entry => entry.Id == id && entry.OfficeId == user.OfficeId.Value);

            if (mailText == null)
            {
                return NotFound();
            }

            _context.MailTexts.Remove(mailText);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<MailTextDto>> PostMailText([FromBody] MailTextUpsertDto mailText)
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

                MailText? mailTextInDb;
                if (mailText.Id == 0)
                {
                    mailTextInDb = new MailText
                    {
                        OfficeId = user.OfficeId.Value,
                    };

                    _context.MailTexts.Add(mailTextInDb);
                }
                else
                {
                    mailTextInDb = await _context.MailTexts
                        .FirstOrDefaultAsync(entry => entry.Id == mailText.Id && entry.OfficeId == user.OfficeId.Value);

                    if (mailTextInDb == null)
                    {
                        return NotFound(new { message = "Mail text not found" });
                    }
                }

                ApplyMailTextChanges(mailTextInDb, mailText);

                await _context.SaveChangesAsync();
                return Ok(MapMailText(mailTextInDb));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        private async Task EnsureRequiredMailTextsAsync(int officeId)
        {
            var existingItems = await _context.MailTexts
                .Where(mailText => mailText.OfficeId == officeId)
                .Select(mailText => mailText.Item)
                .ToListAsync();

            var existingItemSet = new HashSet<string>(existingItems, StringComparer.OrdinalIgnoreCase);
            var missingItems = RequiredItems.Where(item => !existingItemSet.Contains(item)).ToList();

            if (missingItems.Count == 0)
            {
                return;
            }

            foreach (var missingItem in missingItems)
            {
                _context.MailTexts.Add(new MailText
                {
                    OfficeId = officeId,
                    Item = missingItem,
                    Subject = string.Empty,
                    BodyHtml = string.Empty,
                });
            }

            await _context.SaveChangesAsync();
        }

        private static MailTextDto MapMailText(MailText mailText)
        {
            return new MailTextDto
            {
                Id = mailText.Id,
                OfficeId = mailText.OfficeId,
                Item = mailText.Item,
                Subject = mailText.Subject,
                BodyHtml = mailText.BodyHtml,
            };
        }

        private static void ApplyMailTextChanges(MailText target, MailTextUpsertDto source)
        {
            target.Item = source.Item?.Trim() ?? string.Empty;
            target.Subject = source.Subject?.Trim() ?? string.Empty;
            target.BodyHtml = source.BodyHtml ?? string.Empty;
        }
    }
}
