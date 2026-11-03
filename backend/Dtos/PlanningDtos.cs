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
}

public class PlanningCabinTypeOptionDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}
