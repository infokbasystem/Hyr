namespace Hyr.Api.Models
{
    public class SmsText
    {
        public int Id { get; set; }
        public int OfficeId { get; set; }
        public string Item { get; set; } = string.Empty;
        public string Titel { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;

        public virtual Office? Office { get; set; }
    }
}
