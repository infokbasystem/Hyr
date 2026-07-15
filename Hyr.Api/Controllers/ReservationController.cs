using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Hyr.Api.Data;
using Hyr.Api.Models;
using Hyr.Api.Filters;
using Hyr.Api.Utils;
using Hyr.Api.Dtos;
using System.Linq.Expressions;
using System.Text.Json;


namespace Hyr.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReservationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ReservationController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<Reservation>>> GetReservations([FromQuery] ReservationFilter filter)
        {
            try
            {
                var userIdClaim = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                         ?? User?.FindFirst("sub")?.Value
                         ?? User?.FindFirst("id")?.Value;
                _ = int.TryParse(userIdClaim, out int userId);

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return Unauthorized(new { message = "User not found" });
                }

                var query = _context.Reservations
                    .Where(r => r.OfficeId == user.OfficeId);

                if (filter.ReservationNr.HasValue)
                {
                    query = query.Where(r => r.ReservationNr == filter.ReservationNr.Value);
                }

                var totalCount = await query.CountAsync();

                var totalRecords = await query.CountAsync();

                // Apply sorting (default to CreatedDate:desc if not specified)
                var sortBy = filter.SortBy ?? new[] { "CreatedDate:desc" };
                query = query.ApplyMultiSort(sortBy);

                var pagedQuery = await query
                    .Skip((filter.Page - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .ToListAsync();

                var result = new List<Reservation>();
                foreach (var r in pagedQuery)
                {
                    var reservation = new Reservation
                    {
                        Id = r.Id,
                        OfficeId = r.OfficeId,
                        CreatedByUserId = r.CreatedByUserId,
                        CreatedDate = r.CreatedDate,
                        ModifiedByUserId = r.ModifiedByUserId,
                        ModifiedDate = r.ModifiedDate,
                        ReservationNr = r.ReservationNr,
                        CustomerId = r.CustomerId,
                        StatusCode = r.StatusCode,
                        DriverMobilePhone = r.DriverMobilePhone,
                        DriverNote = r.DriverNote,
                        DriverLicenceNr = r.DriverLicenceNr,
                        DriverLicenceExpireDate = r.DriverLicenceExpireDate,
                        Orderer = r.Orderer,
                        CustomerName = r.CustomerName,
                        Address = r.Address,
                        ZipCode = r.ZipCode,
                        Email = r.Email,
                        MobilePhone = r.MobilePhone,
                        Reference = r.Reference,
                        Deposition = r.Deposition,
                        Note = r.Note,
                        DeliveryPlaceNote = r.DeliveryPlaceNote,
                        PickupPlaceNote = r.PickupPlaceNote,
                        IsOngoingInvoicing = r.IsOngoingInvoicing,
                        OngoingInvoicingInterval = r.OngoingInvoicingInterval
                    };
                    result.Add(reservation);
                }

                var totalPages = (int)Math.Ceiling((double)totalRecords / filter.PageSize);

                return new PagedResult<Reservation>
                {
                    Data = result,
                    TotalRecords = totalRecords,
                    Page = filter.Page,
                    PageSize = filter.PageSize,
                    TotalPages = totalPages,
                    HasNextPage = filter.Page < totalPages,
                    HasPreviousPage = filter.Page > 1
                };
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error retrieving reservations", error = ex.Message });
            }
        }

        [HttpPost("search")]
        [Authorize]
        public async Task<ActionResult<PagedResultDto<ReservationSearchRowDto>>> Search([FromBody] ReservationSearchRequestDto? request)
        {
            try
            {
                var userIdClaim = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                         ?? User?.FindFirst("sub")?.Value
                         ?? User?.FindFirst("id")?.Value;
                _ = int.TryParse(userIdClaim, out int userId);

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return Unauthorized(new { message = "User not found" });
                }

                request ??= new ReservationSearchRequestDto();
                var pagination = request.Pagination ?? new PaginationRequest();
                var filter = request.Filter ?? new FilterRequest();
                var sorts = request.Sorts ?? [];

                var query = _context.Reservations
                    .Where(r => r.OfficeId == user.OfficeId)
                    .AsQueryable();

                // Apply filters
                if (filter.Conditions != null)
                {
                    foreach (var condition in filter.Conditions)
                    {
                        query = ApplyFilterCondition(query, condition);
                    }
                }

                var totalCount = await query.CountAsync();
                var totalPages = (totalCount + pagination.PageSize - 1) / pagination.PageSize;

                // Apply sorting
                if (sorts.Any())
                {
                    foreach (var sort in sorts)
                    {
                        var isDescending = sort.Direction?.ToLower() == "desc";
                        query = ApplySorting(query, sort.Field, isDescending);
                    }
                }
                else
                {
                    query = query.OrderByDescending(r => r.Id);
                }

                var items = await query
                    .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                    .Take(pagination.PageSize)
                    .Select(r => new ReservationSearchRowDto(
                        r.Id,
                        r.ReservationNr,
                        r.CustomerName,
                        r.CreatedDate,
                        r.StatusCode,
                        r.Note,
                        r.Office != null ? r.Office.Name : null))
                    .ToListAsync();

                return Ok(new PagedResultDto<ReservationSearchRowDto>
                {
                    Items = items,
                    PageNumber = pagination.PageNumber,
                    PageSize = pagination.PageSize,
                    TotalCount = totalCount,
                    TotalPages = totalPages,
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error searching reservations", error = ex.Message });
            }
        }

        private IQueryable<Reservation> ApplyFilterCondition(IQueryable<Reservation> query, FilterConditionDto condition)
        {
            var field = condition.Field.ToLower();
            var op = condition.Operator.ToLower();

            // Handle free text search
            if (field == "freetext" && op == "contains" && condition.Value.HasValue)
            {
                var searchTerm = condition.Value.Value.GetString() ?? "";
                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    if (int.TryParse(searchTerm, out var reservationNr))
                    {
                        query = query.Where(r =>
                            r.CustomerName.Contains(searchTerm) ||
                            r.Note.Contains(searchTerm) ||
                            (r.ReservationNr.HasValue && r.ReservationNr.Value == reservationNr));
                    }
                    else
                    {
                        query = query.Where(r =>
                            r.CustomerName.Contains(searchTerm) ||
                            r.Note.Contains(searchTerm));
                    }
                }
            }

            // Handle standard searches
            if (field == "standardsearch" && op == "eq" && condition.Value.HasValue)
            {
                var searchValue = condition.Value.Value.GetString() ?? "";
                if (searchValue == "last-100-created")
                {
                    // Return last 100 created (no additional filter needed, handled in sorting)
                }
                else if (searchValue == "active-reservations")
                {
                    query = query.Where(r => r.StatusCode == "ACTIVE" || r.StatusCode == "BOOKED");
                }
            }

            if (field == "itemperiod" && op == "overlaps" && condition.Value.HasValue)
            {
                var periodFrom = TryReadDateProperty(condition.Value.Value, "from");
                var periodTo = TryReadDateProperty(condition.Value.Value, "to");
                var periodEndExclusive = periodTo?.Date.AddDays(1);

                if (periodFrom.HasValue || periodEndExclusive.HasValue)
                {
                    query = query.Where(r => r.ReservationItems.Any(item =>
                        ((item.BookedFrom.HasValue || item.BookedTo.HasValue)
                            && (!periodFrom.HasValue || (item.BookedTo ?? item.BookedFrom ?? DateTime.MinValue) >= periodFrom.Value)
                            && (!periodEndExclusive.HasValue || (item.BookedFrom ?? item.BookedTo ?? DateTime.MaxValue) < periodEndExclusive.Value))
                        ||
                        ((item.ActualFrom.HasValue || item.ActualTo.HasValue)
                            && (!periodFrom.HasValue || (item.ActualTo ?? item.ActualFrom ?? DateTime.MinValue) >= periodFrom.Value)
                            && (!periodEndExclusive.HasValue || (item.ActualFrom ?? item.ActualTo ?? DateTime.MaxValue) < periodEndExclusive.Value))));
                }
            }

            return query;
        }

        private static DateTime? TryReadDateProperty(JsonElement value, string propertyName)
        {
            if (value.ValueKind != JsonValueKind.Object || !value.TryGetProperty(propertyName, out var property))
            {
                return null;
            }

            if (property.ValueKind != JsonValueKind.String)
            {
                return null;
            }

            return DateTime.TryParse(property.GetString(), out var parsedDate)
                ? parsedDate.Date
                : null;
        }

        private IQueryable<Reservation> ApplySorting(IQueryable<Reservation> query, string field, bool isDescending)
        {
            var fieldLower = field.ToLower();

            var parameter = Expression.Parameter(typeof(Reservation), "r");
            Expression property = parameter;

            // Handle nested properties with dot notation
            if (fieldLower.Contains("."))
            {
                var parts = fieldLower.Split('.');
                foreach (var part in parts)
                {
                    property = Expression.Property(property, part);
                }
            }
            else
            {
                // Handle known fields
                property = fieldLower switch
                {
                    "id" => Expression.Property(parameter, nameof(Reservation.Id)),
                    "reservationnr" => Expression.Property(parameter, nameof(Reservation.ReservationNr)),
                    "customername" => Expression.Property(parameter, nameof(Reservation.CustomerName)),
                    "createddate" => Expression.Property(parameter, nameof(Reservation.CreatedDate)),
                    "statuscode" => Expression.Property(parameter, nameof(Reservation.StatusCode)),
                    "note" => Expression.Property(parameter, nameof(Reservation.Note)),
                    _ => Expression.Property(parameter, "Id"),
                };
            }

            var lambda = Expression.Lambda(property, parameter);

            var methodName = isDescending ? "OrderByDescending" : "OrderBy";
            var method = typeof(Queryable).GetMethods()
                .Single(m =>
                    m.Name == methodName &&
                    m.IsGenericMethodDefinition &&
                    m.GetGenericArguments().Length == 2 &&
                    m.GetParameters().Length == 2);

            var genericMethod = method.MakeGenericMethod(typeof(Reservation), property.Type);
            var result = genericMethod.Invoke(null, [query, lambda]);

            return (IQueryable<Reservation>)result!;
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<Reservation>> GetReservation(int id)
        {
            try
            {
                var userIdClaim = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                         ?? User?.FindFirst("sub")?.Value
                         ?? User?.FindFirst("id")?.Value;
                _ = int.TryParse(userIdClaim, out int userId);

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return Unauthorized(new { message = "User not found" });
                }

                var reservationInDb = await _context.Reservations
                    .Where(r => r.Id == id && r.OfficeId == user.OfficeId)
                    .Include(r => r.CreatedByUser)
                    .Include(r => r.ModifiedByUser)
                    .Include(r => r.Customer)
                    .Include(r => r.ReservationItems)
                        .ThenInclude(ri => ri.Item)
                    .Include(r => r.ReservationCalcs)
                        .ThenInclude(rc => rc.ReservationCalcItems)
                    .FirstOrDefaultAsync();

                if (reservationInDb == null)
                {
                    return NotFound(new { message = "Reservation not found" });
                }

                var reservation = new Reservation
                {
                    Id = reservationInDb.Id,
                    OfficeId = reservationInDb.OfficeId,
                    CreatedByUserId = reservationInDb.CreatedByUserId,
                    CreatedByUserName = reservationInDb.CreatedByUser != null ? reservationInDb.CreatedByUser.Name : string.Empty,
                    CreatedDate = reservationInDb.CreatedDate,
                    ModifiedByUserName = reservationInDb.ModifiedByUser != null ? reservationInDb.ModifiedByUser.Name : string.Empty,
                    ModifiedByUserId = reservationInDb.ModifiedByUserId,
                    ModifiedDate = reservationInDb.ModifiedDate,
                    Address = reservationInDb.Address,
                    CustomerId = reservationInDb.CustomerId,
                    CustomerName = reservationInDb.CustomerName,
                    DeliveryPlaceNote = reservationInDb.DeliveryPlaceNote,
                    Deposition = reservationInDb.Deposition,
                    DriverMobilePhone = reservationInDb.DriverMobilePhone,
                    DriverNote = reservationInDb.DriverNote,
                    DriverLicenceNr = reservationInDb.DriverLicenceNr,
                    DriverLicenceExpireDate = reservationInDb.DriverLicenceExpireDate,
                    Email = reservationInDb.Email,
                    IsOngoingInvoicing = reservationInDb.IsOngoingInvoicing,
                    MobilePhone = reservationInDb.MobilePhone,
                    Note = reservationInDb.Note,
                    OngoingInvoicingInterval = reservationInDb.OngoingInvoicingInterval,
                    Orderer = reservationInDb.Orderer,
                    PickupPlaceNote = reservationInDb.PickupPlaceNote,
                    Reference = reservationInDb.Reference,
                    ReservationNr = reservationInDb.ReservationNr,
                    StatusCode = reservationInDb.StatusCode,
                    ZipCode = reservationInDb.ZipCode,
                };

                foreach (var item in reservationInDb.ReservationItems)
                {
                    reservation.ReservationItems.Add(new ReservationItem
                    {
                        Id = item.Id,
                        OfficeId = item.OfficeId,
                        AbroadOk = item.AbroadOk,
                        ActualFrom = item.ActualFrom,
                        ActualTo = item.ActualTo,
                        BookedFrom = item.BookedFrom,
                        BookedTo = item.BookedTo,
                        DebitCategoryId = item.DebitCategoryId,
                        DeliveryPlaceNote = item.DeliveryPlaceNote,
                        EvProlonging = item.EvProlonging,
                        FuelLitres = item.FuelLitres,
                        FuelUnitPrice = item.FuelUnitPrice,
                        InsuranceCompanyId = item.InsuranceCompanyId,
                        InsuranceCounterpartRegNr = item.InsuranceCounterpartRegNr,
                        InsuranceCustomerIsCause = item.InsuranceCustomerIsCause,
                        InsuranceCustomerRegNr = item.InsuranceCustomerRegNr,
                        InsuranceDamageDate = item.InsuranceDamageDate,
                        InsuranceDamageNr = item.InsuranceDamageNr,
                        InsuranceIsManualCalc = item.InsuranceIsManualCalc,
                        InsuranceIsSjalvriskReduction = item.InsuranceIsSjalvriskReduction,
                        InsuranceManualCalcPercentSek = item.InsuranceManualCalcPercentSek,
                        InsuranceManualMaxCompensationDays = item.InsuranceManualMaxCompensationDays,
                        InsuranceManualShareKm = item.InsuranceManualShareKm,
                        InsuranceManualShareRent = item.InsuranceManualShareRent,
                        InsuranceManualShareVat = item.InsuranceManualShareVat,
                        InsuranceManulaMaxCompensationCost = item.InsuranceManulaMaxCompensationCost,
                        InsuranceMaxAllowedCompensationCost = item.InsuranceMaxAllowedCompensationCost,
                        InsuranceMaxAllowedCompensationDays = item.InsuranceMaxAllowedCompensationDays,
                        InsuranceSjalvriskDayCost = item.InsuranceSjalvriskDayCost,
                        IsCheckedIn = item.IsCheckedIn,
                        IsInsurance = item.IsInsurance,
                        ItemId = item.ItemId,
                        ItemTypeCode = item.ItemTypeCode,
                        KmIn = item.KmIn,
                        KmOut = item.KmOut,
                        NotRebookable = item.NotRebookable,
                        PickupPlaceNote = item.PickupPlaceNote,
                        ReservationId = item.ReservationId,
                        SortNr = item.SortNr,
                        Item = item.Item != null ? new Item
                        {
                            Id = item.Item.Id,
                            RegNr = item.Item.RegNr,
                            MachineNr = item.Item.MachineNr,
                        } : null
                    });
                }

                foreach (var calc in reservationInDb.ReservationCalcs)
                {
                    var reservationCalc = new ReservationCalc
                    {
                        Id = calc.Id,
                        ReservationId = calc.ReservationId,
                        DateTimeFrom = calc.DateTimeFrom,
                        DateTimeTo = calc.DateTimeTo
                    };

                    foreach (var calcItem in calc.ReservationCalcItems)
                    {
                        reservationCalc.ReservationCalcItems.Add(new ReservationCalcItem
                        {
                            Id = calcItem.Id,
                            ReservationCalcId = calcItem.ReservationCalcId,
                            ItemId = calcItem.ItemId,
                            PriceListId = calcItem.PriceListId,
                            Qty = calcItem.Qty,
                            Sum = calcItem.Sum,
                            Text = calcItem.Text
                        });
                    }

                    reservation.ReservationCalcs.Add(reservationCalc);
                }

                return Ok(reservation);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error retrieving reservation", error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<Reservation>> PostReservation(Reservation reservation)
        {
            try
            {
                var userIdClaim = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                                 ?? User?.FindFirst("sub")?.Value
                                 ?? User?.FindFirst("id")?.Value;
                _ = int.TryParse(userIdClaim, out int userId);

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return Unauthorized(new { message = "User not found" });
                }

                Reservation? reservationInDb = null;

                if (reservation.Id == 0)
                {
                    int reservationNr = (await _context.Reservations
                        .Where(r => r.OfficeId == user.OfficeId)
                        .MaxAsync(r => (int?)r.ReservationNr) ?? 0) + 1;
                    reservationInDb = new Reservation
                    {
                        OfficeId = user.OfficeId,
                        CreatedByUserId = user.Id,
                        CreatedDate = DateTime.UtcNow,
                        ReservationNr = reservationNr
                    };
                    _context.Reservations.Add(reservationInDb);
                }
                else
                {
                    reservationInDb = await _context.Reservations.FindAsync(reservation.Id);
                    if (reservationInDb == null)
                    {
                        return NotFound(new { message = "Reservation not found" });
                    }
                    if (reservationInDb.OfficeId != user.OfficeId)
                    {
                        return Forbid();
                    }

                }

                reservationInDb.ModifiedByUserId = user.Id;
                reservationInDb.ModifiedDate = DateTime.UtcNow;
                reservationInDb.CustomerId = reservation.CustomerId;
                reservationInDb.StatusCode = reservation.StatusCode;
                reservationInDb.DriverMobilePhone = reservation.DriverMobilePhone;
                reservationInDb.DriverNote = reservation.DriverNote;
                reservationInDb.DriverLicenceNr = reservation.DriverLicenceNr;
                reservationInDb.DriverLicenceExpireDate = reservation.DriverLicenceExpireDate;
                reservationInDb.Orderer = reservation.Orderer;
                reservationInDb.CustomerName = reservation.CustomerName;
                reservationInDb.Address = reservation.Address;
                reservationInDb.ZipCode = reservation.ZipCode;
                reservationInDb.Email = reservation.Email;
                reservationInDb.MobilePhone = reservation.MobilePhone;
                reservationInDb.Reference = reservation.Reference;
                reservationInDb.Deposition = reservation.Deposition;
                reservationInDb.Note = reservation.Note;
                reservationInDb.DeliveryPlaceNote = reservation.DeliveryPlaceNote;
                reservationInDb.PickupPlaceNote = reservation.PickupPlaceNote;
                reservationInDb.IsOngoingInvoicing = reservation.IsOngoingInvoicing;
                reservationInDb.OngoingInvoicingInterval = reservation.OngoingInvoicingInterval;

                // Handle ReservationItems
                var existingReservationItemIds = reservationInDb.ReservationItems.Select(ri => ri.Id).ToList();
                var incomingReservationItemIds = reservation.ReservationItems.Select(ri => ri.Id).ToList();
                var reservationItemsToRemove = existingReservationItemIds.Except(incomingReservationItemIds).ToList();
                foreach (var reservationItemId in reservationItemsToRemove)
                {
                    var reservationItemToRemove = reservationInDb.ReservationItems.FirstOrDefault(ri => ri.Id == reservationItemId);
                    if (reservationItemToRemove != null)
                    {
                        _context.ReservationItems.Remove(reservationItemToRemove);
                    }
                }
                foreach (var reservationItem in reservation.ReservationItems)
                {
                    ReservationItem? reservationItemInDb = null;
                    if (reservationItem.Id == 0)
                    {
                        reservationItemInDb = new ReservationItem();
                        reservationItemInDb.OfficeId = user.OfficeId;
                        reservationItemInDb.Reservation = reservationInDb;
                        _context.ReservationItems.Add(reservationItemInDb);
                    }
                    else
                    {
                        reservationItemInDb = await _context.ReservationItems.FindAsync(reservationItem.Id);
                        if (reservationItemInDb == null)
                        {
                            return NotFound(new { message = $"ReservationItem with Id {reservationItem.Id} not found" });
                        }
                    }
                    reservationItemInDb.AbroadOk = reservationItem.AbroadOk;
                    reservationItemInDb.ActualFrom = reservationItem.ActualFrom;
                    reservationItemInDb.ActualTo = reservationItem.ActualTo;
                    reservationItemInDb.BookedFrom = reservationItem.BookedFrom;
                    reservationItemInDb.BookedTo = reservationItem.BookedTo;
                    reservationItemInDb.DebitCategoryId = reservationItem.DebitCategoryId;
                    reservationItemInDb.DeliveryPlaceNote = reservationItem.DeliveryPlaceNote;
                    reservationItemInDb.EvProlonging = reservationItem.EvProlonging;
                    reservationItemInDb.FuelLitres = reservationItem.FuelLitres;
                    reservationItemInDb.FuelUnitPrice = reservationItem.FuelUnitPrice;
                    reservationItemInDb.InsuranceCompanyId = reservationItem.InsuranceCompanyId;
                    reservationItemInDb.InsuranceCounterpartRegNr = reservationItem.InsuranceCounterpartRegNr;
                    reservationItemInDb.InsuranceCustomerIsCause = reservationItem.InsuranceCustomerIsCause;
                    reservationItemInDb.InsuranceCustomerRegNr = reservationItem.InsuranceCustomerRegNr;
                    reservationItemInDb.InsuranceDamageDate = reservationItem.InsuranceDamageDate;
                    reservationItemInDb.InsuranceDamageNr = reservationItem.InsuranceDamageNr;
                    reservationItemInDb.InsuranceIsManualCalc = reservationItem.InsuranceIsManualCalc;
                    reservationItemInDb.InsuranceIsSjalvriskReduction = reservationItem.InsuranceIsSjalvriskReduction;
                    reservationItemInDb.InsuranceManualCalcPercentSek = reservationItem.InsuranceManualCalcPercentSek;
                    reservationItemInDb.InsuranceManualMaxCompensationDays = reservationItem.InsuranceManualMaxCompensationDays;
                    reservationItemInDb.InsuranceManualShareKm = reservationItem.InsuranceManualShareKm;
                    reservationItemInDb.InsuranceManualShareRent = reservationItem.InsuranceManualShareRent;
                    reservationItemInDb.InsuranceManualShareVat = reservationItem.InsuranceManualShareVat;
                    reservationItemInDb.InsuranceManulaMaxCompensationCost = reservationItem.InsuranceManulaMaxCompensationCost;
                    reservationItemInDb.InsuranceMaxAllowedCompensationCost = reservationItem.InsuranceMaxAllowedCompensationCost;
                    reservationItemInDb.InsuranceMaxAllowedCompensationDays = reservationItem.InsuranceMaxAllowedCompensationDays;
                    reservationItemInDb.InsuranceSjalvriskDayCost = reservationItem.InsuranceSjalvriskDayCost;
                    reservationItemInDb.IsCheckedIn = reservationItem.IsCheckedIn;
                    reservationItemInDb.IsInsurance = reservationItem.IsInsurance;
                    reservationItemInDb.ItemId = reservationItem.ItemId;
                    reservationItemInDb.ItemTypeCode = reservationItem.ItemTypeCode;
                    reservationItemInDb.KmIn = reservationItem.KmIn;
                    reservationItemInDb.KmOut = reservationItem.KmOut;
                    reservationItemInDb.NotRebookable = reservationItem.NotRebookable;
                    reservationItemInDb.PickupPlaceNote = reservationItem.PickupPlaceNote;
                    reservationItemInDb.SortNr = reservationItem.SortNr;
                }

                // Handle ReservationCalcs
                var existingReservationCalcIds = reservationInDb.ReservationCalcs.Select(rc => rc.Id).ToList();
                var incomingReservationCalcIds = reservation.ReservationCalcs.Select(rc => rc.Id).ToList();
                var reservationCalcsToRemove = existingReservationCalcIds.Except(incomingReservationCalcIds).ToList();
                foreach (var reservationCalcId in reservationCalcsToRemove)
                {
                    var reservationCalcToRemove = reservationInDb.ReservationCalcs.FirstOrDefault(rc => rc.Id == reservationCalcId);
                    if (reservationCalcToRemove != null)
                    {
                        _context.ReservationCalcs.Remove(reservationCalcToRemove);
                    }
                }
                foreach (var reservationCalc in reservation.ReservationCalcs)
                {
                    ReservationCalc? reservationCalcInDb = null;
                    if (reservationCalc.Id == 0)
                    {
                        reservationCalcInDb = new ReservationCalc();
                        reservationCalcInDb.OfficeId = user.OfficeId;
                        reservationCalcInDb.Reservation = reservationInDb;
                        _context.ReservationCalcs.Add(reservationCalcInDb);
                    }
                    else
                    {
                        reservationCalcInDb = await _context.ReservationCalcs.FindAsync(reservationCalc.Id);
                        if (reservationCalcInDb == null)
                        {
                            return NotFound(new { message = $"ReservationCalc with Id {reservationCalc.Id} not found" });
                        }
                    }
                    reservationCalcInDb.DateTimeFrom = reservationCalc.DateTimeFrom;
                    reservationCalcInDb.DateTimeTo = reservationCalc.DateTimeTo;
                    // Handle ReservationCalcItems
                    var existingReservationCalcItemIds = reservationCalcInDb.ReservationCalcItems.Select(rci => rci.Id).ToList();
                    var incomingReservationCalcItemIds = reservationCalc.ReservationCalcItems.Select(rci => rci.Id).ToList();
                    var reservationCalcItemsToRemove = existingReservationCalcItemIds.Except(incomingReservationCalcItemIds).ToList();
                    foreach (var reservationCalcItemId in reservationCalcItemsToRemove)
                    {
                        var reservationCalcItemToRemove = reservationCalcInDb.ReservationCalcItems.FirstOrDefault(rci => rci.Id == reservationCalcItemId);
                        if (reservationCalcItemToRemove != null)
                        {
                            _context.ReservationCalcItems.Remove(reservationCalcItemToRemove);
                        }
                    }
                    foreach (var reservationCalcItem in reservationCalc.ReservationCalcItems)
                    {
                        ReservationCalcItem? reservationCalcItemInDb = null;
                        if (reservationCalcItem.Id == 0)
                        {
                            reservationCalcItemInDb = new ReservationCalcItem();
                            reservationCalcItemInDb.ReservationCalc = reservationCalcInDb;
                            _context.ReservationCalcItems.Add(reservationCalcItemInDb);
                        }
                        else
                        {
                            reservationCalcItemInDb = await _context.ReservationCalcItems.FindAsync(reservationCalcItem.Id);
                            if (reservationCalcItemInDb == null)
                            {
                                return NotFound(new { message = $"ReservationCalcItem with Id {reservationCalcItem.Id} not found" });
                            }
                        }
                        reservationCalcItemInDb.ItemId = reservationCalcItem.ItemId;
                        reservationCalcItemInDb.PriceListId = reservationCalcItem.PriceListId;
                        reservationCalcItemInDb.Qty = reservationCalcItem.Qty;
                        reservationCalcItemInDb.Sum = reservationCalcItem.Sum;
                        reservationCalcItemInDb.Text = reservationCalcItem.Text;
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(reservationInDb.Id);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Invalid invoice data", error = ex.Message });
            }
        }
    }
}