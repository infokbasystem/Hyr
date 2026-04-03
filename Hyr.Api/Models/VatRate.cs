namespace Hyr.Api.Models
{
    public class VatRate
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal? Rate { get; set; }
        public string ExternalCode { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsDefault { get; set; }

        public virtual Office? Office { get; set; }

        public virtual ICollection<Article> Articles { get; set; } = new List<Article>();
    }
}