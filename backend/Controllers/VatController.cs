using Backend.Data;
using Backend.Dtos;
using Backend.Filters;
using Backend.Models;
using Backend.Services;
using Backend.Utils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class VatController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public VatController(ApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<VatDto>>> GetVatRates([FromQuery] VatFilter filter)
    {
        var user = await _currentUserService.GetCurrentUserAsync(User);
        if (user == null)
        {
            return Unauthorized(new { message = "User not found" });
        }

        if (user.OfficeId == null)
        {
            return BadRequest(new { message = "Office not found" });
        }

        var query = _context.VatRates
            .Where(vat => vat.OfficeId == user.OfficeId.Value)
            .AsQueryable();

        if (filter.Id.HasValue)
        {
            query = query.Where(vat => vat.Id == filter.Id.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var searchTerm = filter.SearchTerm.Trim().ToLower();
            query = query.Where(vat =>
                (vat.Name ?? string.Empty).ToLower().Contains(searchTerm) ||
                (vat.ExternalCode ?? string.Empty).ToLower().Contains(searchTerm));
        }

        var totalRecords = await query.CountAsync();

        var sortBy = filter.SortBy ?? new[] { "IsDefault:desc", "Name:asc", "Id:desc" };
        query = query.ApplyMultiSort(sortBy);

        var vatRates = await query
            .AsNoTracking()
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(vat => new VatDto
            {
                Id = vat.Id,
                OfficeId = vat.OfficeId,
                Name = vat.Name ?? string.Empty,
                Rate = vat.Rate,
                ExternalCode = vat.ExternalCode ?? string.Empty,
                IsActive = vat.IsActive,
                IsDefault = vat.IsDefault,
            })
            .ToListAsync();

        return Ok(new PagedResult<VatDto>
        {
            Data = vatRates,
            TotalRecords = totalRecords,
            Page = filter.Page,
            PageSize = filter.PageSize,
            TotalPages = (int)Math.Ceiling((double)totalRecords / filter.PageSize),
            HasNextPage = filter.Page * filter.PageSize < totalRecords,
            HasPreviousPage = filter.Page > 1,
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<VatDto>> GetVatRate(int id)
    {
        var user = await _currentUserService.GetCurrentUserAsync(User);
        if (user == null)
        {
            return Unauthorized(new { message = "User not found" });
        }

        if (user.OfficeId == null)
        {
            return BadRequest(new { message = "Office not found" });
        }

        var vatRate = await _context.VatRates
            .AsNoTracking()
            .Where(item => item.Id == id && item.OfficeId == user.OfficeId.Value)
            .Select(item => new VatDto
            {
                Id = item.Id,
                OfficeId = item.OfficeId,
                Name = item.Name ?? string.Empty,
                Rate = item.Rate,
                ExternalCode = item.ExternalCode ?? string.Empty,
                IsActive = item.IsActive,
                IsDefault = item.IsDefault,
            })
            .FirstOrDefaultAsync();

        if (vatRate == null)
        {
            return NotFound();
        }

        return Ok(vatRate);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteVatRate(int id)
    {
        var user = await _currentUserService.GetCurrentUserAsync(User);
        if (user == null)
        {
            return Unauthorized(new { message = "User not found" });
        }

        if (user.OfficeId == null)
        {
            return BadRequest(new { message = "Office not found" });
        }

        var vatRate = await _context.VatRates
            .FirstOrDefaultAsync(item => item.Id == id && item.OfficeId == user.OfficeId.Value);

        if (vatRate == null)
        {
            return NotFound();
        }

        _context.VatRates.Remove(vatRate);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost]
    public async Task<ActionResult<VatDto>> PostVatRate([FromBody] VatUpsertDto vatRate)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (user.OfficeId == null)
            {
                return BadRequest(new { message = "Office not found" });
            }

            VatRate? vatRateInDb;

            if (vatRate.Id == 0)
            {
                vatRateInDb = new VatRate
                {
                    OfficeId = user.OfficeId.Value,
                };
                _context.VatRates.Add(vatRateInDb);
            }
            else
            {
                vatRateInDb = await _context.VatRates
                    .FirstOrDefaultAsync(item => item.Id == vatRate.Id && item.OfficeId == user.OfficeId.Value);

                if (vatRateInDb == null)
                {
                    return NotFound(new { message = "VAT not found" });
                }
            }

            ApplyVatRateChanges(vatRateInDb, vatRate);

            if (vatRateInDb.IsDefault)
            {
                var otherDefaultVatRates = await _context.VatRates
                    .Where(item => item.OfficeId == user.OfficeId.Value && item.Id != vatRateInDb.Id && item.IsDefault)
                    .ToListAsync();

                foreach (var otherVatRate in otherDefaultVatRates)
                {
                    otherVatRate.IsDefault = false;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(MapVatRate(vatRateInDb));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred", error = ex.Message });
        }
    }

    private static VatDto MapVatRate(VatRate vatRate)
    {
        return new VatDto
        {
            Id = vatRate.Id,
            OfficeId = vatRate.OfficeId,
            Name = vatRate.Name ?? string.Empty,
            Rate = vatRate.Rate,
            ExternalCode = vatRate.ExternalCode ?? string.Empty,
            IsActive = vatRate.IsActive,
            IsDefault = vatRate.IsDefault,
        };
    }

    private static void ApplyVatRateChanges(VatRate target, VatUpsertDto source)
    {
        target.Name = source.Name?.Trim() ?? string.Empty;
        target.Rate = source.Rate;
        target.ExternalCode = source.ExternalCode?.Trim() ?? string.Empty;
        target.IsActive = source.IsActive;
        target.IsDefault = source.IsDefault;
    }
}