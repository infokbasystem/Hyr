namespace Backend.Dtos;

public class DepartmentDto
{
    public int Id { get; set; }
    public int OfficeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class DepartmentUpsertDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}