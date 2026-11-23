namespace Backend.Dtos;

public class PlanningVehicleDto
{
    public int Id { get; set; }
    public string RegNr { get; set; } = string.Empty;
    public string ItemNr { get; set; } = string.Empty;
    public int? ItemCategoryId { get; set; }
    public string ItemCategoryName { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string ItemModelName { get; set; } = string.Empty;
    public int CurrentStatus { get; set; } = 3;
}

public class PlanningCategoryOptionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class PlanningCabinDto
{
    public int Id { get; set; }
    public string ItemNr { get; set; } = string.Empty;
    public string SerialNr { get; set; } = string.Empty;
    public string? CabinTypeCode { get; set; }
    public string CabinTypeName { get; set; } = string.Empty;
    public int? ItemCategoryId { get; set; }
    public string ItemCategoryName { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string ItemModelName { get; set; } = string.Empty;
    public int CurrentStatus { get; set; } = 3;
}

public class PlanningCabinTypeOptionDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public sealed record PlanningLiftDto
{
    public int Id { get; init; }
    public string ItemNr { get; init; } = string.Empty;
    public string SerialNr { get; init; } = string.Empty;
    public int? ItemCategoryId { get; init; }
    public string ItemCategoryName { get; init; } = string.Empty;
    public string Manufacturer { get; init; } = string.Empty;
    public string ItemModelName { get; init; } = string.Empty;
    public int CurrentStatus { get; init; } = 3;
}

/// <summary>An unreturned rental item in the current office's customer overview.</summary>
public sealed record PlanningCustomerRentalDto
{
    public int Id { get; init; }
    public int ReservationId { get; init; }
    public int? CustomerId { get; init; }
    public string Customer { get; init; } = string.Empty;
    public int ItemId { get; init; }
    public string ItemNr { get; init; } = string.Empty;
    public string ItemName { get; init; } = string.Empty;
    public string RegNr { get; init; } = string.Empty;
    public string SerialNr { get; init; } = string.Empty;
    public string DeliveryPlace { get; init; } = string.Empty;
    public string CustomerMarking { get; init; } = string.Empty;
    public string PlacementStreet { get; init; } = string.Empty;
    public string PlacementZipCode { get; init; } = string.Empty;
    public string PlacementCity { get; init; } = string.Empty;
    public decimal? PlacementLatitude { get; init; }
    public decimal? PlacementLongitude { get; init; }
    public DateTimeOffset? Start { get; init; }
    public DateTimeOffset? End { get; init; }
    public string Status { get; init; } = string.Empty;
}
