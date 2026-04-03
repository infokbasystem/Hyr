namespace Hyr.Api.Models
{
    public class Article
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public string ArticleNr { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal? Price { get; set; }
        public int? AccountId { get; set; }
        public int? VatRateId { get; set; }
        public bool IsActive { get; set; }

        public virtual Office? Office { get; set; }
        public virtual Account? Account { get; set; }
        public virtual VatRate? VatRate { get; set; }

        public virtual ICollection<InvoiceRow> InvoiceRows { get; set; } = new List<InvoiceRow>();

    }
}