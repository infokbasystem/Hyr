using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/mobile")]
    [Authorize]
    public class MobileController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public MobileController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        /// <summary>Returns active items of all types that are free for the whole period (defaults to right now).</summary>
        [HttpGet("available-items")]
        public async Task<ActionResult<List<MobileAvailableItemDto>>> GetAvailableItems(
            [FromQuery] MobileAvailableItemsFilter filter,
            CancellationToken cancellationToken = default)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var from = filter.From ?? DateTime.Now;
            var to = filter.To ?? from;
            if (to < from)
            {
                return BadRequest(new { message = "Slutdatum måste vara efter startdatum." });
            }

            var query = _context.Items
                .AsNoTracking()
                .Where(item => item.OfficeId == user.OfficeId && item.IsActive)
                .Where(item => !(item.UnavailableForReservation
                    && (item.UnavailableFrom == null || item.UnavailableFrom <= to)
                    && (item.UnavailableTo == null || item.UnavailableTo >= from)))
                // A delivered item that has not been returned stays occupied even after its booked end.
                .Where(item => !_context.ReservationItems.Any(booking =>
                    booking.ItemId == item.Id
                    && (booking.ActualFrom ?? booking.BookedFrom) != null
                    && (booking.ActualFrom ?? booking.BookedFrom) <= to
                    && ((booking.ActualFrom != null && booking.ActualTo == null)
                        || (booking.ActualTo ?? booking.BookedTo) >= from)));

            if (!string.IsNullOrWhiteSpace(filter.ItemTypeCode))
            {
                var itemTypeCode = filter.ItemTypeCode.Trim().ToUpper();
                query = query.Where(item => item.ItemTypeCode.ToUpper() == itemTypeCode);
            }

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.Trim().ToLower();
                query = query.Where(item =>
                    item.ItemNr.ToLower().Contains(searchTerm)
                    || item.RegNr.ToLower().Contains(searchTerm)
                    || item.SerialNr.ToLower().Contains(searchTerm)
                    || item.Manufacturer.ToLower().Contains(searchTerm)
                    || (item.ItemModel != null && item.ItemModel.Name.ToLower().Contains(searchTerm))
                    || (item.ItemCategory != null && item.ItemCategory.Name.ToLower().Contains(searchTerm)));
            }

            var items = await query
                .OrderBy(item => item.ItemCategory != null ? item.ItemCategory.SortOrder : int.MaxValue)
                .ThenBy(item => item.ItemCategory != null ? item.ItemCategory.Name : string.Empty)
                .ThenBy(item => item.ItemNr)
                .ThenBy(item => item.RegNr)
                .Select(item => new MobileAvailableItemDto
                {
                    Id = item.Id,
                    ItemNr = item.ItemNr,
                    RegNr = item.RegNr,
                    SerialNr = item.SerialNr,
                    ItemTypeCode = item.ItemTypeCode,
                    ItemTypeName = item.ItemType != null ? item.ItemType.Name : string.Empty,
                    ItemCategoryName = item.ItemCategory != null ? item.ItemCategory.Name : string.Empty,
                    ItemModelName = item.ItemModel != null ? item.ItemModel.Name : string.Empty,
                    Manufacturer = item.Manufacturer,
                    NextBookedFrom = _context.ReservationItems
                        .Where(booking => booking.ItemId == item.Id && booking.ActualFrom == null && booking.BookedFrom > to)
                        .Min(booking => booking.BookedFrom),
                    CheckInReservationId = _context.ReservationItems
                        .Where(booking => booking.ItemId == item.Id && booking.ActualTo != null && !booking.IsCheckedIn)
                        .OrderByDescending(booking => booking.ActualTo)
                        .Select(booking => booking.ReservationId)
                        .FirstOrDefault(),
                })
                .ToListAsync(cancellationToken);

            return Ok(items);
        }

        /// <summary>Marks reservation rows as delivered, returned or checked in without touching the rest of the reservation.</summary>
        [HttpPost("reservations/{id:int}/item-status")]
        public async Task<ActionResult<MobileItemStatusResultDto>> UpdateItemStatus(
            int id,
            [FromBody] MobileItemStatusRequest request,
            CancellationToken cancellationToken = default)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var action = request.Action?.Trim().ToLowerInvariant() ?? string.Empty;
            Func<ReservationItem, bool>? isEligible = action switch
            {
                MobileItemStatusActions.Deliver => item => !item.ActualFrom.HasValue,
                MobileItemStatusActions.Return => item => item.ActualFrom.HasValue && !item.ActualTo.HasValue,
                MobileItemStatusActions.CheckIn => item => item.ActualTo.HasValue && !item.IsCheckedIn,
                _ => null,
            };
            if (isEligible == null)
            {
                return BadRequest(new { message = "Okänd åtgärd." });
            }

            var reservation = await _context.Reservations
                .Include(candidate => candidate.ReservationItems)
                .FirstOrDefaultAsync(candidate => candidate.Id == id && candidate.OfficeId == user.OfficeId, cancellationToken);
            if (reservation == null)
            {
                return NotFound(new { message = "Reservation not found" });
            }

            var rows = reservation.ReservationItems.ToList();
            List<ReservationItem> selected;
            if (request.ReservationItemIds == null)
            {
                selected = rows.Where(isEligible).ToList();
            }
            else
            {
                var requestedIds = request.ReservationItemIds.Distinct().ToList();
                selected = rows.Where(row => requestedIds.Contains(row.Id)).ToList();
                if (selected.Count != requestedIds.Count)
                {
                    return BadRequest(new { message = "Objekten måste tillhöra bokningen." });
                }
                if (selected.Any(row => !isEligible(row)))
                {
                    return Conflict(new { message = "Ett eller flera objekt har redan ändrats. Ladda om bokningen." });
                }
            }

            // Accessories always share the vehicle's period, matching the desktop reservation form.
            if (selected.Any(IsVehicle))
            {
                selected = selected
                    .Concat(rows.Where(row => IsAccessory(row) && isEligible(row)))
                    .Distinct()
                    .ToList();
            }

            if (selected.Count == 0)
            {
                return Conflict(new { message = "Det finns inga objekt att uppdatera." });
            }

            var at = request.At ?? RoundToNearestQuarterHour(DateTime.Now);
            if (action == MobileItemStatusActions.Return && selected.Any(row => row.ActualFrom > at))
            {
                return BadRequest(new { message = "Återlämningstiden kan inte vara före utlämningstiden." });
            }

            foreach (var row in selected)
            {
                switch (action)
                {
                    case MobileItemStatusActions.Deliver:
                        row.ActualFrom = at;
                        row.IsCheckedIn = false;
                        break;
                    case MobileItemStatusActions.Return:
                        row.ActualTo = at;
                        break;
                    default:
                        row.IsCheckedIn = true;
                        break;
                }
            }

            reservation.ModifiedByUserId = user.Id;
            reservation.ModifiedDate = DateTime.UtcNow;

            var calcs = await _context.ReservationCalcs
                .Where(calc => calc.ReservationId == reservation.Id)
                .Include(calc => calc.ReservationCalcItems)
                    .ThenInclude(calcItem => calcItem.InvoiceRows)
                .ToListAsync(cancellationToken);
            var categoryNamesById = await _context.ItemCategories
                .Where(category => category.OfficeId == user.OfficeId)
                .ToDictionaryAsync(category => category.Id, category => category.Name, cancellationToken);
            reservation.StatusCode = ReservationStatusCodes.Compute(rows, calcs, categoryNamesById);

            await _context.SaveChangesAsync(cancellationToken);

            return Ok(new MobileItemStatusResultDto
            {
                ReservationId = reservation.Id,
                StatusCode = reservation.StatusCode,
                UpdatedReservationItemIds = selected.Select(row => row.Id).Order().ToList(),
            });
        }

        private static bool IsVehicle(ReservationItem item) =>
            string.Equals(item.ItemTypeCode?.Trim(), "VEHICLE", StringComparison.OrdinalIgnoreCase);

        private static bool IsAccessory(ReservationItem item) =>
            string.Equals(item.ItemTypeCode?.Trim(), "ACCESSORY", StringComparison.OrdinalIgnoreCase);

        private static DateTime RoundToNearestQuarterHour(DateTime value)
        {
            var quarterTicks = TimeSpan.FromMinutes(15).Ticks;
            return new DateTime((value.Ticks + quarterTicks / 2) / quarterTicks * quarterTicks, DateTimeKind.Unspecified);
        }
    }
}
