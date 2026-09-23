namespace Backend.Dtos;

public class SmsTextDto
{
    public int Id { get; set; }
    public int OfficeId { get; set; }
    public string Item { get; set; } = string.Empty;
    public string Titel { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public class SmsTextUpsertDto
{
    public int Id { get; set; }
    public string Item { get; set; } = string.Empty;
    public string Titel { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}
