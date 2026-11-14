using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models
{
    public class Article
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public string ArticleNr { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal? Price { get; set; }
        public int? AccountId { get; set; }
        [NotMapped]
        public int? AccountNr { get; set; }
        public int? VatRateId { get; set; }
        public bool IsActive { get; set; }
        public string KeyFortnox { get; set; } = string.Empty;

        // Set only for auto-created system articles that back a calc price type.
        public string? CalcPriceTypeCode { get; set; }

        public virtual Office? Office { get; set; }
        public virtual Account? Account { get; set; }
        public virtual VatRate? VatRate { get; set; }

        public virtual ICollection<InvoiceRow> InvoiceRows { get; set; } = new List<InvoiceRow>();
        [JsonIgnore]
        public virtual ICollection<CategoryArticle> CategoryArticles { get; set; } = new List<CategoryArticle>();
        [JsonIgnore]
        public virtual ICollection<ReservationItemArticle> ReservationItemArticles { get; set; } = new List<ReservationItemArticle>();

    }
}