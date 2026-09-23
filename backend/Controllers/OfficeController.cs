using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class OfficeController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISecretProtector _secretProtector;
    private static readonly Regex TimeOfDayPattern = new("^(?:[01]\\d|2[0-3]):[0-5]\\d$", RegexOptions.Compiled);
    private static readonly HashSet<string> AllowedLogoContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
    };
    private const long MaxLogoSizeBytes = 2 * 1024 * 1024;

    public OfficeController(ApplicationDbContext context, ICurrentUserService currentUserService, ISecretProtector secretProtector)
    {
        _context = context;
        _currentUserService = currentUserService;
        _secretProtector = secretProtector;
    }

    [HttpGet("company-info")]
    public async Task<IActionResult> GetCompanyInfo()
    {
        var office = await GetCurrentOfficeAsync();
        if (office == null)
        {
            return BadRequest(new { message = "Office not found" });
        }

        return Ok(MapOffice(office));
    }

    [HttpPut("company-info")]
    public async Task<IActionResult> UpdateCompanyInfo([FromBody] OfficeCompanyInfoUpdateDto dto)
    {
        var office = await GetCurrentOfficeAsync();
        if (office == null)
        {
            return BadRequest(new { message = "Office not found" });
        }

        office.Name = dto.Name ?? string.Empty;
        office.Street = dto.Street ?? string.Empty;
        office.ZipCode = dto.ZipCode ?? string.Empty;
        office.City = dto.City ?? string.Empty;
        office.Country = dto.Country ?? string.Empty;
        office.InvoiceFee = dto.InvoiceFee;
        office.GeneralContractText = dto.GeneralContractText ?? string.Empty;
        office.DeductibleReductionText = dto.DeductibleReductionText ?? string.Empty;
        office.DeductibleReductionCostPerDay = dto.DeductibleReductionCostPerDay;
        office.LatePaymentInterest = dto.LatePaymentInterest;
        office.Telephone = dto.Telephone ?? string.Empty;
        office.MobilePhone = dto.MobilePhone ?? string.Empty;
        office.EmergencyNumber = dto.EmergencyNumber ?? string.Empty;
        office.FaxNr = dto.FaxNr ?? string.Empty;
        office.Email = dto.Email ?? string.Empty;
        office.Web = dto.Web ?? string.Empty;
        office.OrganizationNr = dto.OrganizationNr ?? string.Empty;
        office.VatNr = dto.VatNr ?? string.Empty;
        office.Bank = dto.Bank ?? string.Empty;
        office.SwiftBic = dto.SwiftBic ?? string.Empty;
        office.BankAccountNr = dto.BankAccountNr ?? string.Empty;
        office.BgNr = dto.BgNr ?? string.Empty;
        office.PgNr = dto.PgNr ?? string.Empty;
        office.DefaultPaymentDays = dto.DefaultPaymentDays;
        office.ViewContractPricesOnPrint = dto.ViewContractPricesOnPrint;
        office.VatRegCity = dto.VatRegCity ?? string.Empty;
        office.VatRegText = dto.VatRegText ?? string.Empty;
        office.Iban = dto.Iban ?? string.Empty;
        office.CrediflowId = dto.CrediflowId ?? string.Empty;
        office.GlnNr = dto.GlnNr ?? string.Empty;

        await _context.SaveChangesAsync();

        return Ok(MapOffice(office));
    }

    [HttpPost("company-info/logo")]
    public async Task<IActionResult> UploadCompanyLogo(IFormFile? file)
    {
        var office = await GetCurrentOfficeAsync();
        if (office == null)
        {
            return BadRequest(new { message = "Office not found" });
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file was uploaded." });
        }

        if (file.Length > MaxLogoSizeBytes)
        {
            return BadRequest(new { message = "Logo file is too large. Maximum size is 2 MB." });
        }

        if (!AllowedLogoContentTypes.Contains(file.ContentType))
        {
            return BadRequest(new { message = "Unsupported file type. Allowed types: PNG, JPEG, GIF, WEBP, SVG." });
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);

        office.LogoData = memoryStream.ToArray();
        office.LogoContentType = file.ContentType;

        await _context.SaveChangesAsync();

        return Ok(MapOffice(office));
    }

    [HttpDelete("company-info/logo")]
    public async Task<IActionResult> DeleteCompanyLogo()
    {
        var office = await GetCurrentOfficeAsync();
        if (office == null)
        {
            return BadRequest(new { message = "Office not found" });
        }

        office.LogoData = null;
        office.LogoContentType = null;

        await _context.SaveChangesAsync();

        return Ok(MapOffice(office));
    }

    [HttpGet("settings/item-types")]
    public async Task<IActionResult> GetOfficeItemTypeSettings()
    {
        var office = await GetCurrentOfficeAsync();
        if (office == null)
        {
            return BadRequest(new { message = "Office not found" });
        }

        var settings = await BuildOfficeItemTypeSettingsAsync(office.Id);
        settings.DefaultBookedFromTime = office.DefaultBookedFromTime ?? string.Empty;
        settings.DefaultBookedToTime = office.DefaultBookedToTime ?? string.Empty;
        return Ok(settings);
    }

    [HttpPut("settings/item-types")]
    public async Task<IActionResult> UpdateOfficeItemTypeSettings([FromBody] OfficeItemTypeSettingsUpdateDto dto)
    {
        var office = await GetCurrentOfficeAsync();
        if (office == null)
        {
            return BadRequest(new { message = "Office not found" });
        }

        var requestedItemTypeIds = (dto.ItemTypeIds ?? [])
            .Where(itemTypeId => itemTypeId > 0)
            .Distinct()
            .ToList();

        var validItemTypeIds = await _context.ItemTypes
            .AsNoTracking()
            .Where(itemType => requestedItemTypeIds.Contains(itemType.Id))
            .Select(itemType => itemType.Id)
            .ToListAsync();

        if (validItemTypeIds.Count != requestedItemTypeIds.Count)
        {
            return BadRequest(new { message = "One or more item types are invalid." });
        }

        var normalizedDefaultBookedFromTime = NormalizeTimeOfDay(dto.DefaultBookedFromTime);
        var normalizedDefaultBookedToTime = NormalizeTimeOfDay(dto.DefaultBookedToTime);

        if (!string.IsNullOrEmpty(normalizedDefaultBookedFromTime) && !TimeOfDayPattern.IsMatch(normalizedDefaultBookedFromTime))
        {
            return BadRequest(new { message = "Default booked from time must be in format HH:mm." });
        }

        if (!string.IsNullOrEmpty(normalizedDefaultBookedToTime) && !TimeOfDayPattern.IsMatch(normalizedDefaultBookedToTime))
        {
            return BadRequest(new { message = "Default booked to time must be in format HH:mm." });
        }

        var existingLinks = await _context.OfficeItemTypes
            .Where(link => link.OfficeId == office.Id)
            .ToListAsync();

        var requestedIdSet = requestedItemTypeIds.ToHashSet();
        var existingIdSet = existingLinks.Select(link => link.ItemTypeId).ToHashSet();

        var linksToRemove = existingLinks
            .Where(link => !requestedIdSet.Contains(link.ItemTypeId))
            .ToList();

        var linksToAdd = requestedItemTypeIds
            .Where(itemTypeId => !existingIdSet.Contains(itemTypeId))
            .Select(itemTypeId => new OfficeItemType
            {
                OfficeId = office.Id,
                ItemTypeId = itemTypeId,
            })
            .ToList();

        if (linksToRemove.Count > 0)
        {
            _context.OfficeItemTypes.RemoveRange(linksToRemove);
        }

        if (linksToAdd.Count > 0)
        {
            _context.OfficeItemTypes.AddRange(linksToAdd);
        }

        var hasDefaultBookedFromTimeChanged = (office.DefaultBookedFromTime ?? string.Empty) != normalizedDefaultBookedFromTime;
        var hasDefaultBookedToTimeChanged = (office.DefaultBookedToTime ?? string.Empty) != normalizedDefaultBookedToTime;

        office.DefaultBookedFromTime = normalizedDefaultBookedFromTime;
        office.DefaultBookedToTime = normalizedDefaultBookedToTime;

        if (linksToRemove.Count > 0 || linksToAdd.Count > 0 ||
            hasDefaultBookedFromTimeChanged || hasDefaultBookedToTimeChanged)
        {
            await _context.SaveChangesAsync();
        }

        var settings = await BuildOfficeItemTypeSettingsAsync(office.Id);
        settings.DefaultBookedFromTime = office.DefaultBookedFromTime ?? string.Empty;
        settings.DefaultBookedToTime = office.DefaultBookedToTime ?? string.Empty;
        return Ok(settings);
    }

    [HttpGet("settings/tink")]
    public async Task<IActionResult> GetTinkSettings()
    {
        var office = await GetCurrentOfficeAsync();
        if (office == null)
        {
            return BadRequest(new { message = "Office not found" });
        }

        return Ok(MapTinkSettings(office));
    }

    [HttpPut("settings/tink")]
    public async Task<IActionResult> UpdateTinkSettings([FromBody] OfficeTinkSettingsUpdateDto dto)
    {
        var office = await GetCurrentOfficeAsync();
        if (office == null)
        {
            return BadRequest(new { message = "Office not found" });
        }

        office.TinkEnabled = dto.TinkEnabled;
        office.TinkClientId = dto.TinkClientId?.Trim() ?? string.Empty;
        office.TinkMarket = dto.TinkMarket?.Trim() ?? string.Empty;
        office.TinkLocale = dto.TinkLocale?.Trim() ?? string.Empty;
        office.TinkRecipientName = dto.TinkRecipientName?.Trim() ?? string.Empty;
        office.TinkRecipientAccountNumber = dto.TinkRecipientAccountNumber?.Trim() ?? string.Empty;
        office.TinkRecipientAccountType = dto.TinkRecipientAccountType?.Trim() ?? string.Empty;
        office.TinkPaymentScheme = dto.TinkPaymentScheme?.Trim() ?? string.Empty;

        // Empty secret means "keep the stored one"; the secret is never returned to the client.
        if (!string.IsNullOrWhiteSpace(dto.TinkClientSecret))
        {
            office.TinkClientSecret = _secretProtector.Protect(dto.TinkClientSecret.Trim());
        }
        else if (dto.ClearClientSecret)
        {
            office.TinkClientSecret = string.Empty;
        }

        await _context.SaveChangesAsync();

        return Ok(MapTinkSettings(office));
    }

    private static OfficeTinkSettingsDto MapTinkSettings(Office office)
    {
        return new OfficeTinkSettingsDto
        {
            TinkEnabled = office.TinkEnabled,
            TinkClientId = office.TinkClientId,
            HasClientSecret = !string.IsNullOrEmpty(office.TinkClientSecret),
            TinkMarket = office.TinkMarket,
            TinkLocale = office.TinkLocale,
            TinkRecipientName = office.TinkRecipientName,
            TinkRecipientAccountNumber = office.TinkRecipientAccountNumber,
            TinkRecipientAccountType = office.TinkRecipientAccountType,
            TinkPaymentScheme = office.TinkPaymentScheme,
        };
    }

    private static string NormalizeTimeOfDay(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();
    }
    private async Task<Office?> GetCurrentOfficeAsync()
    {
        var user = await _currentUserService.GetCurrentUserAsync(User);
        if (user?.OfficeId == null)
        {
            return null;
        }

        return await _context.Offices.FirstOrDefaultAsync(o => o.Id == user.OfficeId.Value);
    }

    private async Task<OfficeItemTypeSettingsDto> BuildOfficeItemTypeSettingsAsync(int officeId)
    {
        var selectedItemTypeIds = await _context.OfficeItemTypes
            .AsNoTracking()
            .Where(link => link.OfficeId == officeId)
            .Select(link => link.ItemTypeId)
            .ToListAsync();

        var selectedIdSet = selectedItemTypeIds.ToHashSet();

        var allItemTypes = await _context.ItemTypes
            .AsNoTracking()
            .OrderBy(itemType => itemType.Name)
            .Select(itemType => new OfficeItemTypeSettingDto
            {
                Id = itemType.Id,
                Code = itemType.Code,
                Name = itemType.Name,
                IsSelected = selectedIdSet.Contains(itemType.Id),
            })
            .ToListAsync();

        return new OfficeItemTypeSettingsDto
        {
            ItemTypes = allItemTypes,
        };
    }

    private static OfficeCompanyInfoDto MapOffice(Office office)
    {
        return new OfficeCompanyInfoDto
        {
            Id = office.Id,
            Name = office.Name,
            Street = office.Street,
            ZipCode = office.ZipCode,
            City = office.City,
            Country = office.Country,
            InvoiceFee = office.InvoiceFee,
            GeneralContractText = office.GeneralContractText,
            DeductibleReductionText = office.DeductibleReductionText,
            DeductibleReductionCostPerDay = office.DeductibleReductionCostPerDay,
            LatePaymentInterest = office.LatePaymentInterest,
            Telephone = office.Telephone,
            MobilePhone = office.MobilePhone,
            EmergencyNumber = office.EmergencyNumber,
            FaxNr = office.FaxNr,
            Email = office.Email,
            Web = office.Web,
            OrganizationNr = office.OrganizationNr,
            VatNr = office.VatNr,
            Bank = office.Bank,
            SwiftBic = office.SwiftBic,
            BankAccountNr = office.BankAccountNr,
            BgNr = office.BgNr,
            PgNr = office.PgNr,
            DefaultPaymentDays = office.DefaultPaymentDays,
            ViewContractPricesOnPrint = office.ViewContractPricesOnPrint,
            VatRegCity = office.VatRegCity,
            VatRegText = office.VatRegText,
            Iban = office.Iban,
            CrediflowId = office.CrediflowId,
            GlnNr = office.GlnNr,
            LogoDataUrl = office.LogoData is { Length: > 0 } && !string.IsNullOrEmpty(office.LogoContentType)
                ? $"data:{office.LogoContentType};base64,{Convert.ToBase64String(office.LogoData)}"
                : null,
        };
    }
}