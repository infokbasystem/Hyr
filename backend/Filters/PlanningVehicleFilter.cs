namespace Backend.Filters
{
    public class PlanningVehicleFilter
    {
        public List<int>? CategoryIds { get; set; }
        public string? CategoryName { get; set; }
        public string? ModelName { get; set; }
        public DateTime? AvailableFrom { get; set; }
        public DateTime? AvailableTo { get; set; }
        public bool? IsActive { get; set; } = true;
        public string? SearchTerm { get; set; }
    }
}
