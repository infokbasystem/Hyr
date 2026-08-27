using Hyr.Api.Data;
using Hyr.Api.Dtos;
using Hyr.Api.Models;
using Hyr.Api.Filters;
using Hyr.Api.Services;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Hyr.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PricingController : ControllerBase
    {
        private const string VehicleItemTypeCode = "VEHICLE";
        private const string PriceTypeDayPrice = "DAYPRICE";
        private const string PriceTypeDayPriceFreeKm = "DAYPRICEFREEKM";
        private const string PriceTypeWeekPriceIncludedKm = "WEEKPRICEINCLUDEDKM";
        private const string PriceTypeWeekPriceFreeKm = "WEEKPRICEFREEKM";
        private const string PriceTypeThirtyDayPriceIncludedKm = "THIRTYDAYPRICEINCLUDEDKM";
        private const string PriceTypeWeekendPrice = "WEEKENDPRICE";
        private const string PriceTypeWeekendPriceIncludedKm = "WEEKENDPRICEINCLUDEDKM";
        private const string PriceTypeWeekendPriceFreeKm = "WEEKENDPRICEFREEKM";
        private const string PriceTypeHourPriceIncludedKm = "HOURPRICEINCLUDEDKM";
        private const string PriceTypeServicePrice = "SERVICEPRICE";
        private const string PriceTypeGuaranteePrice = "GUARANTEEPRICE";

        private const string CalcRowTypeDay = "DAY";
        private const string CalcRowTypeWeek = "WEEK";
        private const string CalcRowTypeWeekend = "WEEKEND";
        private const string CalcRowTypeMonth = "MONTH";
        private const string CalcRowTypeKm = "KM";
        private const string CalcRowTypeExcessKm = "EXCESSKM";
        private const string CalcRowTypeFuel = "FUEL";
        private const string CalcRowTypeOverday = "OVERDAY";
        private const string CalcRowTypeDeductibleReduction = "DEDUCTIBLEREDUCTION";
        private const string CalcRowTypeHour = "HOUR";

        private static readonly Dictionary<string, (string CalcPriceTypeCode, string Text)> CalcRowTypeDefinitions = new(StringComparer.OrdinalIgnoreCase)
        {
            [CalcRowTypeDay] = (CalcPriceTypeCodes.Rent, "Dygn"),
            [CalcRowTypeWeek] = (CalcPriceTypeCodes.Rent, "Vecka"),
            [CalcRowTypeWeekend] = (CalcPriceTypeCodes.Rent, "Helg"),
            [CalcRowTypeMonth] = (CalcPriceTypeCodes.Rent, "Månad"),
            [CalcRowTypeOverday] = (CalcPriceTypeCodes.Rent, "Extra dygn"),
            [CalcRowTypeHour] = (CalcPriceTypeCodes.Rent, "Timme"),
            [CalcRowTypeDeductibleReduction] = (CalcPriceTypeCodes.Rent, "Självriskreducering"),
            [CalcRowTypeKm] = (CalcPriceTypeCodes.Km, "Km"),
            [CalcRowTypeExcessKm] = (CalcPriceTypeCodes.Km, "Extra km"),
            [CalcRowTypeFuel] = (CalcPriceTypeCodes.Fuel, "Serviceavgift"),
        };

        private static readonly string[] PriceTypePriority =
        [
            PriceTypeDayPrice,
            PriceTypeDayPriceFreeKm,
            PriceTypeWeekPriceIncludedKm,
            PriceTypeWeekPriceFreeKm,
            PriceTypeThirtyDayPriceIncludedKm,
            PriceTypeWeekendPrice,
            PriceTypeWeekendPriceIncludedKm,
            PriceTypeWeekendPriceFreeKm,
            PriceTypeHourPriceIncludedKm,
            PriceTypeServicePrice,
            PriceTypeGuaranteePrice,
        ];

        private static readonly HashSet<string> SupportedPriceTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            PriceTypeDayPrice,
            PriceTypeDayPriceFreeKm,
            PriceTypeWeekPriceIncludedKm,
            PriceTypeWeekPriceFreeKm,
            PriceTypeThirtyDayPriceIncludedKm,
            PriceTypeWeekendPrice,
            PriceTypeWeekendPriceIncludedKm,
            PriceTypeWeekendPriceFreeKm,
            PriceTypeHourPriceIncludedKm,
            PriceTypeServicePrice,
            PriceTypeGuaranteePrice,
        };

        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        private sealed record VehiclePriceRow(
            string RowType,
            string CalcPriceTypeCode,
            string Text,
            decimal Qty,
            decimal UnitPrice,
            decimal Sum);

        private sealed record VehiclePriceCandidate(
            string PriceType,
            decimal Sum,
            IReadOnlyList<VehiclePriceRow> Rows,
            int SortPriority);

        public PricingController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet("items")]
        public async Task<ActionResult<PagedResult<ItemPricingRowDto>>> GetItemPricingRows([FromQuery] int page = 1, [FromQuery] int pageSize = 200, [FromQuery] string? searchTerm = null)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var normalizedPage = Math.Max(1, page);
            var normalizedPageSize = Math.Clamp(pageSize, 1, 500);

            var query = _context.Items
                .AsNoTracking()
                .Where(item => item.OfficeId == user.OfficeId)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var normalizedSearch = searchTerm.Trim().ToLower();
                query = query.Where(item =>
                    item.ItemNr.ToLower().Contains(normalizedSearch)
                    || item.Manufacturer.ToLower().Contains(normalizedSearch)
                    || item.RegNr.ToLower().Contains(normalizedSearch)
                    || item.MachineNr.ToLower().Contains(normalizedSearch));
            }

            var totalRecords = await query.CountAsync();

            var items = await query
                .OrderBy(item => item.ItemNr)
                .ThenByDescending(item => item.Id)
                .Skip((normalizedPage - 1) * normalizedPageSize)
                .Take(normalizedPageSize)
                .Select(item => new ItemPricingRowDto
                {
                    Id = item.Id,
                    ItemNr = item.ItemNr,
                    Manufacturer = item.Manufacturer,
                    RegNr = item.RegNr,
                    MachineNr = item.MachineNr,
                    BasePrice = item.BasePrice,
                    PricePerHour = item.PricePerHour,
                    PricePerDay = item.PricePerDay,
                    PricePerWeek = item.PricePerWeek,
                    PricePerMonth = item.PricePerMonth,
                    PricePerKm = item.PricePerKm,
                })
                .ToListAsync();

            var totalPages = (int)Math.Ceiling((double)totalRecords / normalizedPageSize);

            return Ok(new PagedResult<ItemPricingRowDto>
            {
                Data = items,
                TotalRecords = totalRecords,
                Page = normalizedPage,
                PageSize = normalizedPageSize,
                TotalPages = totalPages,
                HasPreviousPage = normalizedPage > 1,
                HasNextPage = normalizedPage < totalPages,
            });
        }

        [HttpGet("category-day")]
        public async Task<ActionResult<CategoryDayPricingDto>> GetCategoryDayPricing([FromQuery] int priceListId, [FromQuery] int itemCategoryId)
        {
            if (priceListId <= 0 || itemCategoryId <= 0)
            {
                return BadRequest(new { message = "priceListId and itemCategoryId must be greater than zero" });
            }

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

            var priceListExists = await _context.PriceLists
                .AsNoTracking()
                .AnyAsync(priceList => priceList.Id == priceListId && priceList.OfficeId == officeId);

            if (!priceListExists)
            {
                return NotFound(new { message = "Price list not found" });
            }

            var categoryExists = await _context.ItemCategories
                .AsNoTracking()
                .AnyAsync(itemCategory => itemCategory.Id == itemCategoryId && itemCategory.OfficeId == officeId);

            if (!categoryExists)
            {
                return NotFound(new { message = "Item category not found" });
            }

            var dayPrice = await _context.PriceListDayPrices
                .AsNoTracking()
                .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                .Select(entry => new
                {
                    entry.PricePerDay,
                    entry.PricePerKm,
                })
                .FirstOrDefaultAsync();

            var freeKmEntry = await _context.PriceListDayPriceFreeKms
                .AsNoTracking()
                .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                .Select(entry => new
                {
                    entry.PricePerDay,
                })
                .FirstOrDefaultAsync();

            return Ok(new CategoryDayPricingDto
            {
                PriceListId = priceListId,
                ItemCategoryId = itemCategoryId,
                PricePerDay = dayPrice?.PricePerDay,
                PricePerKm = dayPrice?.PricePerKm,
                FreeKmPricePerDay = freeKmEntry?.PricePerDay,
            });
        }

        [HttpGet("category-pricing")]
        public async Task<ActionResult<CategoryPricingDto>> GetCategoryPricing([FromQuery] int priceListId, [FromQuery] int itemCategoryId)
        {
            if (priceListId <= 0 || itemCategoryId <= 0)
            {
                return BadRequest(new { message = "priceListId and itemCategoryId must be greater than zero" });
            }

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

            var priceListExists = await _context.PriceLists
                .AsNoTracking()
                .AnyAsync(priceList => priceList.Id == priceListId && priceList.OfficeId == officeId);

            if (!priceListExists)
            {
                return NotFound(new { message = "Price list not found" });
            }

            var categoryExists = await _context.ItemCategories
                .AsNoTracking()
                .AnyAsync(itemCategory => itemCategory.Id == itemCategoryId && itemCategory.OfficeId == officeId);

            if (!categoryExists)
            {
                return NotFound(new { message = "Item category not found" });
            }

            var dayPrice = await _context.PriceListDayPrices
                .AsNoTracking()
                .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                .Select(entry => new CategoryDayPricingSectionDto
                {
                    PricePerDay = entry.PricePerDay,
                    PricePerKm = entry.PricePerKm,
                })
                .FirstOrDefaultAsync() ?? new CategoryDayPricingSectionDto();

            var dayFreeKmPrice = await _context.PriceListDayPriceFreeKms
                .AsNoTracking()
                .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                .Select(entry => new CategoryDayFreeKmPricingSectionDto
                {
                    PricePerDay = entry.PricePerDay,
                })
                .FirstOrDefaultAsync() ?? new CategoryDayFreeKmPricingSectionDto();

            var weekIncludedKmPrice = await _context.PriceListWeekPriceIncludedKms
                .AsNoTracking()
                .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                .Select(entry => new CategoryWeekIncludedKmPricingSectionDto
                {
                    PricePerWeek = entry.PricePerWeek,
                    IncludedKmPerWeek = entry.IncludedKmPerWeek,
                    PricePerExtraDay = entry.PricePerExtraDay,
                    IncludedKmPerExtraDay = entry.IncludedKmPerExtraDay,
                    PricePerExcessKm = entry.PricePerExcessKm,
                })
                .FirstOrDefaultAsync() ?? new CategoryWeekIncludedKmPricingSectionDto();

            var weekFreeKmPrice = await _context.PriceListWeekPriceFreeKms
                .AsNoTracking()
                .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                .Select(entry => new CategoryWeekFreeKmPricingSectionDto
                {
                    PricePerWeek = entry.PricePerWeek,
                    PricePerExtraDay = entry.PricePerExtraDay,
                })
                .FirstOrDefaultAsync() ?? new CategoryWeekFreeKmPricingSectionDto();

            var thirtyDayIncludedKmPrice = await _context.PriceListThirtyDayPriceIncludedKms
                .AsNoTracking()
                .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                .Select(entry => new CategoryThirtyDayIncludedKmPricingSectionDto
                {
                    PricePer30Days = entry.PricePer30Days,
                    IncludedKmPer30Days = entry.IncludedKmPer30Days,
                    PricePerExtraDay = entry.PricePerExtraDay,
                    IncludedKmPerExtraDay = entry.IncludedKmPerExtraDay,
                    PricePerExcessKm = entry.PricePerExcessKm,
                })
                .FirstOrDefaultAsync() ?? new CategoryThirtyDayIncludedKmPricingSectionDto();

            var weekendPrice = await _context.PriceListWeekendPrices
                .AsNoTracking()
                .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                .Select(entry => new CategoryWeekendPricingSectionDto
                {
                    FromDayOfWeek = entry.FromDayOfWeek,
                    FromTime = entry.FromTime.HasValue ? entry.FromTime.Value.ToString(@"hh\:mm") : null,
                    ToDayOfWeek = entry.ToDayOfWeek,
                    ToTime = entry.ToTime.HasValue ? entry.ToTime.Value.ToString(@"hh\:mm") : null,
                    WeekendPrice = entry.WeekendPrice,
                    PricePerKm = entry.PricePerKm,
                })
                .FirstOrDefaultAsync() ?? new CategoryWeekendPricingSectionDto();

            var weekendIncludedKmPrice = await _context.PriceListWeekendPriceIncludedKms
                .AsNoTracking()
                .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                .Select(entry => new CategoryWeekendIncludedKmPricingSectionDto
                {
                    FromDayOfWeek = entry.FromDayOfWeek,
                    FromTime = entry.FromTime.HasValue ? entry.FromTime.Value.ToString(@"hh\:mm") : null,
                    ToDayOfWeek = entry.ToDayOfWeek,
                    ToTime = entry.ToTime.HasValue ? entry.ToTime.Value.ToString(@"hh\:mm") : null,
                    WeekendPrice = entry.WeekendPrice,
                    IncludedKm = entry.IncludedKm,
                    PricePerExcessKm = entry.PricePerExcessKm,
                })
                .FirstOrDefaultAsync() ?? new CategoryWeekendIncludedKmPricingSectionDto();

            var weekendFreeKmPrice = await _context.PriceListWeekendPriceFreeKms
                .AsNoTracking()
                .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                .Select(entry => new CategoryWeekendFreeKmPricingSectionDto
                {
                    FromDayOfWeek = entry.FromDayOfWeek,
                    FromTime = entry.FromTime.HasValue ? entry.FromTime.Value.ToString(@"hh\:mm") : null,
                    ToDayOfWeek = entry.ToDayOfWeek,
                    ToTime = entry.ToTime.HasValue ? entry.ToTime.Value.ToString(@"hh\:mm") : null,
                    WeekendPrice = entry.WeekendPrice,
                })
                .FirstOrDefaultAsync() ?? new CategoryWeekendFreeKmPricingSectionDto();

            var hourIncludedKmPrice = await _context.PriceListHourPriceIncludedKms
                .AsNoTracking()
                .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                .Select(entry => new CategoryHourIncludedKmPricingSectionDto
                {
                    PricePerHour = entry.PricePerHour,
                    IncludedKmPerHour = entry.IncludedKmPerHour,
                    PricePerExcessKm = entry.PricePerExcessKm,
                })
                .FirstOrDefaultAsync() ?? new CategoryHourIncludedKmPricingSectionDto();

            var servicePrice = await _context.PriceListServicePrices
                .AsNoTracking()
                .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                .Select(entry => new CategoryServicePricingSectionDto
                {
                    PricePerServiceDay = entry.PricePerServiceDay,
                    IncludedKmPerDay = entry.IncludedKmPerDay,
                    PricePerExcessKm = entry.PricePerExcessKm,
                })
                .FirstOrDefaultAsync() ?? new CategoryServicePricingSectionDto();

            var guaranteePrice = await _context.PriceListGuaranteePrices
                .AsNoTracking()
                .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                .Select(entry => new CategoryGuaranteePricingSectionDto
                {
                    PricePerGuaranteeDay = entry.PricePerGuaranteeDay,
                })
                .FirstOrDefaultAsync() ?? new CategoryGuaranteePricingSectionDto();

            return Ok(new CategoryPricingDto
            {
                PriceListId = priceListId,
                ItemCategoryId = itemCategoryId,
                Day = dayPrice,
                DayFreeKm = dayFreeKmPrice,
                WeekIncludedKm = weekIncludedKmPrice,
                WeekFreeKm = weekFreeKmPrice,
                ThirtyDayIncludedKm = thirtyDayIncludedKmPrice,
                Weekend = weekendPrice,
                WeekendIncludedKm = weekendIncludedKmPrice,
                WeekendFreeKm = weekendFreeKmPrice,
                HourIncludedKm = hourIncludedKmPrice,
                Service = servicePrice,
                Guarantee = guaranteePrice,
            });
        }

        [HttpPost("execute-reservation-calc")]
        public async Task<ActionResult<ExecuteReservationPricingResponseDto>> ExecuteReservationPricing([FromBody] ExecuteReservationPricingRequestDto request)
        {
            if (request.ReservationId <= 0)
            {
                return BadRequest(new { message = "ReservationId must be greater than zero" });
            }

            var normalizedRequestedPriceType = NormalizePriceType(request.PriceType);
            if (!string.IsNullOrWhiteSpace(request.PriceType) && normalizedRequestedPriceType == null)
            {
                return BadRequest(new
                {
                    message = $"Invalid price type '{request.PriceType}'. Supported values: {string.Join(", ", PriceTypePriority)}"
                });
            }

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

            var reservation = await _context.Reservations
                .Where(entry => entry.Id == request.ReservationId && entry.OfficeId == officeId)
                .Include(entry => entry.ReservationItems)
                    .ThenInclude(item => item.Item)
                .Include(entry => entry.ReservationCalcs)
                    .ThenInclude(calc => calc.ReservationCalcItems)
                        .ThenInclude(calcItem => calcItem.InvoiceRows)
                .FirstOrDefaultAsync();

            if (reservation == null)
            {
                return NotFound(new { message = "Reservation not found" });
            }

            if (!reservation.PriceListId.HasValue)
            {
                return BadRequest(new { message = "Reservation has no PriceListId" });
            }

            var vehicleItems = reservation.ReservationItems
                .Where(item => string.Equals(item.ItemTypeCode, VehicleItemTypeCode, StringComparison.OrdinalIgnoreCase))
                .OrderBy(item => item.SortNr ?? int.MaxValue)
                .ThenBy(item => item.Id)
                .ToList();

            if (vehicleItems.Count == 0)
            {
                return BadRequest(new { message = "Reservation must contain one VEHICLE item" });
            }

            if (vehicleItems.Count > 1)
            {
                return BadRequest(new { message = "Multiple VEHICLE items are not yet supported" });
            }

            var vehicleItem = vehicleItems[0];

            if (!vehicleItem.ActualFrom.HasValue)
            {
                return BadRequest(new { message = "VEHICLE item must have ActualFrom before pricing can be calculated" });
            }

            if (!vehicleItem.Item?.ItemCategoryId.HasValue ?? true)
            {
                return BadRequest(new { message = "VEHICLE item must have an ItemCategory to use category pricing" });
            }

            // TODO: derive INSURANCECOMPANY/INTERNAL receivers once that logic is defined.
            var receiverTypeCode = ReceiverTypeCodes.Customer;

            // Recalculation should replace non-invoiced calcs, while preserving invoiced history.
            var uninvoicedCalcs = reservation.ReservationCalcs
                .Where(calc => !(calc.ReservationCalcItems ?? [])
                    .Any(calcItem => (calcItem.InvoiceRows ?? [])
                        .Any(invoiceRow => invoiceRow.InvoiceId.HasValue)))
                .ToList();

            if (uninvoicedCalcs.Count > 0)
            {
                var uninvoicedCalcItems = uninvoicedCalcs
                    .SelectMany(calc => calc.ReservationCalcItems ?? [])
                    .ToList();

                if (uninvoicedCalcItems.Count > 0)
                {
                    _context.ReservationCalcItems.RemoveRange(uninvoicedCalcItems);
                }

                _context.ReservationCalcs.RemoveRange(uninvoicedCalcs);
            }

            var invoicedCalcsForReceiver = reservation.ReservationCalcs
                .Except(uninvoicedCalcs)
                .Where(calc => string.Equals(
                    ReceiverTypeCodes.NormalizeOrDefault(calc.ReceiverTypeCode),
                    receiverTypeCode,
                    StringComparison.OrdinalIgnoreCase))
                .ToList();

            var priorInvoicedTotal = invoicedCalcsForReceiver
                .SelectMany(calc => calc.ReservationCalcItems ?? [])
                .Sum(calcItem => calcItem.Sum ?? 0m);

            var periodStart = vehicleItem.ActualFrom.Value;
            var periodEnd = request.CalculateToDate;
            if (periodEnd <= periodStart)
            {
                return BadRequest(new { message = "CalculateToDate must be later than calculated period start" });
            }

            var rentalDays = CalculateChargeableDays(periodStart, periodEnd);
            var rentalHours = CalculateChargeableHours(periodStart, periodEnd);
            var weekendCount = CountChargeableWeekends(periodStart, periodEnd);
            var drivenKilometers = 0m;

            if (vehicleItem.KmOut.HasValue && vehicleItem.KmIn.HasValue)
            {
                drivenKilometers = Math.Max(0, vehicleItem.KmIn.Value - vehicleItem.KmOut.Value);
            }

            var candidates = await BuildVehiclePriceCandidatesAsync(
                reservation.PriceListId.Value,
                vehicleItem.Item!.ItemCategoryId!.Value,
                rentalDays,
                rentalHours,
                weekendCount,
                drivenKilometers,
                normalizedRequestedPriceType);

            if (candidates.Count == 0)
            {
                return BadRequest(new { message = "No matching category price configuration found for the selected period and price type" });
            }

            var selectedCandidate = normalizedRequestedPriceType == null
                ? candidates
                    .OrderBy(candidate => candidate.Sum)
                    .ThenBy(candidate => candidate.SortPriority)
                    .First()
                : candidates.First(candidate => string.Equals(candidate.PriceType, normalizedRequestedPriceType, StringComparison.OrdinalIgnoreCase));

            var defaultVat = await _context.VatRates
                .AsNoTracking()
                .Where(vat => vat.OfficeId == officeId && vat.IsDefault)
                .OrderByDescending(vat => vat.IsActive)
                .ThenBy(vat => vat.Id)
                .Select(vat => new
                {
                    vat.Id,
                    vat.Rate,
                })
                .FirstOrDefaultAsync();

            var reservationCalcVatId = defaultVat?.Id;
            var reservationCalcVatRate = defaultVat?.Rate ?? 25m;

            var newReservationCalc = new ReservationCalc
            {
                OfficeId = officeId,
                ReservationId = reservation.Id,
                DateTimeFrom = periodStart,
                DateTimeTo = periodEnd,
                ReceiverTypeCode = receiverTypeCode,
            };

            foreach (var row in selectedCandidate.Rows)
            {
                newReservationCalc.ReservationCalcItems.Add(new ReservationCalcItem
                {
                    OfficeId = officeId,
                    ItemId = vehicleItem.ItemId,
                    PriceListId = reservation.PriceListId,
                    VatId = reservationCalcVatId,
                    VatRate = RoundMoney(reservationCalcVatRate),
                    CalcPriceTypeCode = row.CalcPriceTypeCode,
                    Text = row.Text,
                    Qty = RoundMoney(row.Qty),
                    UnitPrice = RoundMoney(row.UnitPrice),
                    Sum = RoundMoney(row.Sum),
                });
            }

            if (priorInvoicedTotal != 0m)
            {
                var priorInvoicedDeduction = RoundMoney(-priorInvoicedTotal);
                newReservationCalc.ReservationCalcItems.Add(new ReservationCalcItem
                {
                    OfficeId = officeId,
                    ItemId = vehicleItem.ItemId,
                    PriceListId = reservation.PriceListId,
                    VatId = reservationCalcVatId,
                    VatRate = RoundMoney(reservationCalcVatRate),
                    CalcPriceTypeCode = CalcPriceTypeCodes.Rent,
                    Text = "Avdrag tidigare fakturerat",
                    Qty = 1m,
                    UnitPrice = priorInvoicedDeduction,
                    Sum = priorInvoicedDeduction,
                });
            }

            _context.ReservationCalcs.Add(newReservationCalc);
            await _context.SaveChangesAsync();

            var allReservationCalcs = await _context.ReservationCalcs
                .AsNoTracking()
                .Where(calc => calc.ReservationId == reservation.Id)
                .Include(calc => calc.ReservationCalcItems)
                .OrderBy(calc => calc.DateTimeFrom)
                .ThenBy(calc => calc.Id)
                .ToListAsync();

            return Ok(new ExecuteReservationPricingResponseDto
            {
                ReservationId = reservation.Id,
                NewReservationCalcId = newReservationCalc.Id,
                PriceTypeUsed = selectedCandidate.PriceType,
                PeriodFrom = periodStart,
                PeriodTo = periodEnd,
                ReservationCalcs = MapReservationCalcs(allReservationCalcs),
            });
        }

        [HttpPut("category-pricing")]
        public async Task<ActionResult<CategoryPricingDto>> SaveCategoryPricing([FromBody] CategoryPricingDto request)
        {
            if (request.PriceListId <= 0 || request.ItemCategoryId <= 0)
            {
                return BadRequest(new { message = "priceListId and itemCategoryId must be greater than zero" });
            }

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

            var priceListExists = await _context.PriceLists
                .AsNoTracking()
                .AnyAsync(priceList => priceList.Id == request.PriceListId && priceList.OfficeId == officeId);

            if (!priceListExists)
            {
                return NotFound(new { message = "Price list not found" });
            }

            var categoryExists = await _context.ItemCategories
                .AsNoTracking()
                .AnyAsync(itemCategory => itemCategory.Id == request.ItemCategoryId && itemCategory.OfficeId == officeId);

            if (!categoryExists)
            {
                return NotFound(new { message = "Item category not found" });
            }

            var utcNow = DateTime.UtcNow;

            await UpsertCategoryPriceAsync(
                _context.PriceListDayPrices,
                entry => entry.PriceListId == request.PriceListId && entry.ItemCategoryId == request.ItemCategoryId,
                request.Day,
                hasValue: section => section.PricePerDay.HasValue || section.PricePerKm.HasValue,
                createNew: () => new PriceListDayPrice
                {
                    PriceListId = request.PriceListId,
                    ItemCategoryId = request.ItemCategoryId,
                    CreatedAt = utcNow,
                    CreatedBy = user.Id,
                },
                updateExisting: (entry, section) =>
                {
                    entry.PricePerDay = section.PricePerDay;
                    entry.PricePerKm = section.PricePerKm;
                    entry.UpdatedAt = utcNow;
                    entry.UpdatedBy = user.Id;
                });

            await UpsertCategoryPriceAsync(
                _context.PriceListDayPriceFreeKms,
                entry => entry.PriceListId == request.PriceListId && entry.ItemCategoryId == request.ItemCategoryId,
                request.DayFreeKm,
                hasValue: section => section.PricePerDay.HasValue,
                createNew: () => new PriceListDayPriceFreeKm
                {
                    PriceListId = request.PriceListId,
                    ItemCategoryId = request.ItemCategoryId,
                    CreatedAt = utcNow,
                    CreatedBy = user.Id,
                },
                updateExisting: (entry, section) =>
                {
                    entry.PricePerDay = section.PricePerDay;
                    entry.UpdatedAt = utcNow;
                    entry.UpdatedBy = user.Id;
                });

            await UpsertCategoryPriceAsync(
                _context.PriceListWeekPriceIncludedKms,
                entry => entry.PriceListId == request.PriceListId && entry.ItemCategoryId == request.ItemCategoryId,
                request.WeekIncludedKm,
                hasValue: section => section.PricePerWeek.HasValue || section.IncludedKmPerWeek.HasValue || section.PricePerExtraDay.HasValue || section.IncludedKmPerExtraDay.HasValue || section.PricePerExcessKm.HasValue,
                createNew: () => new PriceListWeekPriceIncludedKm
                {
                    PriceListId = request.PriceListId,
                    ItemCategoryId = request.ItemCategoryId,
                    CreatedAt = utcNow,
                    CreatedBy = user.Id,
                },
                updateExisting: (entry, section) =>
                {
                    entry.PricePerWeek = section.PricePerWeek;
                    entry.IncludedKmPerWeek = section.IncludedKmPerWeek;
                    entry.PricePerExtraDay = section.PricePerExtraDay;
                    entry.IncludedKmPerExtraDay = section.IncludedKmPerExtraDay;
                    entry.PricePerExcessKm = section.PricePerExcessKm;
                    entry.UpdatedAt = utcNow;
                    entry.UpdatedBy = user.Id;
                });

            await UpsertCategoryPriceAsync(
                _context.PriceListWeekPriceFreeKms,
                entry => entry.PriceListId == request.PriceListId && entry.ItemCategoryId == request.ItemCategoryId,
                request.WeekFreeKm,
                hasValue: section => section.PricePerWeek.HasValue || section.PricePerExtraDay.HasValue,
                createNew: () => new PriceListWeekPriceFreeKm
                {
                    PriceListId = request.PriceListId,
                    ItemCategoryId = request.ItemCategoryId,
                    CreatedAt = utcNow,
                    CreatedBy = user.Id,
                },
                updateExisting: (entry, section) =>
                {
                    entry.PricePerWeek = section.PricePerWeek;
                    entry.PricePerExtraDay = section.PricePerExtraDay;
                    entry.UpdatedAt = utcNow;
                    entry.UpdatedBy = user.Id;
                });

            await UpsertCategoryPriceAsync(
                _context.PriceListThirtyDayPriceIncludedKms,
                entry => entry.PriceListId == request.PriceListId && entry.ItemCategoryId == request.ItemCategoryId,
                request.ThirtyDayIncludedKm,
                hasValue: section => section.PricePer30Days.HasValue || section.IncludedKmPer30Days.HasValue || section.PricePerExtraDay.HasValue || section.IncludedKmPerExtraDay.HasValue || section.PricePerExcessKm.HasValue,
                createNew: () => new PriceListThirtyDayPriceIncludedKm
                {
                    PriceListId = request.PriceListId,
                    ItemCategoryId = request.ItemCategoryId,
                    CreatedAt = utcNow,
                    CreatedBy = user.Id,
                },
                updateExisting: (entry, section) =>
                {
                    entry.PricePer30Days = section.PricePer30Days;
                    entry.IncludedKmPer30Days = section.IncludedKmPer30Days;
                    entry.PricePerExtraDay = section.PricePerExtraDay;
                    entry.IncludedKmPerExtraDay = section.IncludedKmPerExtraDay;
                    entry.PricePerExcessKm = section.PricePerExcessKm;
                    entry.UpdatedAt = utcNow;
                    entry.UpdatedBy = user.Id;
                });

            await UpsertCategoryPriceAsync(
                _context.PriceListWeekendPrices,
                entry => entry.PriceListId == request.PriceListId && entry.ItemCategoryId == request.ItemCategoryId,
                request.Weekend,
                hasValue: section => section.FromDayOfWeek.HasValue || !string.IsNullOrWhiteSpace(section.FromTime) || section.ToDayOfWeek.HasValue || !string.IsNullOrWhiteSpace(section.ToTime) || section.WeekendPrice.HasValue || section.PricePerKm.HasValue,
                createNew: () => new PriceListWeekendPrice
                {
                    PriceListId = request.PriceListId,
                    ItemCategoryId = request.ItemCategoryId,
                    CreatedAt = utcNow,
                    CreatedBy = user.Id,
                },
                updateExisting: (entry, section) =>
                {
                    entry.FromDayOfWeek = section.FromDayOfWeek;
                    entry.FromTime = ParseTimeSpan(section.FromTime);
                    entry.ToDayOfWeek = section.ToDayOfWeek;
                    entry.ToTime = ParseTimeSpan(section.ToTime);
                    entry.WeekendPrice = section.WeekendPrice;
                    entry.PricePerKm = section.PricePerKm;
                    entry.UpdatedAt = utcNow;
                    entry.UpdatedBy = user.Id;
                });

            await UpsertCategoryPriceAsync(
                _context.PriceListWeekendPriceIncludedKms,
                entry => entry.PriceListId == request.PriceListId && entry.ItemCategoryId == request.ItemCategoryId,
                request.WeekendIncludedKm,
                hasValue: section => section.FromDayOfWeek.HasValue || !string.IsNullOrWhiteSpace(section.FromTime) || section.ToDayOfWeek.HasValue || !string.IsNullOrWhiteSpace(section.ToTime) || section.WeekendPrice.HasValue || section.IncludedKm.HasValue || section.PricePerExcessKm.HasValue,
                createNew: () => new PriceListWeekendPriceIncludedKm
                {
                    PriceListId = request.PriceListId,
                    ItemCategoryId = request.ItemCategoryId,
                    CreatedAt = utcNow,
                    CreatedBy = user.Id,
                },
                updateExisting: (entry, section) =>
                {
                    entry.FromDayOfWeek = section.FromDayOfWeek;
                    entry.FromTime = ParseTimeSpan(section.FromTime);
                    entry.ToDayOfWeek = section.ToDayOfWeek;
                    entry.ToTime = ParseTimeSpan(section.ToTime);
                    entry.WeekendPrice = section.WeekendPrice;
                    entry.IncludedKm = section.IncludedKm;
                    entry.PricePerExcessKm = section.PricePerExcessKm;
                    entry.UpdatedAt = utcNow;
                    entry.UpdatedBy = user.Id;
                });

            await UpsertCategoryPriceAsync(
                _context.PriceListWeekendPriceFreeKms,
                entry => entry.PriceListId == request.PriceListId && entry.ItemCategoryId == request.ItemCategoryId,
                request.WeekendFreeKm,
                hasValue: section => section.FromDayOfWeek.HasValue || !string.IsNullOrWhiteSpace(section.FromTime) || section.ToDayOfWeek.HasValue || !string.IsNullOrWhiteSpace(section.ToTime) || section.WeekendPrice.HasValue,
                createNew: () => new PriceListWeekendPriceFreeKm
                {
                    PriceListId = request.PriceListId,
                    ItemCategoryId = request.ItemCategoryId,
                    CreatedAt = utcNow,
                    CreatedBy = user.Id,
                },
                updateExisting: (entry, section) =>
                {
                    entry.FromDayOfWeek = section.FromDayOfWeek;
                    entry.FromTime = ParseTimeSpan(section.FromTime);
                    entry.ToDayOfWeek = section.ToDayOfWeek;
                    entry.ToTime = ParseTimeSpan(section.ToTime);
                    entry.WeekendPrice = section.WeekendPrice;
                    entry.UpdatedAt = utcNow;
                    entry.UpdatedBy = user.Id;
                });

            await UpsertCategoryPriceAsync(
                _context.PriceListHourPriceIncludedKms,
                entry => entry.PriceListId == request.PriceListId && entry.ItemCategoryId == request.ItemCategoryId,
                request.HourIncludedKm,
                hasValue: section => section.PricePerHour.HasValue || section.IncludedKmPerHour.HasValue || section.PricePerExcessKm.HasValue,
                createNew: () => new PriceListHourPriceIncludedKm
                {
                    PriceListId = request.PriceListId,
                    ItemCategoryId = request.ItemCategoryId,
                    CreatedAt = utcNow,
                    CreatedBy = user.Id,
                },
                updateExisting: (entry, section) =>
                {
                    entry.PricePerHour = section.PricePerHour;
                    entry.IncludedKmPerHour = section.IncludedKmPerHour;
                    entry.PricePerExcessKm = section.PricePerExcessKm;
                    entry.UpdatedAt = utcNow;
                    entry.UpdatedBy = user.Id;
                });

            await UpsertCategoryPriceAsync(
                _context.PriceListServicePrices,
                entry => entry.PriceListId == request.PriceListId && entry.ItemCategoryId == request.ItemCategoryId,
                request.Service,
                hasValue: section => section.PricePerServiceDay.HasValue || section.IncludedKmPerDay.HasValue || section.PricePerExcessKm.HasValue,
                createNew: () => new PriceListServicePrice
                {
                    PriceListId = request.PriceListId,
                    ItemCategoryId = request.ItemCategoryId,
                    CreatedAt = utcNow,
                    CreatedBy = user.Id,
                },
                updateExisting: (entry, section) =>
                {
                    entry.PricePerServiceDay = section.PricePerServiceDay;
                    entry.IncludedKmPerDay = section.IncludedKmPerDay;
                    entry.PricePerExcessKm = section.PricePerExcessKm;
                    entry.UpdatedAt = utcNow;
                    entry.UpdatedBy = user.Id;
                });

            await UpsertCategoryPriceAsync(
                _context.PriceListGuaranteePrices,
                entry => entry.PriceListId == request.PriceListId && entry.ItemCategoryId == request.ItemCategoryId,
                request.Guarantee,
                hasValue: section => section.PricePerGuaranteeDay.HasValue,
                createNew: () => new PriceListGuaranteePrice
                {
                    PriceListId = request.PriceListId,
                    ItemCategoryId = request.ItemCategoryId,
                    CreatedAt = utcNow,
                    CreatedBy = user.Id,
                },
                updateExisting: (entry, section) =>
                {
                    entry.PricePerGuaranteeDay = section.PricePerGuaranteeDay;
                    entry.UpdatedAt = utcNow;
                    entry.UpdatedBy = user.Id;
                });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest(new { message = "Kunde inte spara kategoripriser." });
            }

            return await GetCategoryPricing(request.PriceListId, request.ItemCategoryId);
        }

        private async Task UpsertCategoryPriceAsync<TEntity, TSection>(
            DbSet<TEntity> set,
            Expression<Func<TEntity, bool>> match,
            TSection section,
            Func<TSection, bool> hasValue,
            Func<TEntity> createNew,
            Action<TEntity, TSection> updateExisting)
            where TEntity : class
        {
            var existing = await set.FirstOrDefaultAsync(match);

            if (!hasValue(section))
            {
                if (existing != null)
                {
                    set.Remove(existing);
                }

                return;
            }

            if (existing == null)
            {
                existing = createNew();
                set.Add(existing);
            }

            updateExisting(existing, section);
        }

        private static string? NormalizePriceType(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var normalized = value.Trim().ToUpperInvariant();
            return SupportedPriceTypes.Contains(normalized) ? normalized : null;
        }

        private static bool ShouldEvaluatePriceType(string candidatePriceType, string? requestedPriceType)
        {
            return requestedPriceType == null || string.Equals(candidatePriceType, requestedPriceType, StringComparison.OrdinalIgnoreCase);
        }

        private async Task<List<VehiclePriceCandidate>> BuildVehiclePriceCandidatesAsync(
            int priceListId,
            int itemCategoryId,
            decimal rentalDays,
            decimal rentalHours,
            int weekendCount,
            decimal drivenKilometers,
            string? requestedPriceType)
        {
            var candidates = new List<VehiclePriceCandidate>();

            if (ShouldEvaluatePriceType(PriceTypeDayPrice, requestedPriceType))
            {
                var dayPrice = await _context.PriceListDayPrices
                    .AsNoTracking()
                    .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                    .Select(entry => new
                    {
                        entry.PricePerDay,
                        entry.PricePerKm,
                    })
                    .FirstOrDefaultAsync();

                if (dayPrice?.PricePerDay.HasValue == true)
                {
                    var rows = new List<VehiclePriceRow>
                    {
                        BuildPriceRow(CalcRowTypeDay, rentalDays, dayPrice.PricePerDay.Value),
                        BuildPriceRow(CalcRowTypeKm, drivenKilometers, dayPrice.PricePerKm ?? 0m),
                    };

                    AddCandidate(candidates, PriceTypeDayPrice, rows);
                }
            }

            if (ShouldEvaluatePriceType(PriceTypeDayPriceFreeKm, requestedPriceType))
            {
                var dayPriceFreeKm = await _context.PriceListDayPriceFreeKms
                    .AsNoTracking()
                    .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                    .Select(entry => entry.PricePerDay)
                    .FirstOrDefaultAsync();

                if (dayPriceFreeKm.HasValue)
                {
                    AddCandidate(candidates, PriceTypeDayPriceFreeKm, new List<VehiclePriceRow>
                    {
                        BuildPriceRow(CalcRowTypeDay, rentalDays, dayPriceFreeKm.Value),
                    });
                }
            }

            if (ShouldEvaluatePriceType(PriceTypeWeekPriceIncludedKm, requestedPriceType))
            {
                var weekIncluded = await _context.PriceListWeekPriceIncludedKms
                    .AsNoTracking()
                    .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                    .Select(entry => new
                    {
                        entry.PricePerWeek,
                        entry.IncludedKmPerWeek,
                        entry.PricePerExtraDay,
                        entry.IncludedKmPerExtraDay,
                        entry.PricePerExcessKm,
                    })
                    .FirstOrDefaultAsync();

                if (weekIncluded?.PricePerWeek.HasValue == true)
                {
                    var fullWeeks = (int)Math.Floor(rentalDays / 7m);
                    var extraDays = rentalDays - (fullWeeks * 7m);
                    if (extraDays == 0m || weekIncluded.PricePerExtraDay.HasValue)
                    {
                        var rows = new List<VehiclePriceRow>();

                        if (fullWeeks > 0)
                        {
                            rows.Add(BuildPriceRow(CalcRowTypeWeek, fullWeeks, weekIncluded.PricePerWeek.Value));
                        }

                        if (extraDays > 0m)
                        {
                            rows.Add(BuildPriceRow(CalcRowTypeOverday, extraDays, weekIncluded.PricePerExtraDay ?? 0m));
                        }

                        if (weekIncluded.PricePerExcessKm.HasValue)
                        {
                            var includedKm =
                                (fullWeeks * (weekIncluded.IncludedKmPerWeek ?? 0m))
                                + (extraDays * (weekIncluded.IncludedKmPerExtraDay ?? 0m));
                            var excessKm = Math.Max(0m, drivenKilometers - includedKm);
                            rows.Add(BuildPriceRow(CalcRowTypeExcessKm, excessKm, weekIncluded.PricePerExcessKm.Value));
                        }

                        AddCandidate(candidates, PriceTypeWeekPriceIncludedKm, rows);
                    }
                }
            }

            if (ShouldEvaluatePriceType(PriceTypeWeekPriceFreeKm, requestedPriceType))
            {
                var weekFree = await _context.PriceListWeekPriceFreeKms
                    .AsNoTracking()
                    .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                    .Select(entry => new
                    {
                        entry.PricePerWeek,
                        entry.PricePerExtraDay,
                    })
                    .FirstOrDefaultAsync();

                if (weekFree?.PricePerWeek.HasValue == true)
                {
                    var fullWeeks = (int)Math.Floor(rentalDays / 7m);
                    var extraDays = rentalDays - (fullWeeks * 7m);
                    if (extraDays == 0m || weekFree.PricePerExtraDay.HasValue)
                    {
                        var rows = new List<VehiclePriceRow>();

                        if (fullWeeks > 0)
                        {
                            rows.Add(BuildPriceRow(CalcRowTypeWeek, fullWeeks, weekFree.PricePerWeek.Value));
                        }

                        if (extraDays > 0m)
                        {
                            rows.Add(BuildPriceRow(CalcRowTypeOverday, extraDays, weekFree.PricePerExtraDay ?? 0m));
                        }

                        AddCandidate(candidates, PriceTypeWeekPriceFreeKm, rows);
                    }
                }
            }

            if (ShouldEvaluatePriceType(PriceTypeThirtyDayPriceIncludedKm, requestedPriceType))
            {
                var thirtyDay = await _context.PriceListThirtyDayPriceIncludedKms
                    .AsNoTracking()
                    .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                    .Select(entry => new
                    {
                        entry.PricePer30Days,
                        entry.IncludedKmPer30Days,
                        entry.PricePerExtraDay,
                        entry.IncludedKmPerExtraDay,
                        entry.PricePerExcessKm,
                    })
                    .FirstOrDefaultAsync();

                if (thirtyDay?.PricePer30Days.HasValue == true)
                {
                    var fullPeriods = (int)Math.Floor(rentalDays / 30m);
                    var extraDays = rentalDays - (fullPeriods * 30m);
                    if (extraDays == 0m || thirtyDay.PricePerExtraDay.HasValue)
                    {
                        var rows = new List<VehiclePriceRow>();

                        if (fullPeriods > 0)
                        {
                            rows.Add(BuildPriceRow(CalcRowTypeMonth, fullPeriods, thirtyDay.PricePer30Days.Value));
                        }

                        if (extraDays > 0m)
                        {
                            rows.Add(BuildPriceRow(CalcRowTypeOverday, extraDays, thirtyDay.PricePerExtraDay ?? 0m));
                        }

                        if (thirtyDay.PricePerExcessKm.HasValue)
                        {
                            var includedKm =
                                (fullPeriods * (thirtyDay.IncludedKmPer30Days ?? 0m))
                                + (extraDays * (thirtyDay.IncludedKmPerExtraDay ?? 0m));
                            var excessKm = Math.Max(0m, drivenKilometers - includedKm);
                            rows.Add(BuildPriceRow(CalcRowTypeExcessKm, excessKm, thirtyDay.PricePerExcessKm.Value));
                        }

                        AddCandidate(candidates, PriceTypeThirtyDayPriceIncludedKm, rows);
                    }
                }
            }

            if (ShouldEvaluatePriceType(PriceTypeWeekendPrice, requestedPriceType))
            {
                var weekend = await _context.PriceListWeekendPrices
                    .AsNoTracking()
                    .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                    .Select(entry => new
                    {
                        entry.WeekendPrice,
                        entry.PricePerKm,
                    })
                    .FirstOrDefaultAsync();

                if (weekend?.WeekendPrice.HasValue == true && weekendCount > 0)
                {
                    var rows = new List<VehiclePriceRow>
                    {
                        BuildPriceRow(CalcRowTypeWeekend, weekendCount, weekend.WeekendPrice.Value),
                    };

                    if (weekend.PricePerKm.HasValue)
                    {
                        rows.Add(BuildPriceRow(CalcRowTypeKm, drivenKilometers, weekend.PricePerKm.Value));
                    }

                    AddCandidate(candidates, PriceTypeWeekendPrice, rows);
                }
            }

            if (ShouldEvaluatePriceType(PriceTypeWeekendPriceIncludedKm, requestedPriceType))
            {
                var weekendIncluded = await _context.PriceListWeekendPriceIncludedKms
                    .AsNoTracking()
                    .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                    .Select(entry => new
                    {
                        entry.WeekendPrice,
                        entry.IncludedKm,
                        entry.PricePerExcessKm,
                    })
                    .FirstOrDefaultAsync();

                if (weekendIncluded?.WeekendPrice.HasValue == true && weekendCount > 0)
                {
                    var rows = new List<VehiclePriceRow>
                    {
                        BuildPriceRow(CalcRowTypeWeekend, weekendCount, weekendIncluded.WeekendPrice.Value),
                    };

                    if (weekendIncluded.PricePerExcessKm.HasValue)
                    {
                        var includedKm = weekendCount * (weekendIncluded.IncludedKm ?? 0m);
                        var excessKm = Math.Max(0m, drivenKilometers - includedKm);
                        rows.Add(BuildPriceRow(CalcRowTypeExcessKm, excessKm, weekendIncluded.PricePerExcessKm.Value));
                    }

                    AddCandidate(candidates, PriceTypeWeekendPriceIncludedKm, rows);
                }
            }

            if (ShouldEvaluatePriceType(PriceTypeWeekendPriceFreeKm, requestedPriceType))
            {
                var weekendFree = await _context.PriceListWeekendPriceFreeKms
                    .AsNoTracking()
                    .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                    .Select(entry => entry.WeekendPrice)
                    .FirstOrDefaultAsync();

                if (weekendFree.HasValue && weekendCount > 0)
                {
                    AddCandidate(candidates, PriceTypeWeekendPriceFreeKm, new List<VehiclePriceRow>
                    {
                        BuildPriceRow(CalcRowTypeWeekend, weekendCount, weekendFree.Value),
                    });
                }
            }

            if (ShouldEvaluatePriceType(PriceTypeHourPriceIncludedKm, requestedPriceType))
            {
                var hourIncluded = await _context.PriceListHourPriceIncludedKms
                    .AsNoTracking()
                    .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                    .Select(entry => new
                    {
                        entry.PricePerHour,
                        entry.IncludedKmPerHour,
                        entry.PricePerExcessKm,
                    })
                    .FirstOrDefaultAsync();

                if (hourIncluded?.PricePerHour.HasValue == true)
                {
                    var rows = new List<VehiclePriceRow>
                    {
                        BuildPriceRow(CalcRowTypeHour, rentalHours, hourIncluded.PricePerHour.Value),
                    };

                    if (hourIncluded.PricePerExcessKm.HasValue)
                    {
                        var includedKm = rentalHours * (hourIncluded.IncludedKmPerHour ?? 0m);
                        var excessKm = Math.Max(0m, drivenKilometers - includedKm);
                        rows.Add(BuildPriceRow(CalcRowTypeExcessKm, excessKm, hourIncluded.PricePerExcessKm.Value));
                    }

                    AddCandidate(candidates, PriceTypeHourPriceIncludedKm, rows);
                }
            }

            if (ShouldEvaluatePriceType(PriceTypeServicePrice, requestedPriceType))
            {
                var servicePrice = await _context.PriceListServicePrices
                    .AsNoTracking()
                    .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                    .Select(entry => new
                    {
                        entry.PricePerServiceDay,
                        entry.IncludedKmPerDay,
                        entry.PricePerExcessKm,
                    })
                    .FirstOrDefaultAsync();

                if (servicePrice?.PricePerServiceDay.HasValue == true)
                {
                    var rows = new List<VehiclePriceRow>
                    {
                        BuildPriceRow(CalcRowTypeFuel, rentalDays, servicePrice.PricePerServiceDay.Value),
                    };

                    if (servicePrice.PricePerExcessKm.HasValue)
                    {
                        var includedKm = rentalDays * (servicePrice.IncludedKmPerDay ?? 0m);
                        var excessKm = Math.Max(0m, drivenKilometers - includedKm);
                        rows.Add(BuildPriceRow(CalcRowTypeExcessKm, excessKm, servicePrice.PricePerExcessKm.Value));
                    }

                    AddCandidate(candidates, PriceTypeServicePrice, rows);
                }
            }

            if (ShouldEvaluatePriceType(PriceTypeGuaranteePrice, requestedPriceType))
            {
                var guaranteePrice = await _context.PriceListGuaranteePrices
                    .AsNoTracking()
                    .Where(entry => entry.PriceListId == priceListId && entry.ItemCategoryId == itemCategoryId)
                    .Select(entry => entry.PricePerGuaranteeDay)
                    .FirstOrDefaultAsync();

                if (guaranteePrice.HasValue)
                {
                    AddCandidate(candidates, PriceTypeGuaranteePrice, new List<VehiclePriceRow>
                    {
                        BuildPriceRow(CalcRowTypeDeductibleReduction, rentalDays, guaranteePrice.Value),
                    });
                }
            }

            return candidates;
        }

        private static VehiclePriceRow BuildPriceRow(string rowType, decimal qty, decimal unitPrice)
        {
            var normalizedQty = Math.Max(0m, qty);
            var rowSum = Math.Max(0m, normalizedQty * unitPrice);
            var definition = CalcRowTypeDefinitions[rowType];

            return new VehiclePriceRow(rowType, definition.CalcPriceTypeCode, definition.Text, normalizedQty, unitPrice, rowSum);
        }

        private static void AddCandidate(
            ICollection<VehiclePriceCandidate> candidates,
            string priceType,
            IEnumerable<VehiclePriceRow> rows)
        {
            var priority = Array.FindIndex(PriceTypePriority, candidate => string.Equals(candidate, priceType, StringComparison.OrdinalIgnoreCase));
            var normalizedRows = rows
                .Select(row => new VehiclePriceRow(
                    row.RowType,
                    row.CalcPriceTypeCode,
                    row.Text,
                    Math.Max(0m, row.Qty),
                    row.UnitPrice,
                    Math.Max(0m, row.Sum)))
                .ToList();

            if (normalizedRows.Count == 0)
            {
                return;
            }

            var normalizedSum = Math.Max(0m, normalizedRows.Sum(row => row.Sum));

            candidates.Add(new VehiclePriceCandidate(
                priceType,
                normalizedSum,
                normalizedRows,
                priority < 0 ? int.MaxValue : priority));
        }

        private static decimal? CalculateWeekLikeTotal(decimal rentalDays, decimal pricePerWeek, decimal? pricePerExtraDay)
        {
            var fullWeeks = (int)Math.Floor(rentalDays / 7m);
            var extraDays = rentalDays - (fullWeeks * 7m);

            if (extraDays > 0m && !pricePerExtraDay.HasValue)
            {
                return null;
            }

            var extraDayPrice = pricePerExtraDay ?? 0m;
            return (fullWeeks * pricePerWeek) + (extraDays * extraDayPrice);
        }

        private static decimal? CalculateThirtyDayTotal(decimal rentalDays, decimal pricePer30Days, decimal? pricePerExtraDay)
        {
            var fullPeriods = (int)Math.Floor(rentalDays / 30m);
            var extraDays = rentalDays - (fullPeriods * 30m);

            if (extraDays > 0m && !pricePerExtraDay.HasValue)
            {
                return null;
            }

            var extraDayPrice = pricePerExtraDay ?? 0m;
            return (fullPeriods * pricePer30Days) + (extraDays * extraDayPrice);
        }

        private static decimal CalculateChargeableDays(DateTime periodStart, DateTime periodEnd)
        {
            var totalDays = (decimal)(periodEnd - periodStart).TotalDays;
            return Math.Max(1m, decimal.Ceiling(totalDays));
        }

        private static decimal CalculateChargeableHours(DateTime periodStart, DateTime periodEnd)
        {
            var totalHours = (decimal)(periodEnd - periodStart).TotalHours;
            return Math.Max(1m, decimal.Ceiling(totalHours));
        }

        private static int CountChargeableWeekends(DateTime periodStart, DateTime periodEnd)
        {
            var startDate = periodStart.Date;
            var endExclusive = periodEnd.Date.AddDays(1);
            var saturdayCount = 0;
            var hasSunday = false;

            for (var current = startDate; current < endExclusive; current = current.AddDays(1))
            {
                if (current.DayOfWeek == DayOfWeek.Saturday)
                {
                    saturdayCount++;
                }

                if (current.DayOfWeek == DayOfWeek.Sunday)
                {
                    hasSunday = true;
                }
            }

            if (saturdayCount == 0 && hasSunday)
            {
                return 1;
            }

            return saturdayCount;
        }

        private static decimal RoundMoney(decimal value)
        {
            return Math.Round(value, 5, MidpointRounding.AwayFromZero);
        }

        private static List<ReservationCalcResultDto> MapReservationCalcs(IEnumerable<ReservationCalc> calcs)
        {
            return calcs
                .OrderBy(calc => calc.DateTimeFrom)
                .ThenBy(calc => calc.Id)
                .Select(calc => new ReservationCalcResultDto
                {
                    Id = calc.Id,
                    DateTimeFrom = calc.DateTimeFrom,
                    DateTimeTo = calc.DateTimeTo,
                    ReceiverTypeCode = ReceiverTypeCodes.NormalizeOrDefault(calc.ReceiverTypeCode),
                    ReservationCalcItems = (calc.ReservationCalcItems ?? [])
                        .OrderBy(item => item.Id)
                        .Select(item => new ReservationCalcResultItemDto
                        {
                            Id = item.Id,
                            ItemId = item.ItemId,
                            PriceListId = item.PriceListId,
                            VatId = item.VatId,
                            VatRate = item.VatRate,
                            CalcPriceTypeCode = CalcPriceTypeCodes.NormalizeOrDefault(item.CalcPriceTypeCode),
                            Text = item.Text,
                            Qty = item.Qty,
                            UnitPrice = item.UnitPrice,
                            Sum = item.Sum,
                        })
                        .ToList(),
                })
                .ToList();
        }

        private static TimeSpan? ParseTimeSpan(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            return TimeSpan.TryParse(value, out var parsedValue) ? parsedValue : null;
        }

        [HttpPut("price-lists")]
        public async Task<ActionResult<List<PriceListOptionDto>>> SavePriceLists([FromBody] SavePriceListsDto request)
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
            var submittedPriceLists = (request.PriceLists ?? [])
                .Select((entry, index) => new
                {
                    Index = index,
                    Id = entry.Id,
                    Name = (entry.Name ?? string.Empty).Trim(),
                })
                .ToList();

            if (submittedPriceLists.Any(entry => string.IsNullOrWhiteSpace(entry.Name)))
            {
                return BadRequest(new { message = "Alla prislistor måste ha ett namn." });
            }

            var duplicateName = submittedPriceLists
                .GroupBy(entry => entry.Name, StringComparer.OrdinalIgnoreCase)
                .FirstOrDefault(group => group.Count() > 1);

            if (duplicateName != null)
            {
                return BadRequest(new { message = $"Prislistan '{duplicateName.Key}' finns redan." });
            }

            var existingPriceLists = await _context.PriceLists
                .Where(priceList => priceList.OfficeId == officeId)
                .ToListAsync();

            var existingPriceListsById = existingPriceLists.ToDictionary(priceList => priceList.Id);
            var submittedIds = submittedPriceLists
                .Where(entry => entry.Id.HasValue)
                .Select(entry => entry.Id!.Value)
                .ToHashSet();

            var unknownId = submittedIds.FirstOrDefault(id => !existingPriceListsById.ContainsKey(id));
            if (unknownId != 0)
            {
                return NotFound(new { message = $"Price list {unknownId} not found" });
            }

            var priceListsToDelete = existingPriceLists
                .Where(priceList => !submittedIds.Contains(priceList.Id))
                .ToList();

            if (priceListsToDelete.Count > 0)
            {
                _context.PriceLists.RemoveRange(priceListsToDelete);
            }

            var utcNow = DateTime.UtcNow;

            foreach (var submittedPriceList in submittedPriceLists)
            {
                if (submittedPriceList.Id.HasValue)
                {
                    var existingPriceList = existingPriceListsById[submittedPriceList.Id.Value];
                    existingPriceList.Name = submittedPriceList.Name;
                    existingPriceList.IsActive = true;
                    existingPriceList.Priority = submittedPriceList.Index + 1;
                    existingPriceList.UpdatedAt = utcNow;
                    existingPriceList.UpdatedBy = user.Id;
                    continue;
                }

                _context.PriceLists.Add(new Models.PriceList
                {
                    OfficeId = officeId,
                    Name = submittedPriceList.Name,
                    Description = string.Empty,
                    IsActive = true,
                    Priority = submittedPriceList.Index + 1,
                    CreatedAt = utcNow,
                    CreatedBy = user.Id,
                    UpdatedAt = utcNow,
                    UpdatedBy = user.Id,
                });
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest(new { message = "Kunde inte spara prislistor. Kontrollera att inga namn är dubbletter och att listor som tas bort inte används." });
            }

            var savedPriceLists = await _context.PriceLists
                .AsNoTracking()
                .Where(priceList => priceList.OfficeId == officeId && priceList.IsActive)
                .OrderBy(priceList => priceList.Priority)
                .ThenBy(priceList => priceList.Name)
                .Select(priceList => new PriceListOptionDto
                {
                    Id = priceList.Id,
                    Name = priceList.Name,
                })
                .ToListAsync();

            return Ok(savedPriceLists);
        }
    }
}