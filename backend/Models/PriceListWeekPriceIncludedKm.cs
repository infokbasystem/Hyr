namespace Backend.Models
{
    public class PriceListWeekPriceIncludedKm
    {
        public int Id { get; set; }
        public int? PriceListId { get; set; }
        public int? ItemCategoryId { get; set; }
        public decimal? PricePerWeek { get; set; }
        public decimal? IncludedKmPerWeek { get; set; }
        public decimal? PricePerExtraDay { get; set; }
        public decimal? IncludedKmPerExtraDay { get; set; }
        public decimal? PricePerExcessKm { get; set; }
        public DateTime? CreatedAt { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? UpdatedBy { get; set; }

        public virtual PriceList? PriceList { get; set; }
        public virtual ItemCategory? ItemCategory { get; set; }
    }
}
