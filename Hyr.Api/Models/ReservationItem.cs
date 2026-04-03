namespace Hyr.Api.Models
{
    public class ReservationItem
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public int? ReservationId { get; set; }
        public int? SortNr { get; set; }
        public string ItemTypeCode { get; set; } = string.Empty;
        public int? ItemId { get; set; }
        public DateTime? BookedFrom { get; set; }
        public DateTime? BookedTo { get; set; }
        public DateTime? ActualFrom { get; set; }
        public DateTime? ActualTo { get; set; }
        public int? KmOut { get; set; }
        public int? KmIn { get; set; }
        public decimal? FuelLitres { get; set; }
        public decimal? FuelUnitPrice { get; set; }
        public int? DebitCategoryId { get; set; }
        public bool IsCheckedIn { get; set; }
        public bool EvProlonging { get; set; }
        public bool AbroadOk { get; set; }
        public bool NotRebookable { get; set; }
        public string DeliveryPlaceNote { get; set; } = string.Empty;
        public string PickupPlaceNote { get; set; } = string.Empty;
        public bool IsInsurance { get; set; }
        public int? InsuranceCompanyId { get; set; }
        public bool InsuranceCustomerIsCause { get; set; }
        public string InsuranceDamageNr { get; set; } = string.Empty;
        public DateTime? InsuranceDamageDate { get; set; }
        public decimal? InsuranceMaxAllowedCompensationCost { get; set; }
        public int? InsuranceMaxAllowedCompensationDays { get; set; }
        public string InsuranceCustomerRegNr { get; set; } = string.Empty;
        public string InsuranceCounterpartRegNr { get; set; } = string.Empty;
        public bool InsuranceIsSjalvriskReduction { get; set; }
        public decimal? InsuranceSjalvriskDayCost { get; set; }
        public bool InsuranceIsManualCalc { get; set; }
        public int? InsuranceManualCalcPercentSek { get; set; }
        public decimal? InsuranceManulaMaxCompensationCost { get; set; }
        public int? InsuranceManualMaxCompensationDays { get; set; }
        public decimal? InsuranceManualShareRent { get; set; }
        public int? InsuranceManualShareKm { get; set; }
        public decimal? InsuranceManualShareVat { get; set; }

        public virtual Office? Office { get; set; }
        public virtual Reservation? Reservation { get; set; }
        public virtual Item? Item { get; set; }
    }
}