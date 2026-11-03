namespace Backend.Filters;

public class PlanningReservationFilter
{
    public List<int>? CategoryIds { get; set; }
    public List<int>? VehicleIds { get; set; }
    public string? ItemTypeCode { get; set; }
    public List<string>? CabinTypeCodes { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}