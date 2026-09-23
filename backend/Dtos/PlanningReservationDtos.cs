namespace Backend.Dtos;

public class PlanningReservationDto
{
    public int Id { get; set; }
    public int ReservationId { get; set; }
    public int VehicleId { get; set; }
    public int? ReservationNr { get; set; }
    public string Customer { get; set; } = string.Empty;
    public DateTime? Start { get; set; }
    public DateTime? End { get; set; }
    public string Status { get; set; } = string.Empty;
}

public sealed record UpdatePlanningReservationRequest
{
    public required int VehicleId { get; init; }
    public required DateTimeOffset Start { get; init; }
    public required DateTimeOffset End { get; init; }
}

public sealed record UpdatePlanningReservationResponse(string Status);