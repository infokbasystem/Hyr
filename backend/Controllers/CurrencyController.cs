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
public class CurrencyController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CurrencyController(ApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<CurrencyDto>>> GetCurrencies([FromQuery] CurrencyFilter filter)
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

        var query = _context.Currencies
            .Where(currency => currency.OfficeId == user.OfficeId.Value)
            .AsQueryable();

        if (filter.Id.HasValue)
        {
            query = query.Where(currency => currency.Id == filter.Id.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var searchTerm = filter.SearchTerm.Trim().ToLower();
            query = query.Where(currency =>
                (currency.CurrencyName ?? string.Empty).ToLower().Contains(searchTerm) ||
                (currency.KeyFortnox ?? string.Empty).ToLower().Contains(searchTerm));
        }

        var totalRecords = await query.CountAsync();

        var sortBy = filter.SortBy ?? new[] { "IsDefault:desc", "CurrencyName:asc", "Id:desc" };
        query = query.ApplyMultiSort(sortBy);

        var currencies = await query
            .AsNoTracking()
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(currency => new CurrencyDto
            {
                Id = currency.Id,
                OfficeId = currency.OfficeId,
                CurrencyName = currency.CurrencyName ?? string.Empty,
                PurchaseCurrencyRate = currency.PurchaseCurrencyRate,
                SalesCurrencyRate = currency.SalesCurrencyRate,
                KeyFortnox = currency.KeyFortnox ?? string.Empty,
                IsDefault = currency.IsDefault,
            })
            .ToListAsync();

        return Ok(new PagedResult<CurrencyDto>
        {
            Data = currencies,
            TotalRecords = totalRecords,
            Page = filter.Page,
            PageSize = filter.PageSize,
            TotalPages = (int)Math.Ceiling((double)totalRecords / filter.PageSize),
            HasNextPage = filter.Page * filter.PageSize < totalRecords,
            HasPreviousPage = filter.Page > 1,
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CurrencyDto>> GetCurrency(int id)
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

        var currency = await _context.Currencies
            .AsNoTracking()
            .Where(item => item.Id == id && item.OfficeId == user.OfficeId.Value)
            .Select(item => new CurrencyDto
            {
                Id = item.Id,
                OfficeId = item.OfficeId,
                CurrencyName = item.CurrencyName ?? string.Empty,
                PurchaseCurrencyRate = item.PurchaseCurrencyRate,
                SalesCurrencyRate = item.SalesCurrencyRate,
                KeyFortnox = item.KeyFortnox ?? string.Empty,
                IsDefault = item.IsDefault,
            })
            .FirstOrDefaultAsync();

        if (currency == null)
        {
            return NotFound();
        }

        return Ok(currency);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCurrency(int id)
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

        var currency = await _context.Currencies
            .FirstOrDefaultAsync(item => item.Id == id && item.OfficeId == user.OfficeId.Value);

        if (currency == null)
        {
            return NotFound();
        }

        _context.Currencies.Remove(currency);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost]
    public async Task<ActionResult<CurrencyDto>> PostCurrency([FromBody] CurrencyUpsertDto currency)
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

            Currency? currencyInDb;

            if (currency.Id == 0)
            {
                currencyInDb = new Currency
                {
                    OfficeId = user.OfficeId.Value,
                };
                _context.Currencies.Add(currencyInDb);
            }
            else
            {
                currencyInDb = await _context.Currencies
                    .FirstOrDefaultAsync(item => item.Id == currency.Id && item.OfficeId == user.OfficeId.Value);

                if (currencyInDb == null)
                {
                    return NotFound(new { message = "Currency not found" });
                }
            }

            ApplyCurrencyChanges(currencyInDb, currency);

            if (currencyInDb.IsDefault)
            {
                var otherDefaultCurrencies = await _context.Currencies
                    .Where(item => item.OfficeId == user.OfficeId.Value && item.Id != currencyInDb.Id && item.IsDefault)
                    .ToListAsync();

                foreach (var otherCurrency in otherDefaultCurrencies)
                {
                    otherCurrency.IsDefault = false;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(MapCurrency(currencyInDb));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred", error = ex.Message });
        }
    }

    private static CurrencyDto MapCurrency(Currency currency)
    {
        return new CurrencyDto
        {
            Id = currency.Id,
            OfficeId = currency.OfficeId,
            CurrencyName = currency.CurrencyName ?? string.Empty,
            PurchaseCurrencyRate = currency.PurchaseCurrencyRate,
            SalesCurrencyRate = currency.SalesCurrencyRate,
            KeyFortnox = currency.KeyFortnox ?? string.Empty,
            IsDefault = currency.IsDefault,
        };
    }

    private static void ApplyCurrencyChanges(Currency target, CurrencyUpsertDto source)
    {
        target.CurrencyName = source.CurrencyName?.Trim() ?? string.Empty;
        target.PurchaseCurrencyRate = source.PurchaseCurrencyRate;
        target.SalesCurrencyRate = source.SalesCurrencyRate;
        target.KeyFortnox = source.KeyFortnox?.Trim() ?? string.Empty;
        target.IsDefault = source.IsDefault;
    }
}