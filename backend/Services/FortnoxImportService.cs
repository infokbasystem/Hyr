using System.Globalization;
using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Utils.Fortnox;
using Fortnox.SDK;
using Fortnox.SDK.Authorization;
using Fortnox.SDK.Exceptions;
using Fortnox.SDK.Extensions;
using Fortnox.SDK.Search;
using Microsoft.EntityFrameworkCore;
using FortnoxCustomerType = Fortnox.SDK.Entities.CustomerType;

namespace Backend.Services
{
    public static class FortnoxImportEntity
    {
        public const string Accounts = "accounts";
        public const string Articles = "articles";
        public const string Customers = "customers";

        public static bool IsValid(string? entity) =>
            entity is Accounts or Articles or Customers;
    }

    public sealed class FortnoxImportException(string message) : Exception(message);

    public sealed class FortnoxImportService(
        ApplicationDbContext context,
        ILogger<FortnoxImportService> logger) : IFortnoxImportService
    {
        private const string ImportSource = "Fortnox";
        private const int MaxErrorsPerPage = 10;

        public async Task<OfficeFortnoxImportResultDto> ImportPageAsync(
            Office office,
            int userId,
            string entity,
            OfficeFortnoxImportRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (!office.UseFortnox)
            {
                throw new FortnoxImportException("Fortnox är inte aktiverat.");
            }

            var accessToken = await EnsureAccessTokenAsync(office, cancellationToken);
            var client = new FortnoxClient(new StandardAuth(accessToken));
            var page = Math.Max(1, request.Page);

            try
            {
                return entity switch
                {
                    FortnoxImportEntity.Accounts => await ImportAccountsAsync(
                        client, office.Id, page, ResolvePageSize(request.PageSize, 500), request.UpdateExisting, cancellationToken),
                    FortnoxImportEntity.Articles => await ImportArticlesAsync(
                        client, office.Id, page, ResolvePageSize(request.PageSize, 25), request.UpdateExisting, cancellationToken),
                    FortnoxImportEntity.Customers => await ImportCustomersAsync(
                        client, office.Id, userId, page, ResolvePageSize(request.PageSize, 25), request.UpdateExisting, cancellationToken),
                    _ => throw new FortnoxImportException($"Okänd importtyp: {entity}"),
                };
            }
            catch (FortnoxApiException ex)
            {
                logger.LogWarning(ex, "Fortnox import of {Entity} page {Page} failed.", entity, page);
                throw new FortnoxImportException($"Fortnox svarade med fel: {ex.ErrorInfo?.Message ?? ex.Message}");
            }
        }

        private static int ResolvePageSize(int? requested, int fallback) =>
            Math.Clamp(requested ?? fallback, 1, ApiConstants.MaxLimit);

        private async Task<string> EnsureAccessTokenAsync(Office office, CancellationToken cancellationToken)
        {
            if (!string.IsNullOrWhiteSpace(office.FortnoxAccessToken)
                && !new StandardAuth(office.FortnoxAccessToken).IsExpired(TimeSpan.FromMinutes(1)))
            {
                return office.FortnoxAccessToken;
            }

            if (string.IsNullOrWhiteSpace(office.FortnoxRefreshToken))
            {
                throw new FortnoxImportException("Fortnox är inte parkopplat. Starta parkoppling först.");
            }

            try
            {
                var authWorkflow = new FortnoxAuthClient().StandardAuthWorkflow;
                var tokenInfo = await authWorkflow.RefreshTokenAsync(
                    office.FortnoxRefreshToken,
                    FortnoxAppCredentials.ClientId,
                    FortnoxAppCredentials.ClientSecret);

                office.FortnoxAccessToken = tokenInfo.AccessToken;
                office.FortnoxRefreshToken = tokenInfo.RefreshToken;
                office.FortnoxTokenCreated = DateTime.Now;
                office.FortnoxTokenExpiresInSeconds = tokenInfo.ExpiresIn;
                await context.SaveChangesAsync(cancellationToken);
                return office.FortnoxAccessToken;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Could not refresh Fortnox token for office {OfficeId}.", office.Id);
                throw new FortnoxImportException("Kunde inte förnya Fortnox-token. Gör om parkopplingen.");
            }
        }

        private async Task<OfficeFortnoxImportResultDto> ImportAccountsAsync(
            FortnoxClient client,
            int officeId,
            int page,
            int pageSize,
            bool updateExisting,
            CancellationToken cancellationToken)
        {
            var response = await client.AccountConnector.FindAsync(new AccountSearch
            {
                Page = page,
                Limit = pageSize,
                SortBy = Sort.By.Account.Number,
            });
            cancellationToken.ThrowIfCancellationRequested();

            var result = CreateResult(FortnoxImportEntity.Accounts, page, response.TotalPages, response.TotalResources);

            var numbers = response.Entities
                .Where(a => a.Number is > 0 and <= int.MaxValue)
                .Select(a => (int)a.Number!.Value)
                .ToList();
            var existingByNr = (await context.Accounts
                    .Where(a => a.OfficeId == officeId && a.AccountNr.HasValue && numbers.Contains(a.AccountNr.Value))
                    .ToListAsync(cancellationToken))
                .GroupBy(a => a.AccountNr!.Value)
                .ToDictionary(g => g.Key, g => g.First());

            foreach (var remote in response.Entities)
            {
                result.Processed++;
                if (remote.Number is not (> 0 and <= int.MaxValue))
                {
                    AddError(result, $"Konto saknar giltigt nummer ({remote.Description}).");
                    continue;
                }

                var accountNr = (int)remote.Number.Value;
                if (existingByNr.TryGetValue(accountNr, out var existing))
                {
                    if (!updateExisting)
                    {
                        result.Skipped++;
                        continue;
                    }

                    existing.Name = Truncate(remote.Description, 500);
                    existing.IsActive = remote.Active ?? true;
                    result.Updated++;
                    continue;
                }

                var account = new Account
                {
                    OfficeId = officeId,
                    AccountNr = accountNr,
                    Name = Truncate(remote.Description, 500),
                    IsActive = remote.Active ?? true,
                };
                context.Accounts.Add(account);
                existingByNr[accountNr] = account;
                result.Inserted++;
            }

            await context.SaveChangesAsync(cancellationToken);
            return result;
        }

        private async Task<OfficeFortnoxImportResultDto> ImportArticlesAsync(
            FortnoxClient client,
            int officeId,
            int page,
            int pageSize,
            bool updateExisting,
            CancellationToken cancellationToken)
        {
            var response = await client.ArticleConnector.FindAsync(new ArticleSearch
            {
                Page = page,
                Limit = pageSize,
                SortBy = Sort.By.Article.ArticleNumber,
            });
            cancellationToken.ThrowIfCancellationRequested();

            var result = CreateResult(FortnoxImportEntity.Articles, page, response.TotalPages, response.TotalResources);

            var keys = response.Entities
                .Select(a => a.ArticleNumber)
                .Where(k => !string.IsNullOrWhiteSpace(k))
                .ToList();
            var existingByKey = (await context.Articles
                    .Where(a => a.OfficeId == officeId && keys.Contains(a.KeyFortnox))
                    .ToListAsync(cancellationToken))
                .GroupBy(a => a.KeyFortnox)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

            var accountIdsByNr = (await context.Accounts
                    .Where(a => a.OfficeId == officeId && a.AccountNr.HasValue)
                    .Select(a => new { a.Id, AccountNr = a.AccountNr!.Value })
                    .ToListAsync(cancellationToken))
                .GroupBy(a => a.AccountNr)
                .ToDictionary(g => g.Key, g => g.First().Id);

            var vatRates = await context.VatRates
                .Where(v => v.OfficeId == officeId && v.Rate.HasValue)
                .OrderByDescending(v => v.IsActive)
                .ThenByDescending(v => v.IsDefault)
                .Select(v => new { v.Id, Rate = v.Rate!.Value })
                .ToListAsync(cancellationToken);

            foreach (var subset in response.Entities)
            {
                result.Processed++;
                var key = subset.ArticleNumber?.Trim();
                if (string.IsNullOrWhiteSpace(key))
                {
                    AddError(result, $"Artikel saknar artikelnummer ({subset.Description}).");
                    continue;
                }

                existingByKey.TryGetValue(key, out var existing);
                if (existing != null && !updateExisting)
                {
                    result.Skipped++;
                    continue;
                }

                Fortnox.SDK.Entities.Article remote;
                try
                {
                    remote = await client.ArticleConnector.GetAsync(key);
                }
                catch (FortnoxApiException ex)
                {
                    AddError(result, $"Artikel {key}: {ex.ErrorInfo?.Message ?? ex.Message}");
                    continue;
                }
                cancellationToken.ThrowIfCancellationRequested();

                var article = existing ?? new Article { OfficeId = officeId, KeyFortnox = key };
                article.ArticleNr = Truncate(remote.ArticleNumber ?? key, 100);
                article.Name = Truncate(remote.Description, 500);
                article.Price = remote.SalesPrice;
                article.IsActive = remote.Active ?? true;

                if (remote.SalesAccount is > 0 and <= int.MaxValue
                    && accountIdsByNr.TryGetValue((int)remote.SalesAccount.Value, out var accountId))
                {
                    article.AccountId = accountId;
                }

                if (remote.VAT.HasValue)
                {
                    var vat = remote.VAT.Value;
                    var vatRate = vatRates.FirstOrDefault(v => v.Rate == vat || v.Rate * 100 == vat);
                    if (vatRate != null)
                    {
                        article.VatRateId = vatRate.Id;
                    }
                }

                if (existing == null)
                {
                    context.Articles.Add(article);
                    existingByKey[key] = article;
                    result.Inserted++;
                }
                else
                {
                    result.Updated++;
                }
            }

            await context.SaveChangesAsync(cancellationToken);
            return result;
        }

        private async Task<OfficeFortnoxImportResultDto> ImportCustomersAsync(
            FortnoxClient client,
            int officeId,
            int userId,
            int page,
            int pageSize,
            bool updateExisting,
            CancellationToken cancellationToken)
        {
            var response = await client.CustomerConnector.FindAsync(new CustomerSearch
            {
                Page = page,
                Limit = pageSize,
                SortBy = Sort.By.Customer.CustomerNumber,
            });
            cancellationToken.ThrowIfCancellationRequested();

            var result = CreateResult(FortnoxImportEntity.Customers, page, response.TotalPages, response.TotalResources);

            var keys = response.Entities
                .Select(c => c.CustomerNumber)
                .Where(k => !string.IsNullOrWhiteSpace(k))
                .ToList();
            var existingByKey = (await context.Customers
                    .Where(c => c.OfficeId == officeId && keys.Contains(c.KeyFortnox))
                    .ToListAsync(cancellationToken))
                .GroupBy(c => c.KeyFortnox)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

            var usedCustomerNrs = (await context.Customers
                    .Where(c => c.OfficeId == officeId && c.CustomerNr.HasValue)
                    .Select(c => c.CustomerNr!.Value)
                    .ToListAsync(cancellationToken))
                .ToHashSet();
            var nextCustomerNr = (usedCustomerNrs.Count == 0 ? 0 : usedCustomerNrs.Max()) + 1;
            var now = DateTime.UtcNow;

            foreach (var subset in response.Entities)
            {
                result.Processed++;
                var key = subset.CustomerNumber?.Trim();
                if (string.IsNullOrWhiteSpace(key))
                {
                    AddError(result, $"Kund saknar kundnummer ({subset.Name}).");
                    continue;
                }

                existingByKey.TryGetValue(key, out var existing);
                if (existing != null && !updateExisting)
                {
                    result.Skipped++;
                    continue;
                }

                Fortnox.SDK.Entities.Customer remote;
                try
                {
                    remote = await client.CustomerConnector.GetAsync(key);
                }
                catch (FortnoxApiException ex)
                {
                    AddError(result, $"Kund {key}: {ex.ErrorInfo?.Message ?? ex.Message}");
                    continue;
                }
                cancellationToken.ThrowIfCancellationRequested();

                var customer = existing;
                if (customer == null)
                {
                    // Keep the Fortnox customer number when it is free locally, otherwise allocate the next one.
                    int customerNr;
                    if (int.TryParse(key, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedNr)
                        && parsedNr > 0
                        && !usedCustomerNrs.Contains(parsedNr))
                    {
                        customerNr = parsedNr;
                    }
                    else
                    {
                        while (usedCustomerNrs.Contains(nextCustomerNr)) nextCustomerNr++;
                        customerNr = nextCustomerNr;
                    }
                    usedCustomerNrs.Add(customerNr);
                    if (customerNr >= nextCustomerNr) nextCustomerNr = customerNr + 1;

                    customer = new Customer
                    {
                        OfficeId = officeId,
                        CustomerNr = customerNr,
                        KeyFortnox = key,
                        ImportSource = ImportSource,
                        CreatedAt = now,
                        CreatedBy = userId,
                    };
                }

                ApplyRemoteCustomer(customer, remote);
                customer.UpdatedAt = now;
                customer.UpdatedBy = userId;

                if (existing == null)
                {
                    context.Customers.Add(customer);
                    existingByKey[key] = customer;
                    result.Inserted++;
                }
                else
                {
                    result.Updated++;
                }
            }

            await context.SaveChangesAsync(cancellationToken);
            return result;
        }

        private static void ApplyRemoteCustomer(Customer target, Fortnox.SDK.Entities.Customer remote)
        {
            target.CustomerName = Truncate(remote.Name, 200);
            target.OrgNr = Truncate(remote.OrganisationNumber, 200);
            target.VatNr = Truncate(remote.VATNumber, 200);
            target.Street1 = Truncate(remote.Address1, 200);
            target.Street2 = Truncate(remote.Address2, 200);
            target.ZipCode = Truncate(remote.ZipCode, 200);
            target.City = Truncate(remote.City, 200);
            target.Telephone = Truncate(remote.Phone1, 200);
            target.MobilePhone = Truncate(remote.Phone2, 200);
            target.Email = Truncate(remote.Email, 200);
            target.IsActive = remote.Active ?? true;
            target.IsCompany = remote.Type == FortnoxCustomerType.Company;

            if (int.TryParse(remote.TermsOfPayment, NumberStyles.Integer, CultureInfo.InvariantCulture, out var invoiceDays))
            {
                target.NrOfInvoiceDays = invoiceDays;
            }
        }

        private static OfficeFortnoxImportResultDto CreateResult(string entity, int page, int totalPages, int totalResources) =>
            new()
            {
                Entity = entity,
                Page = page,
                TotalPages = totalPages,
                TotalResources = totalResources,
            };

        private static void AddError(OfficeFortnoxImportResultDto result, string message)
        {
            result.Failed++;
            if (result.Errors.Count < MaxErrorsPerPage)
            {
                result.Errors.Add(message);
            }
        }

        private static string Truncate(string? value, int maxLength)
        {
            var trimmed = value?.Trim() ?? string.Empty;
            return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
        }
    }
}
