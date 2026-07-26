namespace Hyr.Api.Dtos;

public class ItemCategoryDto
{
    public int Id { get; set; }
    public int? OfficeId { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class ItemCategoryUpsertDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
