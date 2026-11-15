namespace Backend.Dtos;

public sealed class MobileAvailableItemsFilter
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? ItemTypeCode { get; set; }
    public string? SearchTerm { get; set; }
}

public sealed record MobileAvailableItemDto
{
    public int Id { get; init; }
    public string ItemNr { get; init; } = string.Empty;
    public string RegNr { get; init; } = string.Empty;
    public string SerialNr { get; init; } = string.Empty;
    public string ItemTypeCode { get; init; } = string.Empty;
    public string ItemTypeName { get; init; } = string.Empty;
    public string ItemCategoryName { get; init; } = string.Empty;
    public string ItemModelName { get; init; } = string.Empty;
    public string Manufacturer { get; init; } = string.Empty;
    /// <summary>Start of the item's next booking after the requested period, if any.</summary>
    public DateTime? NextBookedFrom { get; init; }
    /// <summary>Reservation where the item has been returned but not yet checked in, if any.</summary>
    public int? CheckInReservationId { get; init; }
}

public static class MobileItemStatusActions
{
    public const string Deliver = "deliver";
    public const string Return = "return";
    public const string CheckIn = "checkin";
}

public sealed class MobileItemStatusRequest
{
    public string Action { get; set; } = string.Empty;
    /// <summary>Rows to update; null updates every row eligible for the action.</summary>
    public List<int>? ReservationItemIds { get; set; }
    /// <summary>Local delivery/return time; defaults to now rounded to the nearest quarter hour.</summary>
    public DateTime? At { get; set; }
}

public sealed record MobileItemStatusResultDto
{
    public int ReservationId { get; init; }
    public string StatusCode { get; init; } = string.Empty;
    public List<int> UpdatedReservationItemIds { get; init; } = [];
}
