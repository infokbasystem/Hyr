using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Hyr.Api.Models
{
    public class Item
    {
        public int Id { get; set; }
        public int OfficeId { get; set; }
        public string ItemTypeCode { get; set; } = string.Empty;
        public int? ItemCategoryId { get; set; }
        public int? ItemModelId { get; set; }
        public string RegNr { get; set; } = string.Empty;
        public string MachineNr { get; set; } = string.Empty;
        public string YearModel { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public string ItemNr { get; set; } = string.Empty;
        public string PopupText { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public string Manufacturer { get; set; } = string.Empty;
        public int? ImportId { get; set; }
        public string ImportSource { get; set; } = string.Empty;
        public int? PlatformHeightMm { get; set; }
        public int? PlatformLengthMm { get; set; }
        public decimal? WeightKg { get; set; }
        public decimal? HourMeter { get; set; }
        public int? KmReading { get; set; }
        public decimal? BasePrice { get; set; }
        public decimal? PricePerHour { get; set; }
        public decimal? PricePerDay { get; set; }
        public decimal? PricePerWeek { get; set; }
        public decimal? PricePerMonth { get; set; }
        public decimal? PricePerKm { get; set; }
        public decimal? ReplacementCost { get; set; }
        public int? NrOfItemsTotal { get; set; }
        public bool IsStorageItem   { get; set; }
        public bool UnavailableForReservation { get; set; }  
        public string UnavailableReason { get; set; } = string.Empty;
        public DateTime? UnavailableFrom { get; set; }
        public DateTime? UnavailableTo { get; set; }
        public string AccountNr { get; set; } = string.Empty;
        public string CostCenterNr { get; set; } = string.Empty;


        public virtual Office? Office { get; set; }
        public virtual ItemCategory? ItemCategory { get; set; }
        public virtual ItemModel? ItemModel { get; set; }
        public virtual ICollection<ReservationItem>? ReservationItems { get; set; } = new List<ReservationItem>();
        public virtual ICollection<ReservationCalcItem>? ReservationCalcItems { get; set; } = new List<ReservationCalcItem>();
        public virtual ICollection<InvoiceRow>? InvoiceRows { get; set; } = new List<InvoiceRow>();




        // [NotMapped]
        // public int lngItem_ID { get; set; }
        // [NotMapped]
        // public string? strItem { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strMachineNr { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strAccount { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strCostCenterNr { get; set; } = string.Empty;

    }
}