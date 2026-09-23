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
        public async Task<ActionResult<List<PlanningCategoryOptionDto>>> GetCategories()
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var categories = await _context.ItemCategories
                .AsNoTracking()
                .Where(ic => ic.OfficeId == user.OfficeId)
                .OrderBy(ic => ic.Name)
                .Select(ic => new PlanningCategoryOptionDto
                {
                    Id = ic.Id,
                    Name = ic.Name,
                })
                .ToListAsync();

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
                .OrderBy(i => i.ItemCategory != null ? i.ItemCategory.Name : string.Empty)
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
                })
                .ToListAsync();

            return Ok(vehicles);
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

            var query = _context.ReservationItems
                .AsNoTracking()
                .Where(item => item.OfficeId == user.OfficeId
                    && item.ItemId.HasValue
                    && item.BookedFrom.HasValue
                    && item.BookedTo.HasValue
                    && item.Reservation != null);

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
                .FirstOrDefaultAsync(item => item.Id == id && item.OfficeId == user.OfficeId, cancellationToken);
            if (reservationItem == null)
            {
                return NotFound(new { message = "Bokningen hittades inte" });
            }

            var vehicleExists = await _context.Items.AnyAsync(item =>
                item.Id == request.VehicleId
                && item.OfficeId == user.OfficeId
                && item.ItemTypeCode.ToUpper() == "VEHICLE",
                cancellationToken);
            if (!vehicleExists)
            {
                return BadRequest(new { message = "Fordonet hittades inte" });
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
