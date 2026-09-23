using System;
using System.Collections.Generic;
using System.Linq;

namespace Backend.Models
{
    public static class ReservationStatusCodes
    {
        public const string Booked = "BOOKED";
        public const string Active = "ACTIVE";
        public const string Returned = "RETURNED";
        public const string Finished = "FINISHED";

        /// <summary>Derives the reservation lifecycle status from its items' delivery/return state and outstanding invoicing.</summary>
        public static string Compute(
            ICollection<ReservationItem> items,
            ICollection<ReservationCalc> calcs,
            IReadOnlyDictionary<int, string> categoryNamesById)
        {
            if (items == null || items.Count == 0)
            {
                return Booked;
            }

            var allReturned = items.All(item => item.ActualTo.HasValue);
            if (allReturned)
            {
                // No calcs means pricing was never executed, so it can't be finished/invoiced yet.
                if (calcs == null || calcs.Count == 0)
                {
                    return Returned;
                }

                var outstandingPayers = ResolveOutstandingPayers(items, calcs, categoryNamesById);
                return outstandingPayers.Count == 0 ? Finished : Returned;
            }

            var anyDelivered = items.Any(item => item.ActualFrom.HasValue);
            return anyDelivered ? Active : Booked;
        }

        public static List<string> ResolveOutstandingPayers(
            ICollection<ReservationItem> items,
            ICollection<ReservationCalc> calcs,
            IReadOnlyDictionary<int, string> categoryNamesById)
        {
            const decimal epsilon = 0.01m;

            var totals = new Dictionary<string, decimal>();
            var invoiced = new Dictionary<string, decimal>();

            string ResolveParty(ReservationItem? item)
            {
                if (item == null)
                {
                    return ReceiverTypeCodes.Customer;
                }

                if (item.IsInsurance || item.InsuranceCompanyId.HasValue)
                {
                    return ReceiverTypeCodes.InsuranceCompany;
                }

                if (item.DebitCategoryId.HasValue
                    && categoryNamesById.TryGetValue(item.DebitCategoryId.Value, out var categoryName)
                    && categoryName.Contains("intern", StringComparison.OrdinalIgnoreCase))
                {
                    return ReceiverTypeCodes.Internal;
                }

                return ReceiverTypeCodes.Customer;
            }

            foreach (var calc in calcs ?? new List<ReservationCalc>())
            {
                var calcItems = calc.ReservationCalcItems ?? new List<ReservationCalcItem>();
                var matchedItemId = calcItems.Select(row => row.ItemId).FirstOrDefault(id => id.HasValue);
                var matchedItem = matchedItemId.HasValue
                    ? items.FirstOrDefault(item => item.ItemId == matchedItemId)
                    : null;
                var party = ResolveParty(matchedItem);

                foreach (var row in calcItems)
                {
                    totals[party] = totals.GetValueOrDefault(party) + (row.Sum ?? 0m);

                    var invoicedSum = (row.InvoiceRows ?? new List<InvoiceRow>())
                        .Where(invoiceRow => invoiceRow.InvoiceId.HasValue)
                        .Sum(invoiceRow => invoiceRow.Sum ?? 0m);
                    invoiced[party] = invoiced.GetValueOrDefault(party) + invoicedSum;
                }
            }

            var outstanding = new List<string>();
            foreach (var partyKey in new[] { ReceiverTypeCodes.Customer, ReceiverTypeCodes.InsuranceCompany, ReceiverTypeCodes.Internal })
            {
                var total = totals.GetValueOrDefault(partyKey);
                var invoicedAmount = invoiced.GetValueOrDefault(partyKey);
                if (total - invoicedAmount > epsilon)
                {
                    outstanding.Add(partyKey);
                }
            }

            return outstanding;
        }
    }
}
