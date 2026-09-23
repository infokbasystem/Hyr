using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public sealed class SystemAccountService : ISystemAccountService
{
    public const string ReceivableCash = "RECEIVABLE_CASH";
    public const string ReceivableInvoice = "RECEIVABLE_INVOICE";
    public const string VatDomestic = "VAT_DOMESTIC";
    public const string VatEu = "VAT_EU";
    public const string VatExport = "VAT_EXPORT";

    private static readonly (string Code, int AccountNr, string Name)[] Defaults =
    [
        (ReceivableCash, 1910, "Kassa"),
        (ReceivableInvoice, 1510, "Kundfordringar"),
        (VatDomestic, 2611, "Utgående moms på försäljning inom Sverige, 25 %"),
        (VatEu, 2614, "Utgående moms, omvänd skattskyldighet, 25 %"),
        (VatExport, 2615, "Utgående moms export, 25 %"),
    ];

    private readonly ApplicationDbContext _context;

    public SystemAccountService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyDictionary<string, Account>> EnsureAccountsAsync(int officeId)
    {
        var accountsByCode = await _context.Accounts
            .Where(account => account.OfficeId == officeId && account.SystemCode != null)
            .ToDictionaryAsync(account => account.SystemCode!, StringComparer.OrdinalIgnoreCase);

        var missingDefaults = Defaults
            .Where(entry => !accountsByCode.ContainsKey(entry.Code))
            .ToList();

        foreach (var entry in missingDefaults)
        {
            var account = new Account
            {
                OfficeId = officeId,
                AccountNr = entry.AccountNr,
                SystemCode = entry.Code,
                Name = entry.Name,
                IsActive = true,
            };

            _context.Accounts.Add(account);
            accountsByCode[entry.Code] = account;
        }

        if (missingDefaults.Count > 0)
        {
            await _context.SaveChangesAsync();
        }

        return accountsByCode;
    }
}
