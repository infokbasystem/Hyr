namespace Hyr.Api.Dtos;

public sealed class ItemPricingRowDto
{
    public int Id { get; set; }
    public string ItemNr { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string RegNr { get; set; } = string.Empty;
    public string MachineNr { get; set; } = string.Empty;
    public decimal? BasePrice { get; set; }
    public decimal? PricePerHour { get; set; }
    public decimal? PricePerDay { get; set; }
    public decimal? PricePerWeek { get; set; }
    public decimal? PricePerMonth { get; set; }
    public decimal? PricePerKm { get; set; }
}

public sealed class CategoryDayPricingDto
{
    public int PriceListId { get; set; }
    public int ItemCategoryId { get; set; }
    public decimal? PricePerDay { get; set; }
    public decimal? PricePerKm { get; set; }
    public decimal? FreeKmPricePerDay { get; set; }
}

public sealed class SavePriceListsDto
{
    public List<PriceListOptionUpsertDto> PriceLists { get; set; } = [];
}

public sealed class PriceListOptionUpsertDto
{
    public int? Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public sealed class CategoryPricingDto
{
    public int PriceListId { get; set; }
    public int ItemCategoryId { get; set; }
    public CategoryDayPricingSectionDto Day { get; set; } = new();
    public CategoryDayFreeKmPricingSectionDto DayFreeKm { get; set; } = new();
    public CategoryWeekIncludedKmPricingSectionDto WeekIncludedKm { get; set; } = new();
    public CategoryWeekFreeKmPricingSectionDto WeekFreeKm { get; set; } = new();
    public CategoryThirtyDayIncludedKmPricingSectionDto ThirtyDayIncludedKm { get; set; } = new();
    public CategoryWeekendPricingSectionDto Weekend { get; set; } = new();
    public CategoryWeekendIncludedKmPricingSectionDto WeekendIncludedKm { get; set; } = new();
    public CategoryWeekendFreeKmPricingSectionDto WeekendFreeKm { get; set; } = new();
    public CategoryHourIncludedKmPricingSectionDto HourIncludedKm { get; set; } = new();
    public CategoryServicePricingSectionDto Service { get; set; } = new();
    public CategoryGuaranteePricingSectionDto Guarantee { get; set; } = new();
}

public sealed class CategoryDayPricingSectionDto
{
    public decimal? PricePerDay { get; set; }
    public decimal? PricePerKm { get; set; }
}

public sealed class CategoryDayFreeKmPricingSectionDto
{
    public decimal? PricePerDay { get; set; }
}

public sealed class CategoryWeekIncludedKmPricingSectionDto
{
    public decimal? PricePerWeek { get; set; }
    public decimal? IncludedKmPerWeek { get; set; }
    public decimal? PricePerExtraDay { get; set; }
    public decimal? IncludedKmPerExtraDay { get; set; }
    public decimal? PricePerExcessKm { get; set; }
}

public sealed class CategoryWeekFreeKmPricingSectionDto
{
    public decimal? PricePerWeek { get; set; }
    public decimal? PricePerExtraDay { get; set; }
}

public sealed class CategoryThirtyDayIncludedKmPricingSectionDto
{
    public decimal? PricePer30Days { get; set; }
    public decimal? IncludedKmPer30Days { get; set; }
    public decimal? PricePerExtraDay { get; set; }
    public decimal? IncludedKmPerExtraDay { get; set; }
    public decimal? PricePerExcessKm { get; set; }
}

public sealed class CategoryWeekendPricingSectionDto
{
    public int? FromDayOfWeek { get; set; }
    public string? FromTime { get; set; }
    public int? ToDayOfWeek { get; set; }
    public string? ToTime { get; set; }
    public decimal? WeekendPrice { get; set; }
    public decimal? PricePerKm { get; set; }
}

public sealed class CategoryWeekendIncludedKmPricingSectionDto
{
    public int? FromDayOfWeek { get; set; }
    public string? FromTime { get; set; }
    public int? ToDayOfWeek { get; set; }
    public string? ToTime { get; set; }
    public decimal? WeekendPrice { get; set; }
    public decimal? IncludedKm { get; set; }
    public decimal? PricePerExcessKm { get; set; }
}

public sealed class CategoryWeekendFreeKmPricingSectionDto
{
    public int? FromDayOfWeek { get; set; }
    public string? FromTime { get; set; }
    public int? ToDayOfWeek { get; set; }
    public string? ToTime { get; set; }
    public decimal? WeekendPrice { get; set; }
}

public sealed class CategoryHourIncludedKmPricingSectionDto
{
    public decimal? PricePerHour { get; set; }
    public decimal? IncludedKmPerHour { get; set; }
    public decimal? PricePerExcessKm { get; set; }
}

public sealed class CategoryServicePricingSectionDto
{
    public decimal? PricePerServiceDay { get; set; }
    public decimal? IncludedKmPerDay { get; set; }
    public decimal? PricePerExcessKm { get; set; }
}

public sealed class CategoryGuaranteePricingSectionDto
{
    public decimal? PricePerGuaranteeDay { get; set; }
}

public sealed class ExecuteReservationPricingRequestDto
{
    public int ReservationId { get; set; }
    public DateTime CalculateToDate { get; set; }
    public string? PriceType { get; set; }
}

public sealed class ExecuteReservationPricingResponseDto
{
    public int ReservationId { get; set; }
    public int NewReservationCalcId { get; set; }
    public string PriceTypeUsed { get; set; } = string.Empty;
    public DateTime PeriodFrom { get; set; }
    public DateTime PeriodTo { get; set; }
    public List<ReservationCalcResultDto> ReservationCalcs { get; set; } = [];
}

public sealed class ReservationCalcResultDto
{
    public int Id { get; set; }
    public DateTime? DateTimeFrom { get; set; }
    public DateTime? DateTimeTo { get; set; }
    public string ReceiverTypeCode { get; set; } = string.Empty;
    public List<ReservationCalcResultItemDto> ReservationCalcItems { get; set; } = [];
}

public sealed class ReservationCalcResultItemDto
{
    public int Id { get; set; }
    public int? ItemId { get; set; }
    public int? PriceListId { get; set; }
    public int? VatId { get; set; }
    public decimal? VatRate { get; set; }
    public string CalcPriceTypeCode { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public decimal? Qty { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal? Sum { get; set; }
}