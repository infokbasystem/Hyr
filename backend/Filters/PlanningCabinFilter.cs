namespace Backend.Filters
{
    public class PlanningCabinFilter
    {
        public List<string>? CabinTypeCodes { get; set; }
        public DateTime? AvailableFrom { get; set; }
        public DateTime? AvailableTo { get; set; }
        public bool? IsActive { get; set; } = true;
    }
}
