namespace Backend.Filters;

public sealed record PlanningLiftFilter
{
    public List<int>? CategoryIds { get; init; }
    public DateTime? AvailableFrom { get; init; }
    public DateTime? AvailableTo { get; init; }
    public bool? IsActive { get; init; } = true;
}