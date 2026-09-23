namespace Backend.Dtos;

public class MailTextDto
{
    public int Id { get; set; }
    public int OfficeId { get; set; }
    public string Item { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
}

public class MailTextUpsertDto
{
    public int Id { get; set; }
    public string Item { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
}
