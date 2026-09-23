namespace Backend.Dtos;

public class VatDto
{
    public int Id { get; set; }
    public int? OfficeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? Rate { get; set; }
    public string ExternalCode { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsDefault { get; set; }
}

public class VatUpsertDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? Rate { get; set; }
    public string ExternalCode { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsDefault { get; set; }
}