namespace Hyr.Api.Models
{
    public class PriceListWeekendPrice
    {
        public int Id { get; set; }
        public int? PriceListId { get; set; }
        public int? ItemCategoryId { get; set; }
        public int? FromDayOfWeek { get; set; }
        public TimeSpan? FromTime { get; set; }
        public int? ToDayOfWeek { get; set; }
        public TimeSpan? ToTime { get; set; }
        public decimal? WeekendPrice { get; set; }
        public decimal? PricePerKm { get; set; }
        public DateTime? CreatedAt { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? UpdatedBy { get; set; }

        public virtual PriceList? PriceList { get; set; }
        public virtual ItemCategory? ItemCategory { get; set; }
    }
}
