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
        public string SerialNr { get; set; } = string.Empty;
        public string YearModel { get; set; } = string.Empty;
        public string Fuel { get; set; } = string.Empty;
        public string Equipment { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public string ItemNr { get; set; } = string.Empty;
        public string PopupText { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public string Manufacturer { get; set; } = string.Empty;
        public string ArticleNr { get; set; } = string.Empty;
        public bool ShowInPlanning { get; set; }
        public int? SortNr { get; set; }
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
        public decimal? FuelConsumptionLitresPerKm { get; set; }
        public decimal? FuelConsumptionLitresPerHour { get; set; }
        public decimal? ReplacementCost { get; set; }
        public int? NrOfItemsTotal { get; set; }
        public bool IsStorageItem   { get; set; }
        public bool IsPartOfPackage { get; set; }
        public bool CalculatePriceFromPartPrices { get; set; }
        public bool UnavailableForReservation { get; set; }  
        public string UnavailableReason { get; set; } = string.Empty;
        public DateTime? UnavailableFrom { get; set; }
        public DateTime? UnavailableTo { get; set; }
        public string AccountNr { get; set; } = string.Empty;
        public string CostCenterNr { get; set; } = string.Empty;
        public DateTime? CreatedAt { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? UpdatedBy { get; set; }


        public virtual Office? Office { get; set; }
        public virtual ItemType? ItemType { get; set; }
        public virtual ItemCategory? ItemCategory { get; set; }
        public virtual ItemModel? ItemModel { get; set; }
        public virtual User? CreatedByUser { get; set; }
        public virtual User? UpdatedByUser { get; set; }
        public virtual ICollection<ReservationItem>? ReservationItems { get; set; } = new List<ReservationItem>();
        public virtual ICollection<ReservationCalcItem>? ReservationCalcItems { get; set; } = new List<ReservationCalcItem>();
        public virtual ICollection<InvoiceRow>? InvoiceRows { get; set; } = new List<InvoiceRow>();
        public virtual ICollection<ItemPackageItem>? PackageItems { get; set; } = new List<ItemPackageItem>();
        public virtual ICollection<ItemPackageItem>? IncludedInItems { get; set; } = new List<ItemPackageItem>();

        [NotMapped]
        public string CreatedByName
        {
            get => CreatedByUser != null ? CreatedByUser.Name : string.Empty;
        }

        [NotMapped]
        public string UpdatedByName
        {
            get => UpdatedByUser != null ? UpdatedByUser.Name : string.Empty;
        }




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