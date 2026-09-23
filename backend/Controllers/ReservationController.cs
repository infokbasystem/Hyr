using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Backend.Data;
using Backend.Models;
using Backend.Filters;
using Backend.Services;
using Backend.Utils;
using Backend.Dtos;
using System.Linq.Expressions;
using System.Text.Json;


namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReservationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ReservationController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpPost("search")]
        [Authorize]
        public async Task<ActionResult<PagedResultDto<ReservationSearchRowDto>>> Search([FromBody] ReservationSearchRequestDto? request)
        {
            try
            {
                var user = await _currentUserService.GetCurrentUserAsync(User);
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

                var reservationRows = await query
                    .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                    .Take(pagination.PageSize)
                    .Select(r => new
                    {
                        r.Id,
                        r.ReservationNr,
                        r.CustomerName,
                        StartDate = r.ReservationItems
                            .Where(item => item.BookedFrom.HasValue)
                            .Min(item => item.BookedFrom),
                        EndDate = r.ReservationItems
                            .Where(item => item.BookedTo.HasValue)
                            .Max(item => item.BookedTo),
                        r.StatusCode,
                        r.Note,
                        ItemNumbers = r.ReservationItems
                            .Where(item => item.Item != null && !string.IsNullOrWhiteSpace(item.Item.ItemNr))
                            .Select(item => item.Item!.ItemNr)
                            .ToList(),
                    })
                    .ToListAsync();

                var items = reservationRows
                    .Select(row => new ReservationSearchRowDto(
                        row.Id,
                        row.ReservationNr,
                        row.CustomerName,
                        row.StartDate,
                        row.EndDate,
                        row.StatusCode,
                        row.Note,
                        string.Join(", ", row.ItemNumbers.Select(itemNumber => itemNumber.Trim()))))
                    .ToList();

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

        [HttpPost("to-be-invoiced")]
        [Authorize]
        public async Task<ActionResult<PagedResultDto<ToBeInvoicedRowDto>>> GetToBeInvoiced([FromBody] ToBeInvoicedSearchRequestDto? request)
        {
            try
            {
                var user = await _currentUserService.GetCurrentUserAsync(User);
                if (user == null)
                {
                    return Unauthorized(new { message = "User not found" });
                }

                request ??= new ToBeInvoicedSearchRequestDto();
                var pagination = request.Pagination ?? new PaginationRequest();
                var filter = request.Filter ?? new FilterRequest();
                var sorts = request.Sorts ?? [];
                var mode = string.IsNullOrWhiteSpace(request.Mode) ? "RETURNED" : request.Mode.Trim().ToUpperInvariant();

                var query = _context.Reservations
                    .Where(r => r.OfficeId == user.OfficeId)
                    .AsQueryable();

                if (filter.Conditions != null)
                {
                    foreach (var condition in filter.Conditions)
                    {
                        query = ApplyFilterCondition(query, condition);
                    }
                }

                var reservations = await query
                    .Include(r => r.Office)
                    .Include(r => r.ReservationItems)
                        .ThenInclude(reservationItem => reservationItem.Item)
                    .Include(r => r.ReservationCalcs)
                        .ThenInclude(calc => calc.ReservationCalcItems)
                            .ThenInclude(calcItem => calcItem.InvoiceRows)
                    .AsNoTracking()
                    .ToListAsync();

                var categoryNamesById = await _context.ItemCategories
                    .Where(c => c.OfficeId == user.OfficeId)
                    .ToDictionaryAsync(c => c.Id, c => c.Name);

                var rows = new List<ToBeInvoicedRowDto>();

                foreach (var reservation in reservations)
                {
                    var items = reservation.ReservationItems ?? new List<ReservationItem>();
                    var calcs = reservation.ReservationCalcs ?? new List<ReservationCalc>();

                    var outstandingPayers = ReservationStatusCodes.ResolveOutstandingPayers(items, calcs, categoryNamesById);

                    if (mode == "RETURNED" && reservation.StatusCode != ReservationStatusCodes.Returned)
                    {
                        continue;
                    }

                    if (mode == "PERIOD" && (!reservation.IsOngoingInvoicing || reservation.StatusCode != ReservationStatusCodes.Active))
                    {
                        continue;
                    }

                    var startDate = items
                        .Select(item => item.BookedFrom ?? item.ActualFrom)
                        .Where(value => value.HasValue)
                        .Select(value => value!.Value)
                        .DefaultIfEmpty()
                        .Min();
                    var endDate = items
                        .Select(item => item.BookedTo ?? item.ActualTo)
                        .Where(value => value.HasValue)
                        .Select(value => value!.Value)
                        .DefaultIfEmpty()
                        .Max();

                    var itemNames = items
                        .Select(item => GetReservationItemDisplayName(item))
                        .Where(name => !string.IsNullOrWhiteSpace(name))
                        .ToList();

                    rows.Add(new ToBeInvoicedRowDto(
                        reservation.Id,
                        reservation.ReservationNr,
                        reservation.CustomerName,
                        startDate == default ? null : startDate,
                        endDate == default ? null : endDate,
                        reservation.StatusCode,
                        reservation.Office?.Name,
                        reservation.Note,
                        outstandingPayers,
                        string.Join(", ", itemNames)));
                }

                var totalCount = rows.Count;
                var totalPages = (totalCount + pagination.PageSize - 1) / pagination.PageSize;

                var sortedRows = ApplyToBeInvoicedSorting(rows, sorts);

                var pagedItems = sortedRows
                    .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                    .Take(pagination.PageSize)
                    .ToList();

                return Ok(new PagedResultDto<ToBeInvoicedRowDto>
                {
                    Items = pagedItems,
                    PageNumber = pagination.PageNumber,
                    PageSize = pagination.PageSize,
                    TotalCount = totalCount,
                    TotalPages = totalPages,
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error searching reservations to invoice", error = ex.Message });
            }
        }

        private static string GetReservationItemDisplayName(ReservationItem item)
        {
            return item.Item?.ItemNr?.Trim() ?? string.Empty;
        }

        private static List<ToBeInvoicedRowDto> ApplyToBeInvoicedSorting(List<ToBeInvoicedRowDto> rows, List<SortRequest> sorts)
        {
            if (sorts.Count == 0)
            {
                return rows.OrderByDescending(row => row.Id).ToList();
            }

            IOrderedEnumerable<ToBeInvoicedRowDto>? ordered = null;

            foreach (var sort in sorts)
            {
                var isDescending = string.Equals(sort.Direction, "desc", StringComparison.OrdinalIgnoreCase);

                Func<ToBeInvoicedRowDto, object?> keySelector = sort.Field.ToLower() switch
                {
                    "reservationnr" => row => row.ReservationNr,
                    "customername" => row => row.CustomerName,
                    "startdate" => row => row.StartDate,
                    "enddate" => row => row.EndDate,
                    "statuscode" => row => row.StatusCode,
                    "officelocation" => row => row.OfficeLocation,
                    "note" => row => row.Note,
                    _ => row => row.Id,
                };

                ordered = ordered == null
                    ? (isDescending ? rows.OrderByDescending(keySelector) : rows.OrderBy(keySelector))
                    : (isDescending ? ordered.ThenByDescending(keySelector) : ordered.ThenBy(keySelector));
            }

            return (ordered ?? rows.OrderByDescending(row => row.Id)).ToList();
        }

        [HttpGet("in-out")]
        [Authorize]
        public async Task<ActionResult<IReadOnlyCollection<ReservationInOutEventDto>>> GetInOutEvents()
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var reservations = await _context.Reservations
                .AsNoTracking()
                .Where(reservation => reservation.OfficeId == user.OfficeId)
                .Include(reservation => reservation.ReservationItems)
                    .ThenInclude(reservationItem => reservationItem.Item)
                        .ThenInclude(item => item!.ItemCategory)
                .ToListAsync();

            var events = new List<ReservationInOutEventDto>();
            foreach (var reservation in reservations)
            {
                var items = reservation.ReservationItems
                    .Where(item => item.Item != null)
                    .OrderBy(item => item.SortNr)
                    .ToList();

                AddInOutEvent(events, reservation, items, "delivery");
                AddInOutEvent(events, reservation, items, "return");
            }

            return Ok(events.OrderBy(item => item.Date).ThenBy(item => item.ReservationId).ToList());
        }

        private static void AddInOutEvent(
            ICollection<ReservationInOutEventDto> events,
            Reservation reservation,
            IReadOnlyCollection<ReservationItem> reservationItems,
            string type)
        {
            var incompleteItems = type == "delivery"
                ? reservationItems.Where(item => item.BookedFrom.HasValue && !item.ActualFrom.HasValue).ToList()
                : reservationItems.Where(item => item.BookedTo.HasValue && item.ActualFrom.HasValue && !item.ActualTo.HasValue).ToList();

            if (incompleteItems.Count == 0)
            {
                return;
            }

            var date = type == "delivery"
                ? incompleteItems.Min(item => item.BookedFrom!.Value)
                : incompleteItems.Max(item => item.BookedTo!.Value);

            events.Add(new ReservationInOutEventDto
            {
                Key = $"{reservation.Id}-{type}",
                ReservationId = reservation.Id,
                ReservationNr = reservation.ReservationNr,
                Type = type,
                Date = date,
                Customer = reservation.CustomerName,
                Phone = string.IsNullOrWhiteSpace(reservation.MobilePhone)
                    ? reservation.TelephoneWorkplace
                    : reservation.MobilePhone,
                Email = reservation.Email,
                Category = string.Join(", ", incompleteItems
                    .Select(item => item.Item?.ItemCategory?.Name)
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Distinct()
                    .OrderBy(name => name)),
                Items = incompleteItems
                    .Select(item => string.IsNullOrWhiteSpace(item.Item?.ItemNr)
                        ? item.Item?.RegNr ?? "Hyresobjekt"
                        : item.Item.ItemNr)
                    .Distinct()
                    .ToList(),
                InternalNote = reservation.Note,
                ExternalNote = reservation.NoteExternal,
                Start = incompleteItems.Min(item => item.BookedFrom),
                End = incompleteItems.Max(item => item.BookedTo),
            });
        }

        [HttpGet("form-options")]
        [Authorize]
        public async Task<ActionResult<ReservationFormOptionsDto>> GetFormOptions()
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (!user.OfficeId.HasValue)
            {
                return BadRequest(new { message = "User has no office" });
            }

            var officeId = user.OfficeId.Value;
            var office = await _context.Offices
                .AsNoTracking()
                .Where(candidate => candidate.Id == officeId)
                .Select(candidate => new
                {
                    candidate.DefaultBookedFromTime,
                    candidate.DefaultBookedToTime,
                })
                .FirstOrDefaultAsync();

            if (office == null)
            {
                return BadRequest(new { message = "Office not found" });
            }

            var itemTypes = await _context.ItemTypes
                .Where(itemType => itemType.OfficeItemTypes.Any(officeItemType => officeItemType.OfficeId == officeId))
                .OrderBy(itemType => itemType.Name)
                .Select(itemType => new ItemTypeOptionDto
                {
                    Id = itemType.Id,
                    Code = itemType.Code,
                    Name = itemType.Name,
                })
                .ToListAsync();

            var itemCategories = await _context.ItemCategories
                .Where(itemCategory => itemCategory.OfficeId == officeId)
                .AsNoTracking()
                .OrderBy(itemCategory => itemCategory.Name)
                .Select(itemCategory => new ItemCategoryOptionDto
                {
                    Id = itemCategory.Id,
                    Name = itemCategory.Name,
                })
                .ToListAsync();

            var priceLists = await _context.PriceLists
                .Where(priceList => priceList.OfficeId == officeId && priceList.IsActive)
                .AsNoTracking()
                .OrderBy(priceList => priceList.Priority)
                .ThenBy(priceList => priceList.Name)
                .Select(priceList => new PriceListOptionDto
                {
                    Id = priceList.Id,
                    Name = priceList.Name,
                })
                .ToListAsync();

            return Ok(new ReservationFormOptionsDto
            {
                ItemTypes = itemTypes,
                ItemCategories = itemCategories,
                PriceLists = priceLists,
                DefaultBookedFromTime = office.DefaultBookedFromTime ?? string.Empty,
                DefaultBookedToTime = office.DefaultBookedToTime ?? string.Empty,
            });
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
                var user = await _currentUserService.GetCurrentUserAsync(User);
                if (user == null)
                {
                    return Unauthorized(new { message = "User not found" });
                }

                var reservationInDb = await _context.Reservations
                    .Where(r => r.Id == id && r.OfficeId == user.OfficeId)
                    .Include(r => r.CreatedByUser)
                    .Include(r => r.ModifiedByUser)
                    .Include(r => r.Customer)
                    .FirstOrDefaultAsync();

                if (reservationInDb == null)
                {
                    return NotFound(new { message = "Reservation not found" });
                }

                await _context.Entry(reservationInDb)
                    .Collection(r => r.ReservationItems)
                    .Query()
                    .Include(ri => ri.Item)
                    .LoadAsync();

                await _context.Entry(reservationInDb)
                    .Collection(r => r.ReservationCalcs)
                    .Query()
                    .Include(rc => rc.ReservationCalcItems)
                        .ThenInclude(rci => rci.InvoiceRows!)
                            .ThenInclude(ir => ir.Invoice)
                    .LoadAsync();

                var categoryNamesById = await _context.ItemCategories
                    .Where(c => c.OfficeId == user.OfficeId)
                    .ToDictionaryAsync(c => c.Id, c => c.Name);

                var modelNamesById = await _context.ItemModels
                    .Where(m => m.OfficeId == user.OfficeId)
                    .ToDictionaryAsync(m => m.Id, m => m.Name);

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
                    PriceListId = reservationInDb.PriceListId,
                    DeliveryPlace = reservationInDb.DeliveryPlace,
                    CustomerMarking = reservationInDb.CustomerMarking,
                    DriverName = reservationInDb.DriverName,
                    PickUpBy = reservationInDb.PickUpBy,
                    TelephoneWorkplace = reservationInDb.TelephoneWorkplace,
                    DriverMobilePhone = reservationInDb.DriverMobilePhone,
                    DriverNote = reservationInDb.DriverNote,
                    DriverLicenceNr = reservationInDb.DriverLicenceNr,
                    DriverLicenceExpireDate = reservationInDb.DriverLicenceExpireDate,
                    Email = reservationInDb.Email,
                    IsOngoingInvoicing = reservationInDb.IsOngoingInvoicing,
                    MobilePhone = reservationInDb.MobilePhone,
                    Note = reservationInDb.Note,
                    NoteExternal = reservationInDb.NoteExternal,
                    OngoingInvoicingInterval = reservationInDb.OngoingInvoicingInterval,
                    PricingCalendarCode = ReservationPricingCalendarCodes.NormalizeOrDefault(reservationInDb.PricingCalendarCode),
                    Orderer = reservationInDb.Orderer,
                    PickupPlaceNote = reservationInDb.PickupPlaceNote,
                    Reference = reservationInDb.Reference,
                    ReservationNr = reservationInDb.ReservationNr,
                    StatusCode = reservationInDb.StatusCode,
                    ZipCode = reservationInDb.ZipCode,
                };

                foreach (var item in reservationInDb.ReservationItems)
                {
                    var categoryName = string.Empty;
                    if (item.Item?.ItemCategoryId is int itemCategoryId && categoryNamesById.TryGetValue(itemCategoryId, out var resolvedCategoryName))
                    {
                        categoryName = resolvedCategoryName;
                    }

                    var modelName = string.Empty;
                    if (item.Item?.ItemModelId is int itemModelId && modelNamesById.TryGetValue(itemModelId, out var resolvedModelName))
                    {
                        modelName = resolvedModelName;
                    }

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
                        RegNr = item.Item?.RegNr ?? string.Empty,
                        Category = categoryName,
                        ItemName = item.Item?.ItemNr ?? string.Empty,
                        ItemNote = item.Item?.Note ?? string.Empty,
                        Manufacturer = item.Item?.Manufacturer ?? string.Empty,
                        Model = modelName,
                        YearModel = item.Item?.YearModel ?? string.Empty,
                        ReservationId = item.ReservationId,
                        SortNr = item.SortNr,
                        Item = item.Item != null ? new Item
                        {
                            Id = item.Item.Id,
                            ItemNr = item.Item.ItemNr,
                            Note = item.Item.Note,
                            RegNr = item.Item.RegNr,
                            Manufacturer = item.Item.Manufacturer,
                            YearModel = item.Item.YearModel,
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
                        DateTimeTo = calc.DateTimeTo,
                        ReceiverTypeCode = ReceiverTypeCodes.NormalizeOrDefault(calc.ReceiverTypeCode)
                    };

                    foreach (var calcItem in calc.ReservationCalcItems)
                    {
                        var mappedCalcItem = new ReservationCalcItem
                        {
                            Id = calcItem.Id,
                            ReservationCalcId = calcItem.ReservationCalcId,
                            ItemId = calcItem.ItemId,
                            PriceListId = calcItem.PriceListId,
                            VatId = calcItem.VatId,
                            VatRate = calcItem.VatRate,
                            Qty = calcItem.Qty,
                            UnitPrice = calcItem.UnitPrice,
                            Sum = calcItem.Sum,
                            CalcPriceTypeCode = CalcPriceTypeCodes.NormalizeOrDefault(calcItem.CalcPriceTypeCode),
                            Text = calcItem.Text
                        };

                        foreach (var invoiceRow in calcItem.InvoiceRows ?? Enumerable.Empty<InvoiceRow>())
                        {
                            mappedCalcItem.InvoiceRows?.Add(new InvoiceRow
                            {
                                Id = invoiceRow.Id,
                                InvoiceId = invoiceRow.InvoiceId,
                                ReservationCalcItemId = invoiceRow.ReservationCalcItemId,
                                InvoiceRowType = invoiceRow.InvoiceRowType,
                                Text1 = invoiceRow.Text1,
                                Text2 = invoiceRow.Text2,
                                Qty = invoiceRow.Qty,
                                UnitPrice = invoiceRow.UnitPrice,
                                Sum = invoiceRow.Sum,
                                VatRate = invoiceRow.VatRate,
                                Invoice = invoiceRow.Invoice == null
                                    ? null
                                    : new Invoice
                                    {
                                        Id = invoiceRow.Invoice.Id,
                                        InvoiceNr = invoiceRow.Invoice.InvoiceNr,
                                        InvoiceDate = invoiceRow.Invoice.InvoiceDate,
                                        CustomerName = invoiceRow.Invoice.CustomerName,
                                        InvoiceType = invoiceRow.Invoice.InvoiceType,
                                        TotExVat = invoiceRow.Invoice.TotExVat,
                                        TotVat = invoiceRow.Invoice.TotVat,
                                        TotSum = invoiceRow.Invoice.TotSum,
                                        IsCancelled = invoiceRow.Invoice.IsCancelled,
                                    }
                            });
                        }

                        reservationCalc.ReservationCalcItems.Add(mappedCalcItem);
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

        [HttpDelete("{id:int}")]
        [Authorize]
        public async Task<IActionResult> DeleteReservation(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var reservation = await _context.Reservations
                .FirstOrDefaultAsync(candidate => candidate.Id == id && candidate.OfficeId == user.OfficeId);
            if (reservation == null)
            {
                return NotFound(new { message = "Reservation not found" });
            }

            var calcItemIds = await _context.ReservationCalcItems
                .Where(calcItem => calcItem.ReservationCalc!.ReservationId == reservation.Id)
                .Select(calcItem => calcItem.Id)
                .ToListAsync();

            var hasInvoices = await _context.InvoiceRows
                .AnyAsync(invoiceRow => invoiceRow.ReservationCalcItemId.HasValue
                    && calcItemIds.Contains(invoiceRow.ReservationCalcItemId.Value));
            if (hasInvoices)
            {
                return Conflict(new { message = "Bokningen kan inte tas bort eftersom den har fakturerats." });
            }

            var reservationItems = await _context.ReservationItems
                .Where(item => item.ReservationId == reservation.Id)
                .ToListAsync();
            var reservationCalcs = await _context.ReservationCalcs
                .Where(calc => calc.ReservationId == reservation.Id)
                .ToListAsync();
            var calcItems = await _context.ReservationCalcItems
                .Where(calcItem => calcItem.ReservationCalc!.ReservationId == reservation.Id)
                .ToListAsync();

            _context.ReservationItems.RemoveRange(reservationItems);
            _context.ReservationCalcItems.RemoveRange(calcItems);
            _context.ReservationCalcs.RemoveRange(reservationCalcs);
            _context.Reservations.Remove(reservation);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost]
        public async Task<ActionResult<Reservation>> PostReservation(ReservationUpsertDto reservation)
        {
            try
            {
                var user = await _currentUserService.GetCurrentUserAsync(User);
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
                    reservationInDb = await _context.Reservations
                        .Include(r => r.ReservationItems)
                        .Include(r => r.ReservationCalcs)
                            .ThenInclude(rc => rc.ReservationCalcItems)
                        .FirstOrDefaultAsync(r => r.Id == reservation.Id);
                    if (reservationInDb == null)
                    {
                        return NotFound(new { message = "Reservation not found" });
                    }
                    if (reservationInDb.OfficeId != user.OfficeId)
                    {
                        return Forbid();
                    }

                }

                var normalizedPricingCalendarCode = ReservationPricingCalendarCodes.NormalizeOrDefault(reservation.PricingCalendarCode);
                if (!ReservationPricingCalendarCodes.IsValid(normalizedPricingCalendarCode))
                {
                    return BadRequest(new { message = "Invalid pricing calendar code" });
                }

                var effectivePriceListId = reservation.PriceListId;
                if (!effectivePriceListId.HasValue && reservation.CustomerId.HasValue)
                {
                    effectivePriceListId = await _context.Customers
                        .Where(customer => customer.Id == reservation.CustomerId.Value && customer.OfficeId == user.OfficeId)
                        .Select(customer => customer.DefaultPriceListId)
                        .FirstOrDefaultAsync();
                }

                if (effectivePriceListId.HasValue)
                {
                    var priceListExists = await _context.PriceLists
                        .AnyAsync(priceList => priceList.Id == effectivePriceListId.Value && priceList.OfficeId == user.OfficeId);
                    if (!priceListExists)
                    {
                        return BadRequest(new { message = "PriceListId must belong to the current office" });
                    }
                }

                var defaultVatId = (int?)null;
                var defaultVatRate = 25m;

                if (user.OfficeId.HasValue)
                {
                    var defaultVat = await _context.VatRates
                        .AsNoTracking()
                        .Where(vat => vat.OfficeId == user.OfficeId.Value && vat.IsDefault)
                        .OrderByDescending(vat => vat.IsActive)
                        .ThenBy(vat => vat.Id)
                        .Select(vat => new
                        {
                            vat.Id,
                            vat.Rate,
                        })
                        .FirstOrDefaultAsync();

                    defaultVatId = defaultVat?.Id;
                    defaultVatRate = defaultVat?.Rate ?? 25m;
                }

                reservationInDb.ModifiedByUserId = user.Id;
                reservationInDb.ModifiedDate = DateTime.UtcNow;
                reservationInDb.CustomerId = reservation.CustomerId;
                reservationInDb.PriceListId = effectivePriceListId;
                reservationInDb.DriverName = reservation.DriverName;
                reservationInDb.PickUpBy = reservation.PickUpBy;
                reservationInDb.TelephoneWorkplace = reservation.TelephoneWorkplace;
                reservationInDb.DeliveryPlace = reservation.DeliveryPlace;
                reservationInDb.CustomerMarking = reservation.CustomerMarking;
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
                reservationInDb.NoteExternal = reservation.NoteExternal;
                reservationInDb.DeliveryPlaceNote = reservation.DeliveryPlaceNote;
                reservationInDb.PickupPlaceNote = reservation.PickupPlaceNote;
                reservationInDb.IsOngoingInvoicing = reservation.IsOngoingInvoicing;
                reservationInDb.OngoingInvoicingInterval = reservation.OngoingInvoicingInterval;
                reservationInDb.PricingCalendarCode = normalizedPricingCalendarCode;

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
                    reservationCalcInDb.ReceiverTypeCode = ReceiverTypeCodes.NormalizeOrDefault(reservationCalc.ReceiverTypeCode);
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
                        reservationCalcItemInDb.UnitPrice = reservationCalcItem.UnitPrice;
                        reservationCalcItemInDb.Sum = reservationCalcItem.Sum;
                        reservationCalcItemInDb.VatId = defaultVatId;
                        reservationCalcItemInDb.VatRate = defaultVatRate;
                        reservationCalcItemInDb.CalcPriceTypeCode = CalcPriceTypeCodes.NormalizeOrDefault(reservationCalcItem.CalcPriceTypeCode);
                        reservationCalcItemInDb.Text = reservationCalcItem.Text;
                    }
                }

                await _context.SaveChangesAsync();

                await RecomputeReservationStatusAsync(reservationInDb.Id, user.OfficeId);

                return Ok(reservationInDb.Id);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Invalid invoice data", error = ex.Message });
            }
        }

        /// <summary>Recomputes and persists StatusCode for a reservation from its current saved items/calcs/invoiced sums.</summary>
        private async Task RecomputeReservationStatusAsync(int reservationId, int? officeId)
        {
            var reservationForStatus = await _context.Reservations.FindAsync(reservationId);
            if (reservationForStatus == null)
            {
                return;
            }

            var itemsForStatus = await _context.ReservationItems
                .Where(item => item.ReservationId == reservationId)
                .ToListAsync();

            var calcsForStatus = await _context.ReservationCalcs
                .Where(calc => calc.ReservationId == reservationId)
                .Include(calc => calc.ReservationCalcItems)
                    .ThenInclude(calcItem => calcItem.InvoiceRows)
                .ToListAsync();

            var categoryNamesById = await _context.ItemCategories
                .Where(category => category.OfficeId == officeId)
                .ToDictionaryAsync(category => category.Id, category => category.Name);

            var computedStatus = ReservationStatusCodes.Compute(itemsForStatus, calcsForStatus, categoryNamesById);
            if (reservationForStatus.StatusCode != computedStatus)
            {
                reservationForStatus.StatusCode = computedStatus;
                await _context.SaveChangesAsync();
            }
        }
    }
}