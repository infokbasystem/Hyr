namespace Backend.Dtos;

public class OperationsOverviewDto
{
    public double CurrentUtilization { get; set; }
    public double YtdUtilization { get; set; }
    public double LastYearYtdUtilization { get; set; }
    public double YtdUtilizationDelta { get; set; }
    public List<ReturnedNotCheckedInDto> ReturnedNotCheckedIn { get; set; } = [];
    public List<SpecialHandlingItemDto> SpecialHandlingItems { get; set; } = [];
}

public class ReturnedNotCheckedInDto
{
    public int ReservationId { get; set; }
    public int? ReservationNr { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<string> Items { get; set; } = [];
    public DateTime? ActualTo { get; set; }
    public int DaysSinceReturn { get; set; }
    public string InternalNote { get; set; } = string.Empty;
}

public class SpecialHandlingItemDto
{
    public int Id { get; set; }
    public string ItemNr { get; set; } = string.Empty;
    public string RegNr { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string ItemTypeName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime? UnavailableFrom { get; set; }
    public DateTime? UnavailableTo { get; set; }
    public int? DaysCount { get; set; }
    public string BadgeText { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
}
