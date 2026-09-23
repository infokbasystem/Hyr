namespace Backend.Models
{
    public class MailText
    {
        public int Id { get; set; }
        public int OfficeId { get; set; }
        public string Item { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string BodyHtml { get; set; } = string.Empty;

        public virtual Office? Office { get; set; }
    }
}
