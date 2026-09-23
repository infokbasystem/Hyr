
namespace Backend.Models
{
    public class PriceList
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public bool IsActive { get; set; }
        public int? Priority { get; set; }
        public DateTime? CreatedAt { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? UpdatedBy { get; set; }

        public virtual Office? Office { get; set; }

        public virtual ICollection<ReservationCalcItem> ReservationCalcItems { get; set; } = new List<ReservationCalcItem>();
        public virtual ICollection<Customer> CustomersWithDefaultPriceList { get; set; } = new List<Customer>();
        public virtual ICollection<Reservation> ReservationsWithPriceListOverride { get; set; } = new List<Reservation>();
        public virtual ICollection<PriceListDayPrice> DayPrices { get; set; } = new List<PriceListDayPrice>();
        public virtual ICollection<PriceListDayPriceFreeKm> DayPriceFreeKms { get; set; } = new List<PriceListDayPriceFreeKm>();
        public virtual ICollection<PriceListWeekPriceIncludedKm> WeekPriceIncludedKms { get; set; } = new List<PriceListWeekPriceIncludedKm>();
        public virtual ICollection<PriceListWeekPriceFreeKm> WeekPriceFreeKms { get; set; } = new List<PriceListWeekPriceFreeKm>();
        public virtual ICollection<PriceListThirtyDayPriceIncludedKm> ThirtyDayPriceIncludedKms { get; set; } = new List<PriceListThirtyDayPriceIncludedKm>();
        public virtual ICollection<PriceListWeekendPrice> WeekendPrices { get; set; } = new List<PriceListWeekendPrice>();
        public virtual ICollection<PriceListHourPriceIncludedKm> HourPriceIncludedKms { get; set; } = new List<PriceListHourPriceIncludedKm>();
        public virtual ICollection<PriceListServicePrice> ServicePrices { get; set; } = new List<PriceListServicePrice>();
        public virtual ICollection<PriceListGuaranteePrice> GuaranteePrices { get; set; } = new List<PriceListGuaranteePrice>();
        public virtual ICollection<PriceListWeekendPriceIncludedKm> WeekendPriceIncludedKms { get; set; } = new List<PriceListWeekendPriceIncludedKm>();
        public virtual ICollection<PriceListWeekendPriceFreeKm> WeekendPriceFreeKms { get; set; } = new List<PriceListWeekendPriceFreeKm>();
    }
}