using System.ComponentModel.DataAnnotations.Schema;

namespace Hyr.Api.Models.Print
{
    public class InvoiceRow
    {
        public string Id { get; set; } = string.Empty;
        public string OfficeId { get; set; } = string.Empty;
        public string InvoiceId { get; set; } = string.Empty;
        public string ItemId { get; set; } = string.Empty;
        public string ReservationCalcItemId { get; set; } = string.Empty;
        public string SortNr { get; set; } = string.Empty;
        public string ArticleId { get; set; } = string.Empty;
        public string ArticleNr { get; set; } = string.Empty;
        public string InvoiceRowType { get; set; } = string.Empty;
        public string Text1 { get; set; } = string.Empty;
        public string Text2 { get; set; } = string.Empty;
        public string Qty { get; set; } = string.Empty;
        public string UnitPrice { get; set; } = string.Empty;
        public string Sum { get; set; } = string.Empty;
        public string VatRate { get; set; } = string.Empty;
        public string AccountNr { get; set; } = string.Empty;
        public string CostCenter { get; set; } = string.Empty;
        public string DiscountRate { get; set; } = string.Empty;

    
    }
}