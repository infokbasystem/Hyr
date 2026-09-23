using Backend.Data;
using Backend.Dtos;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/operations/overview")]
    public class OperationsOverviewController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public OperationsOverviewController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<OperationsOverviewDto>> GetOverview()
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var now = DateTime.UtcNow;
            var today = now.Date;
            var yearStart = new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var lastYearComparisonEnd = now.AddYears(-1);
            var lastYearStart = yearStart.AddYears(-1);

            var bookableItemIds = await _context.Items
                .AsNoTracking()
                .Where(i => i.OfficeId == user.OfficeId &&
                    i.IsActive &&
                    !i.UnavailableForReservation &&
                    (i.ItemTypeCode.ToUpper() == "VEHICLE" || i.ItemTypeCode.ToUpper() == "LIFT"))
                .Select(i => i.Id)
                .ToListAsync();

            var bookedIntervals = await _context.ReservationItems
                .AsNoTracking()
                .Where(ri => ri.ItemId.HasValue &&
                    bookableItemIds.Contains(ri.ItemId.Value) &&
                    ri.BookedFrom.HasValue &&
                    ri.BookedTo.HasValue &&
                    ri.BookedFrom.Value <= now &&
                    ri.BookedTo.Value >= lastYearStart)
                .Select(ri => new
                {
                    ItemId = ri.ItemId!.Value,
                    BookedFrom = ri.BookedFrom!.Value,
                    BookedTo = ri.BookedTo!.Value,
                })
                .ToListAsync();

            var currentBookedItemCount = bookedIntervals
                .Where(interval => interval.BookedFrom <= now && interval.BookedTo >= now)
                .Select(interval => interval.ItemId)
                .Distinct()
                .Count();

            var currentUtilization = bookableItemIds.Count == 0
                ? 0
                : currentBookedItemCount * 100d / bookableItemIds.Count;

            var bookedYtdTicks = bookedIntervals
                .Where(interval => interval.BookedFrom <= now && interval.BookedTo >= yearStart)
                .GroupBy(interval => interval.ItemId)
                .Sum(group => GetMergedBookedTicks(group
                    .Select(interval => (
                        Start: interval.BookedFrom < yearStart ? yearStart : interval.BookedFrom,
                        End: interval.BookedTo > now ? now : interval.BookedTo))));
            var availableYtdTicks = bookableItemIds.Count * (double)(now - yearStart).Ticks;
            var ytdUtilization = availableYtdTicks <= 0
                ? 0
                : bookedYtdTicks * 100d / availableYtdTicks;

            var bookedLastYearYtdTicks = bookedIntervals
                .Where(interval => interval.BookedFrom <= lastYearComparisonEnd && interval.BookedTo >= lastYearStart)
                .GroupBy(interval => interval.ItemId)
                .Sum(group => GetMergedBookedTicks(group
                    .Select(interval => (
                        Start: interval.BookedFrom < lastYearStart ? lastYearStart : interval.BookedFrom,
                        End: interval.BookedTo > lastYearComparisonEnd ? lastYearComparisonEnd : interval.BookedTo))));
            var availableLastYearYtdTicks = bookableItemIds.Count * (double)(lastYearComparisonEnd - lastYearStart).Ticks;
            var lastYearYtdUtilization = availableLastYearYtdTicks <= 0
                ? 0
                : bookedLastYearYtdTicks * 100d / availableLastYearYtdTicks;

            // 1. Returned but not checked in reservations
            var reservations = await _context.Reservations
                .AsNoTracking()
                .Where(r => r.OfficeId == user.OfficeId)
                .Include(r => r.ReservationItems)
                    .ThenInclude(ri => ri.Item)
                        .ThenInclude(i => i!.ItemCategory)
                .Include(r => r.ReservationItems)
                    .ThenInclude(ri => ri.Item)
                        .ThenInclude(i => i!.ItemModel)
                .Where(r => r.ReservationItems.Any(ri => ri.ActualTo.HasValue && !ri.IsCheckedIn))
                .ToListAsync();

            var returnedNotCheckedInList = new List<ReturnedNotCheckedInDto>();

            foreach (var r in reservations)
            {
                var notCheckedInItems = r.ReservationItems
                    .Where(ri => ri.ActualTo.HasValue && !ri.IsCheckedIn)
                    .OrderBy(ri => ri.SortNr)
                    .ToList();

                if (notCheckedInItems.Count == 0)
                {
                    continue;
                }

                var actualToDate = notCheckedInItems.Max(ri => ri.ActualTo!.Value);
                var daysSince = Math.Max(1, (int)Math.Ceiling((today - actualToDate.Date).TotalDays));

                var itemDescriptions = notCheckedInItems.Select(ri =>
                {
                    if (ri.Item != null)
                    {
                        var parts = new List<string>();
                        var name = $"{ri.Item.Manufacturer} {ri.Item.ItemModel?.Name}".Trim();
                        if (!string.IsNullOrWhiteSpace(name))
                        {
                            parts.Add(name);
                        }
                        else if (!string.IsNullOrWhiteSpace(ri.Item.RegNr))
                        {
                            parts.Add(ri.Item.RegNr);
                        }
                        else if (!string.IsNullOrWhiteSpace(ri.Item.ItemNr))
                        {
                            parts.Add(ri.Item.ItemNr);
                        }

                        if (!string.IsNullOrWhiteSpace(ri.Item.RegNr) && !parts.Contains(ri.Item.RegNr))
                        {
                            parts.Add(ri.Item.RegNr);
                        }

                        return string.Join(" ", parts);
                    }

                    if (!string.IsNullOrWhiteSpace(ri.RegNr))
                    {
                        return ri.RegNr;
                    }

                    if (!string.IsNullOrWhiteSpace(ri.ItemName))
                    {
                        return ri.ItemName;
                    }

                    return "Hyresobjekt";
                }).Where(s => !string.IsNullOrWhiteSpace(s)).Distinct().ToList();

                var category = string.Join(", ", notCheckedInItems
                    .Select(ri => ri.Item?.ItemCategory?.Name ?? ri.Category)
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Distinct()
                    .OrderBy(name => name));

                returnedNotCheckedInList.Add(new ReturnedNotCheckedInDto
                {
                    ReservationId = r.Id,
                    ReservationNr = r.ReservationNr,
                    CustomerName = string.IsNullOrWhiteSpace(r.CustomerName) ? "Okänd kund" : r.CustomerName,
                    Phone = string.IsNullOrWhiteSpace(r.MobilePhone) ? r.TelephoneWorkplace : r.MobilePhone,
                    Email = r.Email,
                    Category = category,
                    Items = itemDescriptions,
                    ActualTo = actualToDate,
                    DaysSinceReturn = daysSince,
                    InternalNote = r.Note,
                });
            }

            returnedNotCheckedInList = returnedNotCheckedInList
                .OrderByDescending(x => x.DaysSinceReturn)
                .ThenBy(x => x.ReservationId)
                .ToList();

            // 2. Items needing special handling (service, workshop, besiktning, unavailable)
            var specialItems = await _context.Items
                .AsNoTracking()
                .Where(i => i.OfficeId == user.OfficeId && i.IsActive &&
                    (i.UnavailableForReservation || !string.IsNullOrWhiteSpace(i.UnavailableReason) || i.UnavailableFrom.HasValue || i.UnavailableTo.HasValue))
                .Include(i => i.ItemType)
                .Include(i => i.ItemCategory)
                .Include(i => i.ItemModel)
                .ToListAsync();

            var specialHandlingList = new List<SpecialHandlingItemDto>();

            foreach (var item in specialItems)
            {
                var title = $"{item.Manufacturer} {item.ItemModel?.Name}".Trim();
                if (string.IsNullOrWhiteSpace(title))
                {
                    title = !string.IsNullOrWhiteSpace(item.ItemNr) ? item.ItemNr : item.RegNr;
                    if (string.IsNullOrWhiteSpace(title))
                    {
                        title = item.ItemCategory?.Name ?? "Hyresobjekt";
                    }
                }

                var subtitleParts = new List<string>();
                if (!string.IsNullOrWhiteSpace(item.RegNr))
                {
                    subtitleParts.Add(item.RegNr);
                }
                if (!string.IsNullOrWhiteSpace(item.ItemNr) && item.ItemNr != title)
                {
                    subtitleParts.Add(item.ItemNr);
                }
                if (!string.IsNullOrWhiteSpace(item.ItemCategory?.Name))
                {
                    subtitleParts.Add(item.ItemCategory.Name);
                }
                if (!string.IsNullOrWhiteSpace(item.Note))
                {
                    subtitleParts.Add(item.Note);
                }

                var reason = !string.IsNullOrWhiteSpace(item.UnavailableReason)
                    ? item.UnavailableReason.Trim()
                    : "Specialhantering";

                // Determine badge text and days count
                int? daysCount = null;
                string badgeText;

                if (item.UnavailableFrom.HasValue)
                {
                    var days = (int)Math.Ceiling((today - item.UnavailableFrom.Value.Date).TotalDays);
                    if (days >= 0)
                    {
                        daysCount = Math.Max(1, days);
                        badgeText = $"{daysCount} {(daysCount == 1 ? "dag" : "dgr")}";
                    }
                    else
                    {
                        // Scheduled in future
                        badgeText = reason;
                    }
                }
                else
                {
                    badgeText = reason;
                }

                specialHandlingList.Add(new SpecialHandlingItemDto
                {
                    Id = item.Id,
                    ItemNr = item.ItemNr,
                    RegNr = item.RegNr,
                    Title = title,
                    Subtitle = string.Join(" · ", subtitleParts),
                    Manufacturer = item.Manufacturer,
                    Model = item.ItemModel?.Name ?? string.Empty,
                    Category = item.ItemCategory?.Name ?? string.Empty,
                    ItemTypeName = item.ItemType?.Name ?? string.Empty,
                    Reason = reason,
                    UnavailableFrom = item.UnavailableFrom,
                    UnavailableTo = item.UnavailableTo,
                    DaysCount = daysCount,
                    BadgeText = badgeText,
                    Note = item.Note,
                });
            }

            specialHandlingList = specialHandlingList
                .OrderByDescending(x => x.DaysCount ?? 0)
                .ThenBy(x => x.Title)
                .ToList();

            return Ok(new OperationsOverviewDto
            {
                CurrentUtilization = currentUtilization,
                YtdUtilization = ytdUtilization,
                LastYearYtdUtilization = lastYearYtdUtilization,
                YtdUtilizationDelta = ytdUtilization - lastYearYtdUtilization,
                ReturnedNotCheckedIn = returnedNotCheckedInList,
                SpecialHandlingItems = specialHandlingList,
            });
        }

        private static long GetMergedBookedTicks(IEnumerable<(DateTime Start, DateTime End)> intervals)
        {
            var orderedIntervals = intervals
                .Where(interval => interval.End > interval.Start)
                .OrderBy(interval => interval.Start)
                .ToList();

            if (orderedIntervals.Count == 0)
            {
                return 0;
            }

            var totalTicks = 0L;
            var currentStart = orderedIntervals[0].Start;
            var currentEnd = orderedIntervals[0].End;

            foreach (var interval in orderedIntervals.Skip(1))
            {
                if (interval.Start <= currentEnd)
                {
                    if (interval.End > currentEnd)
                    {
                        currentEnd = interval.End;
                    }

                    continue;
                }

                totalTicks += (currentEnd - currentStart).Ticks;
                currentStart = interval.Start;
                currentEnd = interval.End;
            }

            return totalTicks + (currentEnd - currentStart).Ticks;
        }
    }
}
