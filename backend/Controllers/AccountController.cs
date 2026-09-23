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
public class AccountController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISystemAccountService _systemAccountService;

    public AccountController(ApplicationDbContext context, ICurrentUserService currentUserService, ISystemAccountService systemAccountService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _systemAccountService = systemAccountService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<AccountDto>>> GetAccounts([FromQuery] AccountFilter filter)
    {
        var user = await _currentUserService.GetCurrentUserAsync(User);
        if (user == null) return Unauthorized(new { message = "User not found" });
        if (user.OfficeId == null) return BadRequest(new { message = "Office not found" });

        await _systemAccountService.EnsureAccountsAsync(user.OfficeId.Value);

        var query = _context.Accounts.Where(account => account.OfficeId == user.OfficeId.Value);
        if (filter.Id.HasValue) query = query.Where(account => account.Id == filter.Id.Value);
        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var searchTerm = filter.SearchTerm.Trim().ToLower();
            query = query.Where(account =>
                (account.Name ?? string.Empty).ToLower().Contains(searchTerm) ||
                account.AccountNr.ToString()!.Contains(searchTerm));
        }

        var totalRecords = await query.CountAsync();
        var sortBy = filter.SortBy ?? new[] { "AccountNr:asc", "Name:asc", "Id:desc" };
        query = query.ApplyMultiSort(sortBy);
        var accounts = await query.AsNoTracking()
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(account => new AccountDto
            {
                Id = account.Id,
                OfficeId = account.OfficeId,
                AccountNr = account.AccountNr,
                SystemCode = account.SystemCode,
                Name = account.Name ?? string.Empty,
                IsActive = account.IsActive,
            })
            .ToListAsync();

        return Ok(new PagedResult<AccountDto>
        {
            Data = accounts,
            TotalRecords = totalRecords,
            Page = filter.Page,
            PageSize = filter.PageSize,
            TotalPages = (int)Math.Ceiling((double)totalRecords / filter.PageSize),
            HasNextPage = filter.Page * filter.PageSize < totalRecords,
            HasPreviousPage = filter.Page > 1,
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AccountDto>> GetAccount(int id)
    {
        var user = await _currentUserService.GetCurrentUserAsync(User);
        if (user == null) return Unauthorized(new { message = "User not found" });
        if (user.OfficeId == null) return BadRequest(new { message = "Office not found" });

        var account = await _context.Accounts.AsNoTracking()
            .Where(item => item.Id == id && item.OfficeId == user.OfficeId.Value)
            .Select(item => MapAccount(item))
            .FirstOrDefaultAsync();
        return account == null ? NotFound() : Ok(account);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAccount(int id)
    {
        var user = await _currentUserService.GetCurrentUserAsync(User);
        if (user == null) return Unauthorized(new { message = "User not found" });
        if (user.OfficeId == null) return BadRequest(new { message = "Office not found" });

        var account = await _context.Accounts.FirstOrDefaultAsync(item => item.Id == id && item.OfficeId == user.OfficeId.Value);
        if (account == null) return NotFound();
        if (!string.IsNullOrWhiteSpace(account.SystemCode))
        {
            return BadRequest(new { message = "Systemkonton kan inte raderas." });
        }

        _context.Accounts.Remove(account);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost]
    public async Task<ActionResult<AccountDto>> SaveAccount([FromBody] AccountUpsertDto account)
    {
        var user = await _currentUserService.GetCurrentUserAsync(User);
        if (user == null) return Unauthorized(new { message = "User not found" });
        if (user.OfficeId == null) return BadRequest(new { message = "Office not found" });

        Account? accountInDb;
        if (account.Id == 0)
        {
            accountInDb = new Account { OfficeId = user.OfficeId.Value };
            _context.Accounts.Add(accountInDb);
        }
        else
        {
            accountInDb = await _context.Accounts.FirstOrDefaultAsync(item => item.Id == account.Id && item.OfficeId == user.OfficeId.Value);
            if (accountInDb == null) return NotFound(new { message = "Account not found" });
        }

        accountInDb.AccountNr = account.AccountNr;
        accountInDb.Name = account.Name?.Trim() ?? string.Empty;
        accountInDb.IsActive = account.IsActive;
        await _context.SaveChangesAsync();
        return Ok(MapAccount(accountInDb));
    }

    private static AccountDto MapAccount(Account account) => new()
    {
        Id = account.Id,
        OfficeId = account.OfficeId,
        AccountNr = account.AccountNr,
        SystemCode = account.SystemCode,
        Name = account.Name ?? string.Empty,
        IsActive = account.IsActive,
    };
}
