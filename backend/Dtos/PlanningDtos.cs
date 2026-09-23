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
