namespace Backend.Filters;

public class PlanningReservationFilter
{
    public List<int>? VehicleIds { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}