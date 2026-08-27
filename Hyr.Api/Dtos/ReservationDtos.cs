namespace Hyr.Api.Dtos;

using Hyr.Api.Models;

public sealed record ReservationSearchRowDto(
    int Id,
    int? ReservationNr,
    string CustomerName,
    DateTime? CreatedDate,
    string StatusCode,
    string Note,
    string? OfficeLocation);

public sealed class ReservationFormOptionsDto
{
    public List<ItemTypeOptionDto> ItemTypes { get; set; } = [];
    public List<ItemCategoryOptionDto> ItemCategories { get; set; } = [];
    public List<PriceListOptionDto> PriceLists { get; set; } = [];
    public string DefaultBookedFromTime { get; set; } = string.Empty;
    public string DefaultBookedToTime { get; set; } = string.Empty;
}

public sealed class PriceListOptionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public sealed class ReservationUpsertDto
{
    public int Id { get; set; }
    public int? CustomerId { get; set; }
    public string StatusCode { get; set; } = string.Empty;
    public string DriverName { get; set; } = string.Empty;
    public string PickUpBy { get; set; } = string.Empty;
    public string TelephoneWorkplace { get; set; } = string.Empty;
    public string DeliveryPlace { get; set; } = string.Empty;
    public string CustomerMarking { get; set; } = string.Empty;
    public string DriverMobilePhone { get; set; } = string.Empty;
    public string DriverNote { get; set; } = string.Empty;
    public string DriverLicenceNr { get; set; } = string.Empty;
    public DateTime? DriverLicenceExpireDate { get; set; }
    public string Orderer { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string MobilePhone { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
    public decimal? Deposition { get; set; }
    public int? PriceListId { get; set; }
    public string Note { get; set; } = string.Empty;
    public string DeliveryPlaceNote { get; set; } = string.Empty;
    public string PickupPlaceNote { get; set; } = string.Empty;
    public bool IsOngoingInvoicing { get; set; }
    public string OngoingInvoicingInterval { get; set; } = string.Empty;
    public string PricingCalendarCode { get; set; } = ReservationPricingCalendarCodes.AllDays;
    public ICollection<ReservationItem> ReservationItems { get; set; } = new List<ReservationItem>();
    public ICollection<ReservationCalc> ReservationCalcs { get; set; } = new List<ReservationCalc>();
}
