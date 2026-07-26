namespace Hyr.Api.Dtos;

public class ItemModelDto
{
    public int Id { get; set; }
    public int? OfficeId { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class ItemModelUpsertDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
