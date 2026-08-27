using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Hyr.Api.Models
{
    public class ItemCategory
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public string Name { get; set; } = string.Empty;

        public virtual Office? Office { get; set; }
        public virtual ICollection<Item>? Items { get; set; } = new List<Item>();
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