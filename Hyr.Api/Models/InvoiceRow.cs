using System.ComponentModel.DataAnnotations.Schema;

namespace Hyr.Api.Models
{
    public class InvoiceRow
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public int? InvoiceId { get; set; }
        public int? ItemId { get; set; }
        public int? ReservationCalcItemId { get; set; }
        public int? SortNr { get; set; }
        public int? ArticleId { get; set; }
        public string ArticleNr { get; set; } = string.Empty;
        public string InvoiceRowType { get; set; } = string.Empty;
        public string Text1 { get; set; } = string.Empty;
        public string Text2 { get; set; } = string.Empty;
        public decimal? Qty { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? Sum { get; set; }
        public decimal? VatRate { get; set; }
        public int? AccountNr { get; set; }
        public string CostCenter { get; set; } = string.Empty;
        public decimal? DiscountRate { get; set; }

        public virtual Office? Office { get; set; }
        public virtual Invoice? Invoice { get; set; }
        public virtual Item? Item { get; set; }
        public virtual ReservationCalcItem? ReservationCalcItem { get; set; }
        public virtual Article? Article { get; set; }




        // [NotMapped]
        // public int lngInvoiceRow_ID { get; set; }
        // [NotMapped]
        // public int lngInvoice_ID { get; set; }
        // [NotMapped]
        // public int? lngSortOrder { get; set; }
        // [NotMapped]
        // public int? lngItem_ID { get; set; }
        // [NotMapped]
        // public int? lngItemType_ID { get; set; }
        // [NotMapped]
        // public string? strPriceKey { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strArticleNr { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strText0 { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strText { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strText2 { get; set; } = string.Empty;
        // [NotMapped]
        // public double? dblNrOf { get; set; }
        // [NotMapped]
        // public double? dblUnitPrice { get; set; }
        // [NotMapped]
        // public double? dblSum { get; set; }
        // [NotMapped]
        // public bool bolVATGround { get; set; }
        // [NotMapped]
        // public string? strAccountNr { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strCostCenter { get; set; } = string.Empty;

    }
}