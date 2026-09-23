namespace Backend.Dtos;

public class AccountDto
{
    public int Id { get; set; }
    public int? OfficeId { get; set; }
    public int? AccountNr { get; set; }
    public string? SystemCode { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class AccountUpsertDto
{
    public int Id { get; set; }
    public int? AccountNr { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
