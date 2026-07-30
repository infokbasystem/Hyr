namespace Hyr.Api.Dtos;

public class ServiceTypeDto
{
    public int Id { get; set; }
    public int? OfficeId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class ServiceTypeUpsertDto
{
    public int Id { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}