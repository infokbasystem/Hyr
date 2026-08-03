using System.Globalization;
using Hyr.Api.Data;
using Hyr.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hyr.Api.Controllers
{
    [ApiController]
    [Route("api/finance/overview")]
    public class FinanceOverviewController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public FinanceOverviewController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet("weekly")]
        [Authorize]
        public async Task<ActionResult<IReadOnlyList<WeeklyFinancePointDto>>> GetWeekly([FromQuery] int weeks = 15, [FromQuery] int weekOffset = 0)
        {
            weeks = Math.Clamp(weeks, 1, 52);
            weekOffset = Math.Max(0, weekOffset);

            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var today = DateTime.UtcNow.Date;
            var currentWeekStart = StartOfIsoWeek(today);
            var windowEndWeekStart = currentWeekStart.AddDays(-7 * weekOffset);
            var firstWeekStart = windowEndWeekStart.AddDays(-7 * (weeks - 1));

            var invoiceRows = await _context.Invoices
                .AsNoTracking()
                .Where(i => i.OfficeId == user.OfficeId && !i.IsCancelled && i.InvoiceDate.HasValue && i.InvoiceDate.Value.Date >= firstWeekStart && i.InvoiceDate.Value.Date <= today)
                .Select(i => new
                {
                    Date = i.InvoiceDate!.Value,
                    Amount = i.TotSum ?? 0m,
                })
                .ToListAsync();

            var paymentRows = await _context.Payments
                .AsNoTracking()
                .Where(p => p.OfficeId == user.OfficeId && p.PaymentDate.Date >= firstWeekStart && p.PaymentDate.Date <= today)
                .Select(p => new
                {
                    Date = p.PaymentDate,
                    Amount = p.Amount,
                })
                .ToListAsync();

            var invoiceSums = invoiceRows
                .GroupBy(row => BuildIsoWeekKey(row.Date))
                .ToDictionary(group => group.Key, group => group.Sum(row => row.Amount));

            var paymentSums = paymentRows
                .GroupBy(row => BuildIsoWeekKey(row.Date))
                .ToDictionary(group => group.Key, group => group.Sum(row => row.Amount));

            var result = new List<WeeklyFinancePointDto>(weeks);
            for (var offset = 0; offset < weeks; offset++)
            {
                var weekStart = firstWeekStart.AddDays(offset * 7);
                var weekKey = BuildIsoWeekKey(weekStart);
                var weekNumber = ISOWeek.GetWeekOfYear(weekStart);

                invoiceSums.TryGetValue(weekKey, out var intakter);
                paymentSums.TryGetValue(weekKey, out var kassaflode);

                result.Add(new WeeklyFinancePointDto
                {
                    Week = weekNumber,
                    Label = $"v.{weekNumber}",
                    Intakter = intakter,
                    Kassaflode = kassaflode,
                });
            }

            return Ok(result);
        }

        [HttpGet("outstanding")]
        [Authorize]
        public async Task<ActionResult<OutstandingFinanceDto>> GetOutstanding()
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var invoiceRows = await _context.Invoices
                .AsNoTracking()
                .Where(i => i.OfficeId == user.OfficeId && !i.IsCancelled)
                .Select(i => new
                {
                    i.Id,
                    i.InvoiceDate,
                    i.NrOfInvoiceDays,
                    TotSum = i.TotSum ?? 0m,
                })
                .ToListAsync();

            var paymentSums = await _context.Payments
                .AsNoTracking()
                .Where(p => p.OfficeId == user.OfficeId)
                .GroupBy(p => p.InvoiceId)
                .Select(group => new { InvoiceId = group.Key, Amount = group.Sum(p => p.Amount) })
                .ToDictionaryAsync(entry => entry.InvoiceId, entry => entry.Amount);

            var today = DateTime.UtcNow.Date;
            decimal forfallet = 0m;
            decimal ejForfallet = 0m;

            foreach (var invoice in invoiceRows)
            {
                if (!invoice.InvoiceDate.HasValue || !invoice.NrOfInvoiceDays.HasValue)
                {
                    continue;
                }

                var dueDate = invoice.InvoiceDate.Value.Date.AddDays(invoice.NrOfInvoiceDays.Value);
                paymentSums.TryGetValue(invoice.Id, out var paidAmount);
                var outstandingAmount = Math.Max(0m, invoice.TotSum - paidAmount);

                if (outstandingAmount <= 0m)
                {
                    continue;
                }

                if (dueDate < today)
                {
                    forfallet += outstandingAmount;
                }
                else
                {
                    ejForfallet += outstandingAmount;
                }
            }

            return Ok(new OutstandingFinanceDto
            {
                EjForfallet = ejForfallet,
                Forfallet = forfallet,
            });
        }

        [HttpGet("overdue")]
        [Authorize]
        public async Task<ActionResult<PagedResultDto<OverdueInvoiceDto>>> GetOverdue([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
        {
            pageNumber = Math.Max(1, pageNumber);
            pageSize = Math.Clamp(pageSize, 1, 200);

            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var invoiceRows = await _context.Invoices
                .AsNoTracking()
                .Where(i => i.OfficeId == user.OfficeId && !i.IsCancelled)
                .Select(i => new
                {
                    i.Id,
                    i.InvoiceNr,
                    i.CustomerName,
                    i.InvoiceDate,
                    i.NrOfInvoiceDays,
                    TotSum = i.TotSum ?? 0m,
                })
                .ToListAsync();

            var paymentSums = await _context.Payments
                .AsNoTracking()
                .Where(p => p.OfficeId == user.OfficeId)
                .GroupBy(p => p.InvoiceId)
                .Select(group => new { InvoiceId = group.Key, Amount = group.Sum(p => p.Amount) })
                .ToDictionaryAsync(entry => entry.InvoiceId, entry => entry.Amount);

            var today = DateTime.UtcNow.Date;
            var overdueRows = new List<OverdueInvoiceDto>();

            foreach (var invoice in invoiceRows)
            {
                if (!invoice.InvoiceDate.HasValue || !invoice.NrOfInvoiceDays.HasValue)
                {
                    continue;
                }

                var dueDate = invoice.InvoiceDate.Value.Date.AddDays(invoice.NrOfInvoiceDays.Value);
                if (dueDate >= today)
                {
                    continue;
                }

                paymentSums.TryGetValue(invoice.Id, out var paidAmount);
                var outstandingAmount = Math.Max(0m, invoice.TotSum - paidAmount);
                if (outstandingAmount <= 0m)
                {
                    continue;
                }

                overdueRows.Add(new OverdueInvoiceDto
                {
                    Id = invoice.Id,
                    Fakturanr = invoice.InvoiceNr,
                    Forfaller = dueDate,
                    Kund = invoice.CustomerName,
                    Belopp = outstandingAmount,
                });
            }

            var ordered = overdueRows
                .OrderBy(row => row.Forfaller)
                .ThenByDescending(row => row.Fakturanr)
                .ToList();

            var totalCount = ordered.Count;
            var totalPages = totalCount == 0 ? 1 : (int)Math.Ceiling(totalCount / (double)pageSize);
            var effectivePage = Math.Min(pageNumber, totalPages);

            var items = ordered
                .Skip((effectivePage - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new PagedResultDto<OverdueInvoiceDto>
            {
                Items = items,
                PageNumber = effectivePage,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages,
            });
        }

        private static DateTime StartOfIsoWeek(DateTime date)
        {
            var dayOfWeek = (int)date.DayOfWeek;
            if (dayOfWeek == 0)
            {
                dayOfWeek = 7;
            }

            return date.AddDays(1 - dayOfWeek).Date;
        }

        private static string BuildIsoWeekKey(DateTime date)
        {
            var week = ISOWeek.GetWeekOfYear(date);
            var year = ISOWeek.GetYear(date);
            return $"{year:D4}-{week:D2}";
        }

        public class WeeklyFinancePointDto
        {
            public int Week { get; set; }
            public string Label { get; set; } = string.Empty;
            public decimal Intakter { get; set; }
            public decimal Kassaflode { get; set; }
        }

        public class OutstandingFinanceDto
        {
            public decimal EjForfallet { get; set; }
            public decimal Forfallet { get; set; }
        }

        public class OverdueInvoiceDto
        {
            public int Id { get; set; }
            public int? Fakturanr { get; set; }
            public DateTime Forfaller { get; set; }
            public string Kund { get; set; } = string.Empty;
            public decimal Belopp { get; set; }
        }

        public class PagedResultDto<T>
        {
            public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
            public int PageNumber { get; set; }
            public int PageSize { get; set; }
            public int TotalCount { get; set; }
            public int TotalPages { get; set; }
            public bool HasPreviousPage => PageNumber > 1;
            public bool HasNextPage => PageNumber < TotalPages;
        }
    }
}
