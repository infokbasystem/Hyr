using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Backend.Data;
using Backend.Dtos;
using Backend.Filters;
using Backend.Services;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/planning")]
    public class PlanningController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public PlanningController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet("categories")]
        [Authorize]
        public async Task<ActionResult<List<PlanningCategoryOptionDto>>> GetCategories(
            [FromQuery] string? itemTypeCode = null,
            CancellationToken cancellationToken = default)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var query = _context.ItemCategories
                .AsNoTracking()
                .Where(ic => ic.OfficeId == user.OfficeId);

            if (itemTypeCode != null)
            {
                var normalizedType = itemTypeCode.Trim().ToUpperInvariant();
                query = query.Where(ic => _context.Items.Any(item =>
                    item.OfficeId == user.OfficeId && item.IsActive
                    && item.ItemTypeCode.ToUpper() == normalizedType
                    && item.ItemCategoryId == ic.Id));
            }

            var categories = await query
                .OrderBy(ic => ic.SortOrder)
                .ThenBy(ic => ic.Name)
                .Select(ic => new PlanningCategoryOptionDto
                {
                    Id = ic.Id,
                    Name = ic.Name,
                })
                .ToListAsync(cancellationToken);

            return Ok(categories);
        }

        [HttpGet("vehicles")]
        [Authorize]
        public async Task<ActionResult<List<PlanningVehicleDto>>> GetVehicles([FromQuery] PlanningVehicleFilter filter)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var query = _context.Items
                .AsNoTracking()
                .Where(i => i.OfficeId == user.OfficeId && i.ItemTypeCode.ToUpper() == "VEHICLE");

            if (filter.IsActive.HasValue)
            {
                query = query.Where(i => i.IsActive == filter.IsActive.Value);
            }

            if (filter.CategoryIds != null && filter.CategoryIds.Count > 0)
            {
                query = query.Where(i => i.ItemCategoryId.HasValue && filter.CategoryIds.Contains(i.ItemCategoryId.Value));
            }

            if (!string.IsNullOrWhiteSpace(filter.CategoryName))
            {
                var categoryName = filter.CategoryName.Trim().ToLower();
                query = query.Where(i => i.ItemCategory != null && i.ItemCategory.Name.ToLower() == categoryName);
            }

            if (!string.IsNullOrWhiteSpace(filter.ModelName))
            {
                var modelName = filter.ModelName.Trim().ToLower();
                query = query.Where(i => i.ItemModel != null && i.ItemModel.Name.ToLower() == modelName);
            }

            if (filter.AvailableFrom.HasValue && filter.AvailableTo.HasValue)
            {
                var availableFrom = filter.AvailableFrom.Value;
                var availableTo = filter.AvailableTo.Value;

                query = query.Where(i => !_context.ReservationItems.Any(ri =>
                    ri.ItemId == i.Id &&
                    (ri.ActualFrom ?? ri.BookedFrom) != null &&
                    (ri.ActualTo ?? ri.BookedTo) != null &&
                    (ri.ActualFrom ?? ri.BookedFrom)! <= availableTo &&
                    (ri.ActualTo ?? ri.BookedTo)! >= availableFrom));
            }

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.Trim().ToLower();
                query = query.Where(i =>
                    i.RegNr.ToLower().Contains(searchTerm) ||
                    i.ItemNr.ToLower().Contains(searchTerm) ||
                    i.Manufacturer.ToLower().Contains(searchTerm));
            }

            var vehicles = await query
                .OrderBy(i => i.ItemCategory != null ? i.ItemCategory.SortOrder : int.MaxValue)
                .ThenBy(i => i.ItemCategory != null ? i.ItemCategory.Name : string.Empty)
                .ThenBy(i => i.RegNr)
                .Select(i => new PlanningVehicleDto
                {
                    Id = i.Id,
                    RegNr = i.RegNr,
                    ItemNr = i.ItemNr,
                    ItemCategoryId = i.ItemCategoryId,
                    ItemCategoryName = i.ItemCategory != null ? i.ItemCategory.Name : string.Empty,
                    Manufacturer = i.Manufacturer,
                    ItemModelName = i.ItemModel != null ? i.ItemModel.Name : string.Empty,
                    CurrentStatus = _context.ReservationItems.Any(ri =>
                        ri.ItemId == i.Id && ri.ActualFrom.HasValue && !ri.ActualTo.HasValue)
                        ? 1
                        : !_context.ReservationItems.Any(ri => ri.ItemId == i.Id && ri.ActualTo.HasValue)
                            ? 3
                            : _context.ReservationItems
                                .Where(ri => ri.ItemId == i.Id && ri.ActualTo.HasValue)
                                .OrderByDescending(ri => ri.ActualTo)
                                .ThenByDescending(ri => ri.Id)
                                .Select(ri => ri.IsCheckedIn ? 3 : 2)
                                .FirstOrDefault(),
                })
                .ToListAsync();

            return Ok(vehicles);
        }

        [HttpGet("cabin-types")]
        [Authorize]
        public async Task<ActionResult<List<PlanningCabinTypeOptionDto>>> GetCabinTypes()
        {
            var cabinTypes = await _context.CabinTypes
                .AsNoTracking()
                .OrderBy(ct => ct.SortNr)
                .ThenBy(ct => ct.Name)
                .Select(ct => new PlanningCabinTypeOptionDto
                {
                    Code = ct.Code,
                    Name = ct.Name,
                })
                .ToListAsync();

            return Ok(cabinTypes);
        }

        [HttpGet("cabins")]
        [Authorize]
        public async Task<ActionResult<List<PlanningCabinDto>>> GetCabins([FromQuery] PlanningCabinFilter filter)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var query = _context.Items
                .AsNoTracking()
                .Where(i => i.OfficeId == user.OfficeId && i.ItemTypeCode.ToUpper() == "CABIN");

            if (filter.IsActive.HasValue)
            {
                query = query.Where(i => i.IsActive == filter.IsActive.Value);
            }

            var cabinTypeCodes = NormalizeCodes(filter.CabinTypeCodes);
            if (cabinTypeCodes.Count > 0)
            {
                query = query.Where(i => i.CabinTypeCode != null && cabinTypeCodes.Contains(i.CabinTypeCode));
            }

            if (filter.CategoryIds != null && filter.CategoryIds.Count > 0)
            {
                query = query.Where(i => i.ItemCategoryId.HasValue && filter.CategoryIds.Contains(i.ItemCategoryId.Value));
            }

            if (filter.AvailableFrom.HasValue && filter.AvailableTo.HasValue)
            {
                var availableFrom = filter.AvailableFrom.Value;
                var availableTo = filter.AvailableTo.Value;

                query = query.Where(i => !_context.ReservationItems.Any(ri =>
                    ri.ItemId == i.Id &&
                    (ri.ActualFrom ?? ri.BookedFrom) != null &&
                    (ri.ActualTo ?? ri.BookedTo) != null &&
                    (ri.ActualFrom ?? ri.BookedFrom)! <= availableTo &&
                    (ri.ActualTo ?? ri.BookedTo)! >= availableFrom));
            }

            var cabins = await query
                .OrderBy(i => i.ItemCategory != null ? i.ItemCategory.SortOrder : int.MaxValue)
                .ThenBy(i => i.ItemCategory != null ? i.ItemCategory.Name : string.Empty)
                .ThenBy(i => i.ItemNr)
                .Select(i => new PlanningCabinDto
                {
                    Id = i.Id,
                    ItemNr = i.ItemNr,
                    SerialNr = i.SerialNr,
                    CabinTypeCode = i.CabinTypeCode,
                    CabinTypeName = i.CabinType != null ? i.CabinType.Name : string.Empty,
                    ItemCategoryId = i.ItemCategoryId,
                    ItemCategoryName = i.ItemCategory != null ? i.ItemCategory.Name : string.Empty,
                    Manufacturer = i.Manufacturer,
                    ItemModelName = i.ItemModel != null ? i.ItemModel.Name : string.Empty,
                    CurrentStatus = _context.ReservationItems.Any(ri =>
                        ri.ItemId == i.Id && ri.ActualFrom.HasValue && !ri.ActualTo.HasValue)
                        ? 1
                        : !_context.ReservationItems.Any(ri => ri.ItemId == i.Id && ri.ActualTo.HasValue)
                            ? 3
                            : _context.ReservationItems
                                .Where(ri => ri.ItemId == i.Id && ri.ActualTo.HasValue)
                                .OrderByDescending(ri => ri.ActualTo)
                                .ThenByDescending(ri => ri.Id)
                                .Select(ri => ri.IsCheckedIn ? 3 : 2)
                                .FirstOrDefault(),
                })
                .ToListAsync();

            return Ok(cabins);
        }

        [HttpGet("lifts")]
        [Authorize]
        public async Task<ActionResult<List<PlanningLiftDto>>> GetLifts(
            [FromQuery] PlanningLiftFilter filter,
            CancellationToken cancellationToken = default)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var query = _context.Items
                .AsNoTracking()
                .Where(item => item.OfficeId == user.OfficeId && item.ItemTypeCode.ToUpper() == "LIFT");

            if (filter.IsActive.HasValue)
            {
                query = query.Where(item => item.IsActive == filter.IsActive.Value);
            }

            if (filter.CategoryIds != null && filter.CategoryIds.Count > 0)
            {
                query = query.Where(item => item.ItemCategoryId.HasValue && filter.CategoryIds.Contains(item.ItemCategoryId.Value));
            }

            if (filter.AvailableFrom.HasValue && filter.AvailableTo.HasValue)
            {
                var availableFrom = filter.AvailableFrom.Value;
                var availableTo = filter.AvailableTo.Value;
                query = query.Where(item => !_context.ReservationItems.Any(booking =>
                    booking.ItemId == item.Id &&
                    (booking.ActualFrom ?? booking.BookedFrom) != null &&
                    (booking.ActualTo ?? booking.BookedTo) != null &&
                    (booking.ActualFrom ?? booking.BookedFrom)! <= availableTo &&
                    (booking.ActualTo ?? booking.BookedTo)! >= availableFrom));
            }

            var lifts = await query
                .OrderBy(item => item.ItemCategory != null ? item.ItemCategory.SortOrder : int.MaxValue)
                .ThenBy(item => item.ItemCategory != null ? item.ItemCategory.Name : string.Empty)
                .ThenBy(item => item.ItemNr)
                .Select(item => new PlanningLiftDto
                {
                    Id = item.Id,
                    ItemNr = item.ItemNr,
                    SerialNr = item.SerialNr,
                    ItemCategoryId = item.ItemCategoryId,
                    ItemCategoryName = item.ItemCategory != null ? item.ItemCategory.Name : string.Empty,
                    Manufacturer = item.Manufacturer,
                    ItemModelName = item.ItemModel != null ? item.ItemModel.Name : string.Empty,
                    CurrentStatus = _context.ReservationItems.Any(booking =>
                        booking.ItemId == item.Id && booking.ActualFrom.HasValue && !booking.ActualTo.HasValue)
                        ? 1
                        : !_context.ReservationItems.Any(booking => booking.ItemId == item.Id && booking.ActualTo.HasValue)
                            ? 3
                            : _context.ReservationItems
                                .Where(booking => booking.ItemId == item.Id && booking.ActualTo.HasValue)
                                .OrderByDescending(booking => booking.ActualTo)
                                .ThenByDescending(booking => booking.Id)
                                .Select(booking => booking.IsCheckedIn ? 3 : 2)
                                .FirstOrDefault(),
                })
                .ToListAsync(cancellationToken);

            return Ok(lifts);
        }

        /// <summary>Returns all booked and handed-out items that have not been returned, across item types.</summary>
        [HttpGet("customer-rentals")]
        [Authorize]
        [ProducesResponseType(typeof(List<PlanningCustomerRentalDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<List<PlanningCustomerRentalDto>>> GetCustomerRentals(
            CancellationToken cancellationToken = default)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var items = await _context.ReservationItems
                .AsNoTracking()
                .Where(item => item.OfficeId == user.OfficeId
                    && item.Item != null && item.Item.OfficeId == user.OfficeId
                    && item.Reservation != null && item.Reservation.OfficeId == user.OfficeId
                    && !item.ActualTo.HasValue
                    && !item.IsCheckedIn
                    && (item.BookedFrom.HasValue || item.ActualFrom.HasValue))
                .OrderBy(item => item.BookedFrom ?? item.ActualFrom)
                .ThenBy(item => item.Id)
                .Select(item => new
                {
                    item.Id,
                    ReservationId = item.Reservation!.Id,
                    item.Reservation.CustomerId,
                    Customer = item.Reservation.CustomerName,
                    ItemId = item.Item!.Id,
                    item.Item.ItemNr,
                    ItemName = item.Item.ItemModel != null ? item.Item.ItemModel.Name
                        : item.Item.ItemCategory != null ? item.Item.ItemCategory.Name : item.Item.Manufacturer,
                    item.Item.RegNr,
                    item.Item.SerialNr,
                    item.Reservation.DeliveryPlace,
                    item.Reservation.CustomerMarking,
                    item.Reservation.PlacementStreet,
                    item.Reservation.PlacementZipCode,
                    item.Reservation.PlacementCity,
                    item.Reservation.PlacementLatitude,
                    item.Reservation.PlacementLongitude,
                    item.BookedFrom,
                    item.BookedTo,
                    item.ActualFrom,
                    item.ActualTo,
                })
                .ToListAsync(cancellationToken);

            var now = DateTime.Now;
            return Ok(items.Select(item => new PlanningCustomerRentalDto
            {
                Id = item.Id,
                ReservationId = item.ReservationId,
                CustomerId = item.CustomerId,
                Customer = string.IsNullOrWhiteSpace(item.Customer) ? "Kund saknas" : item.Customer,
                ItemId = item.ItemId,
                ItemNr = item.ItemNr,
                ItemName = string.IsNullOrWhiteSpace(item.ItemName) ? item.ItemNr : item.ItemName,
                RegNr = item.RegNr,
                SerialNr = item.SerialNr,
                DeliveryPlace = item.DeliveryPlace,
                CustomerMarking = item.CustomerMarking,
                PlacementStreet = item.PlacementStreet,
                PlacementZipCode = item.PlacementZipCode,
                PlacementCity = item.PlacementCity,
                PlacementLatitude = item.PlacementLatitude,
                PlacementLongitude = item.PlacementLongitude,
                Start = (item.ActualFrom ?? item.BookedFrom) is DateTime start ? new DateTimeOffset(start) : null,
                End = item.BookedTo is DateTime end ? new DateTimeOffset(end) : null,
                Status = ResolvePlanningReservationStatus(item.ActualFrom, item.ActualTo, item.BookedFrom, item.BookedTo, now),
            }).ToList());
        }

        [HttpGet("reservations")]
        [Authorize]
        public async Task<ActionResult<List<PlanningReservationDto>>> GetReservations([FromQuery] PlanningReservationFilter filter)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var itemTypeCode = string.IsNullOrWhiteSpace(filter.ItemTypeCode)
                ? "VEHICLE"
                : filter.ItemTypeCode.Trim().ToUpper();

            var query = _context.ReservationItems
                .AsNoTracking()
                .Where(item => item.OfficeId == user.OfficeId
                    && item.ItemId.HasValue
                    && item.Item != null
                    && item.Item.OfficeId == user.OfficeId
                    && item.Item.ItemTypeCode.ToUpper() == itemTypeCode
                    && item.BookedFrom.HasValue
                    && item.BookedTo.HasValue
                    && item.Reservation != null);

            var cabinTypeCodes = NormalizeCodes(filter.CabinTypeCodes);
            if (cabinTypeCodes.Count > 0)
            {
                query = query.Where(item => item.Item!.CabinTypeCode != null
                    && cabinTypeCodes.Contains(item.Item.CabinTypeCode));
            }

            if (filter.CategoryIds != null && filter.CategoryIds.Count > 0)
            {
                query = query.Where(item => item.Item!.ItemCategoryId.HasValue
                    && filter.CategoryIds.Contains(item.Item.ItemCategoryId.Value));
            }

            if (filter.VehicleIds != null && filter.VehicleIds.Count > 0)
            {
                query = query.Where(item => filter.VehicleIds.Contains(item.ItemId!.Value));
            }

            if (filter.From.HasValue)
            {
                query = query.Where(item => item.BookedTo >= filter.From.Value);
            }

            if (filter.To.HasValue)
            {
                query = query.Where(item => item.BookedFrom <= filter.To.Value);
            }

            var reservationItems = await query
                .OrderBy(item => item.BookedFrom)
                .Select(item => new
                {
                    item.Id,
                    ReservationId = item.ReservationId,
                    ReservationEntityId = item.Reservation!.Id,
                    VehicleId = item.ItemId!.Value,
                    ReservationNr = item.Reservation!.ReservationNr,
                    Customer = item.Reservation.CustomerName,
                    DeliveryPlace = item.Reservation.DeliveryPlace,
                    item.BookedFrom,
                    item.BookedTo,
                    item.ActualFrom,
                    item.ActualTo,
                })
                .ToListAsync();

            var now = DateTime.Now;

            var reservations = reservationItems.Select(item => new PlanningReservationDto
            {
                Id = item.Id,
                ReservationId = item.ReservationId ?? item.ReservationEntityId,
                VehicleId = item.VehicleId,
                ReservationNr = item.ReservationNr,
                Customer = string.IsNullOrWhiteSpace(item.Customer)
                    ? $"Reservation {item.ReservationNr?.ToString() ?? item.Id.ToString()}"
                    : item.Customer,
                DeliveryPlace = item.DeliveryPlace ?? string.Empty,
                Start = item.BookedFrom,
                End = item.BookedTo,
                Status = ResolvePlanningReservationStatus(item.ActualFrom, item.ActualTo, item.BookedFrom, item.BookedTo, now),
            }).ToList();

            return Ok(reservations);
        }

        [HttpPut("reservations/{id:int}")]
        [Authorize]
        public async Task<ActionResult<UpdatePlanningReservationResponse>> UpdateReservation(
            int id,
            UpdatePlanningReservationRequest request,
            CancellationToken cancellationToken)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (request.End <= request.Start)
            {
                return BadRequest(new { message = "Sluttiden måste vara efter starttiden" });
            }

            var reservationItem = await _context.ReservationItems
                .Include(item => item.Item)
                .FirstOrDefaultAsync(item => item.Id == id && item.OfficeId == user.OfficeId, cancellationToken);
            if (reservationItem == null)
            {
                return NotFound(new { message = "Bokningen hittades inte" });
            }

            var currentItemTypeCode = string.IsNullOrWhiteSpace(reservationItem.Item?.ItemTypeCode)
                ? "VEHICLE"
                : reservationItem.Item.ItemTypeCode.Trim().ToUpper();

            var targetItem = await _context.Items.FirstOrDefaultAsync(item =>
                item.Id == request.VehicleId
                && item.OfficeId == user.OfficeId
                && item.ItemTypeCode.ToUpper() == currentItemTypeCode,
                cancellationToken);
            if (targetItem == null)
            {
                return BadRequest(new { message = "Objektet hittades inte eller är av fel typ" });
            }

            if ((currentItemTypeCode == "CABIN" || currentItemTypeCode == "LIFT") && reservationItem.ItemId != targetItem.Id)
            {
                reservationItem.BasePrice = targetItem.BasePrice;
                reservationItem.PricePerDay = targetItem.PricePerDay;
                reservationItem.PricePerWeek = targetItem.PricePerWeek;
                reservationItem.PricePerMonth = targetItem.PricePerMonth;
            }

            reservationItem.ItemId = request.VehicleId;
            reservationItem.BookedFrom = request.Start.DateTime;
            reservationItem.BookedTo = request.End.DateTime;
            await _context.SaveChangesAsync(cancellationToken);

            var status = ResolvePlanningReservationStatus(
                reservationItem.ActualFrom,
                reservationItem.ActualTo,
                reservationItem.BookedFrom,
                reservationItem.BookedTo,
                DateTime.Now);

            return Ok(new UpdatePlanningReservationResponse(status));
        }

        private static List<string> NormalizeCodes(List<string>? codes)
        {
            return codes?
                .Where(code => !string.IsNullOrWhiteSpace(code))
                .Select(code => code.Trim().ToUpper())
                .Distinct()
                .ToList() ?? [];
        }

        private static string ResolvePlanningReservationStatus(
            DateTime? actualFrom,
            DateTime? actualTo,
            DateTime? bookedFrom,
            DateTime? bookedTo,
            DateTime now)
        {
            if (!actualFrom.HasValue && bookedFrom.HasValue && bookedFrom.Value < now)
            {
                return "late_out";
            }

            if (!actualTo.HasValue && bookedTo.HasValue && bookedTo.Value < now)
            {
                return "late_in";
            }

            return actualFrom.HasValue ? "out" : "booked";
        }
    }
}
