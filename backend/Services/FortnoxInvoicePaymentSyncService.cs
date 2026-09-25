using System.Data;
using System.Globalization;
using Backend.Data;
using Backend.Models;
using Fortnox.SDK;
using Fortnox.SDK.Authorization;
using Fortnox.SDK.Search;
using Fortnox.SDK.Utility;
using Microsoft.EntityFrameworkCore;
using FortnoxInvoicePayment = Fortnox.SDK.Entities.InvoicePaymentSubset;

namespace Backend.Services
{
    public sealed class FortnoxInvoicePaymentSyncService(
        ApplicationDbContext context,
        ILogger<FortnoxInvoicePaymentSyncService> logger) : IFortnoxInvoicePaymentSyncService
    {
        private const string IntegrationName = "Fortnox";
        private const string LastRunAtVariable = "InvoicePaymentsLastRunAt";
        private const decimal SettlementTolerance = 0.01m;
        private static readonly TimeSpan MinimumSyncInterval = TimeSpan.FromHours(1);

        public async Task<FortnoxInvoicePaymentSyncResult> SyncAsync(
            int officeId,
            string accessToken,
            CancellationToken cancellationToken = default)
        {
            var scheduleClaim = await TryBeginSyncAsync(officeId, cancellationToken);
            if (!scheduleClaim.ShouldRun)
            {
                return new FortnoxInvoicePaymentSyncResult(
                    Skipped: true,
                    InsertedPayments: 0,
                    UpdatedPayments: 0,
                    DeletedPayments: 0,
                    UpdatedInvoices: 0,
                    Warnings:
                    [
                        "Fortnox-betalningar synkroniserades inte eftersom den senaste synkroniseringen gjordes för mindre än en timme sedan.",
                    ]);
            }

            try
            {
                return await SyncPaymentsAsync(
                    officeId,
                    accessToken,
                    scheduleClaim.LastRunAtUtc,
                    cancellationToken);
            }
            catch
            {
                context.ChangeTracker.Clear();
                try
                {
                    await ReleaseSyncClaimAsync(officeId, scheduleClaim, CancellationToken.None);
                }
                catch (Exception releaseException)
                {
                    logger.LogWarning(
                        releaseException,
                        "Could not restore the Fortnox payment integration schedule after a failed sync.");
                }

                throw;
            }
        }

        private async Task<FortnoxInvoicePaymentSyncResult> SyncPaymentsAsync(
            int officeId,
            string accessToken,
            DateTimeOffset? lastRunAtUtc,
            CancellationToken cancellationToken)
        {
            var remotePayments = await FetchPaymentsAsync(accessToken, lastRunAtUtc, cancellationToken);
            var invoiceNumbers = remotePayments
                .Where(payment => payment.Payment.InvoiceNumber is > 0 and <= int.MaxValue)
                .Select(payment => (int)payment.Payment.InvoiceNumber!.Value)
                .Distinct()
                .ToList();

            var invoices = await context.Invoices
                .Include(invoice => invoice.InvoiceRows)
                .Where(invoice => invoice.OfficeId == officeId
                    && invoice.InvoiceNr.HasValue
                    && invoiceNumbers.Contains(invoice.InvoiceNr.Value))
                .ToListAsync(cancellationToken);

            var invoicesByNumber = invoices
                .GroupBy(invoice => invoice.InvoiceNr!.Value)
                .ToDictionary(group => group.Key, group => group.ToList());

            var existingPayments = await context.Payments
                .Where(payment => payment.OfficeId == officeId
                    && payment.FortnoxPaymentNumber != null)
                .ToListAsync(cancellationToken);
            var existingByKey = existingPayments.ToDictionary(PaymentKey.FromEntity);
            var affectedInvoiceIds = new HashSet<int>();
            var warnings = new List<string>();
            var unmatchedPayments = 0;
            var ambiguousPayments = 0;
            var insertedPayments = 0;
            var updatedPayments = 0;
            var deletedPayments = 0;
            var syncedAtUtc = DateTime.UtcNow;

            await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

            foreach (var remotePayment in remotePayments)
            {
                var matchedInvoice = ResolveInvoice(
                    remotePayment.Payment.InvoiceNumber!.Value,
                    invoicesByNumber,
                    ref unmatchedPayments,
                    ref ambiguousPayments);

                if (existingByKey.TryGetValue(remotePayment.Key, out var existingPayment))
                {
                    affectedInvoiceIds.Add(existingPayment.InvoiceId);
                    var invoiceChanged = matchedInvoice is not null && existingPayment.InvoiceId != matchedInvoice.Id;
                    if (matchedInvoice is not null)
                    {
                        existingPayment.InvoiceId = matchedInvoice.Id;
                        affectedInvoiceIds.Add(matchedInvoice.Id);
                    }

                    var paymentChanged = ApplyRemotePayment(existingPayment, remotePayment, syncedAtUtc);
                    if (invoiceChanged || paymentChanged)
                    {
                        updatedPayments++;
                    }

                    continue;
                }

                if (matchedInvoice is null)
                {
                    continue;
                }

                var payment = CreatePayment(officeId, matchedInvoice.Id, remotePayment, syncedAtUtc);
                context.Payments.Add(payment);
                existingByKey.Add(remotePayment.Key, payment);
                affectedInvoiceIds.Add(matchedInvoice.Id);
                insertedPayments++;
            }

            await context.SaveChangesAsync(cancellationToken);

            var updatedInvoices = await RecalculateInvoicesAsync(
                officeId,
                affectedInvoiceIds,
                cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            if (unmatchedPayments > 0)
            {
                warnings.Add($"{unmatchedPayments} Fortnox-betalningar kunde inte matchas mot en lokal faktura.");
            }

            if (ambiguousPayments > 0)
            {
                warnings.Add($"{ambiguousPayments} Fortnox-betalningar hade flera lokala fakturor med samma fakturanummer.");
            }

            return new FortnoxInvoicePaymentSyncResult(
                Skipped: false,
                insertedPayments,
                updatedPayments,
                deletedPayments,
                updatedInvoices,
                warnings);
        }

        private static async Task<IReadOnlyList<RemotePayment>> FetchPaymentsAsync(
            string accessToken,
            DateTimeOffset? lastModifiedUtc,
            CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var effectiveLastModifiedUtc = lastModifiedUtc ?? DateTimeOffset.UtcNow.AddMonths(-3);
            var client = new FortnoxClient(new StandardAuth(accessToken));
            var response = await client.InvoicePaymentConnector.FindAsync(
                new InvoicePaymentSearch
                {
                    LastModified = effectiveLastModifiedUtc.UtcDateTime,
                    Limit = ApiConstants.Unlimited,
                });

            cancellationToken.ThrowIfCancellationRequested();

            var payments = new List<RemotePayment>();
            var keys = new HashSet<PaymentKey>();
            foreach (var payment in response.Entities)
            {
                if (payment.Number is null or <= 0 || payment.InvoiceNumber is null or <= 0)
                {
                    throw new InvalidOperationException(
                        "Fortnox returnerade en betalning utan giltigt betalnings- eller fakturanummer.");
                }

                if (!payment.PaymentDate.HasValue)
                {
                    throw new InvalidOperationException(
                        $"Fortnox returnerade ett ogiltigt betalningsdatum för betalning {payment.Number}.");
                }

                var remotePayment = new RemotePayment(payment, payment.PaymentDate.Value.Date);
                if (!keys.Add(remotePayment.Key))
                {
                    throw new InvalidOperationException(
                        $"Fortnox returnerade betalning {payment.Number} flera gånger.");
                }

                payments.Add(remotePayment);
            }

            return payments;
        }

        private async Task<ScheduleClaim> TryBeginSyncAsync(
            int officeId,
            CancellationToken cancellationToken)
        {
            var startedAtUtc = DateTimeOffset.UtcNow;
            await using var transaction = await context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);
            var schedule = await context.IntegrationSchedules.SingleOrDefaultAsync(
                item => item.OfficeId == officeId
                    && item.Integration == IntegrationName
                    && item.Variable == LastRunAtVariable,
                cancellationToken);
            var previousValue = schedule?.Value;
            var lastRunAtUtc = ParseScheduleTimestamp(previousValue);

            if (lastRunAtUtc.HasValue && startedAtUtc - lastRunAtUtc.Value < MinimumSyncInterval)
            {
                await transaction.CommitAsync(cancellationToken);
                return new ScheduleClaim(false, string.Empty, lastRunAtUtc);
            }

            var claimValue = startedAtUtc.ToString("O", CultureInfo.InvariantCulture);
            if (schedule is null)
            {
                schedule = new IntegrationSchedule
                {
                    OfficeId = officeId,
                    Integration = IntegrationName,
                    Variable = LastRunAtVariable,
                };
                context.IntegrationSchedules.Add(schedule);
            }

            schedule.Value = claimValue;
            await context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new ScheduleClaim(true, claimValue, lastRunAtUtc);
        }

        private async Task ReleaseSyncClaimAsync(
            int officeId,
            ScheduleClaim claim,
            CancellationToken cancellationToken)
        {
            await using var transaction = await context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);
            var schedule = await context.IntegrationSchedules.SingleOrDefaultAsync(
                item => item.OfficeId == officeId
                    && item.Integration == IntegrationName
                    && item.Variable == LastRunAtVariable,
                cancellationToken);
            if (schedule is null || schedule.Value != claim.ClaimValue)
            {
                await transaction.CommitAsync(cancellationToken);
                return;
            }

            var lastRunAtUtc = claim.LastRunAtUtc ?? DateTimeOffset.UtcNow.AddMonths(-3);
            schedule.Value = lastRunAtUtc.ToString("O", CultureInfo.InvariantCulture);

            await context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        private static DateTimeOffset? ParseScheduleTimestamp(string? value)
        {
            return DateTimeOffset.TryParseExact(
                value,
                "O",
                CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind,
                out var timestamp)
                ? timestamp.ToUniversalTime()
                : null;
        }

        private async Task<int> RecalculateInvoicesAsync(
            int officeId,
            IReadOnlySet<int> affectedInvoiceIds,
            CancellationToken cancellationToken)
        {
            if (affectedInvoiceIds.Count == 0)
            {
                return 0;
            }

            var invoices = await context.Invoices
                .Include(invoice => invoice.InvoiceRows)
                .Where(invoice => invoice.OfficeId == officeId
                    && affectedInvoiceIds.Contains(invoice.Id))
                .ToListAsync(cancellationToken);
            var paymentTotals = await context.Payments
                .Where(payment => payment.OfficeId == officeId
                    && affectedInvoiceIds.Contains(payment.InvoiceId))
                .GroupBy(payment => payment.InvoiceId)
                .Select(group => new
                {
                    InvoiceId = group.Key,
                    Total = group.Sum(payment => payment.AmountCurrency ?? payment.Amount),
                })
                .ToDictionaryAsync(item => item.InvoiceId, item => item.Total, cancellationToken);

            var updatedInvoices = 0;
            foreach (var invoice in invoices)
            {
                var paidTotal = Math.Round(
                    paymentTotals.GetValueOrDefault(invoice.Id),
                    2,
                    MidpointRounding.AwayFromZero);
                var invoiceTotal = Math.Round(
                    invoice.TotSum ?? invoice.InvoiceRows.Sum(row => row.Sum ?? 0m),
                    2,
                    MidpointRounding.AwayFromZero);
                var isSettled = invoiceTotal >= 0m
                    ? paidTotal + SettlementTolerance >= invoiceTotal
                    : paidTotal - SettlementTolerance <= invoiceTotal;

                if (invoice.IsSettled == isSettled)
                {
                    continue;
                }

                invoice.IsSettled = isSettled;
                invoice.ModifiedDate = DateTime.UtcNow;
                updatedInvoices++;
            }

            return updatedInvoices;
        }

        private static Invoice? ResolveInvoice(
            long invoiceNumber,
            IReadOnlyDictionary<int, List<Invoice>> invoicesByNumber,
            ref int unmatchedPayments,
            ref int ambiguousPayments)
        {
            if (invoiceNumber is <= 0 or > int.MaxValue
                || !invoicesByNumber.TryGetValue((int)invoiceNumber, out var matches))
            {
                unmatchedPayments++;
                return null;
            }

            if (matches.Count != 1)
            {
                ambiguousPayments++;
                return null;
            }

            return matches[0];
        }

        private static Payment CreatePayment(
            int officeId,
            int invoiceId,
            RemotePayment remotePayment,
            DateTime syncedAtUtc)
        {
            var paymentNumber = remotePayment.Payment.Number!.Value.ToString(CultureInfo.InvariantCulture);
            var payment = new Payment
            {
                OfficeId = officeId,
                InvoiceId = invoiceId,
                FortnoxPaymentNumber = paymentNumber,
                Reference = paymentNumber,
                Note = "Fortnox",
                CreatedDate = syncedAtUtc,
            };
            ApplyRemotePayment(payment, remotePayment, syncedAtUtc);
            return payment;
        }

        private static bool ApplyRemotePayment(
            Payment target,
            RemotePayment source,
            DateTime syncedAtUtc)
        {
            var invoiceNumber = source.Payment.InvoiceNumber!.Value.ToString(CultureInfo.InvariantCulture);
            var paymentMethod = source.Payment.ModeOfPayment ?? string.Empty;
            var fortnoxSource = source.Payment.Source?.GetStringValue();
            var amount = source.Payment.Amount ?? 0m;
            var changed = target.FortnoxInvoiceNumber != invoiceNumber
                || target.Amount != amount
                || target.AmountCurrency != source.Payment.AmountCurrency
                || target.Currency != source.Payment.Currency
                || target.CurrencyRate != source.Payment.CurrencyRate
                || target.CurrencyUnit != source.Payment.CurrencyUnit
                || target.PaymentDate != source.PaymentDate
                || target.Booked != source.Payment.Booked
                || target.FortnoxSource != fortnoxSource
                || target.PaymentMethod != paymentMethod;

            target.FortnoxInvoiceNumber = invoiceNumber;
            target.Amount = amount;
            target.AmountCurrency = source.Payment.AmountCurrency;
            target.Currency = source.Payment.Currency;
            target.CurrencyRate = source.Payment.CurrencyRate;
            target.CurrencyUnit = source.Payment.CurrencyUnit;
            target.PaymentDate = source.PaymentDate;
            target.Booked = source.Payment.Booked;
            target.FortnoxSource = fortnoxSource;
            target.PaymentMethod = paymentMethod;
            target.SyncedAtUtc = syncedAtUtc;
            if (changed)
            {
                target.ModifiedDate = syncedAtUtc;
            }

            return changed;
        }

        private readonly record struct PaymentKey(string PaymentNumber)
        {
            public static PaymentKey FromEntity(Payment payment)
            {
                return new PaymentKey(payment.FortnoxPaymentNumber!);
            }
        }

        private sealed record RemotePayment(
            FortnoxInvoicePayment Payment,
            DateTime PaymentDate)
        {
            public PaymentKey Key => new(
                Payment.Number!.Value.ToString(CultureInfo.InvariantCulture));
        }

        private sealed record ScheduleClaim(
            bool ShouldRun,
            string ClaimValue,
            DateTimeOffset? LastRunAtUtc);
    }
}
