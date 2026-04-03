using System.ComponentModel.DataAnnotations.Schema;

namespace Hyr.Api.Models.Print
{
    public class Invoice
    {
        public string Id { get; set; } = string.Empty;
        public string OfficeId { get; set; } = string.Empty;
        public string CreatedByUserId { get; set; } = string.Empty;
        public string CreatedDate { get; set; } = string.Empty;
        public string ModifiedByUserId { get; set; } = string.Empty;
        public string ModifiedDate { get; set; } = string.Empty;
        public string InvoiceNr { get; set; } = string.Empty;
        public string InvoiceDate { get; set; } = string.Empty;
        public string DueDate { get; set; } = string.Empty;
        public string AccountedDate { get; set; } = string.Empty;
        public string InvoiceType { get; set; } = string.Empty;
        public string InvoicePayMethod { get; set; } = string.Empty;
        public string NrOfInvoiceDays { get; set; } = string.Empty;
        public string CreditingInvoiceId { get; set; } = string.Empty;
        public string CustomerId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerReference { get; set; } = string.Empty;
        public string VatNr { get; set; } = string.Empty;
        public string OrgNr { get; set; } = string.Empty;
        public string Street1 { get; set; } = string.Empty;
        public string Street2 { get; set; } = string.Empty;
        public string ZipCode { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string OurReference { get; set; } = string.Empty;
        public string YourReference { get; set; } = string.Empty;
        public string AccountNr { get; set; } = string.Empty;
        public string AccountNrVat { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public string IsCancelled { get; set; } = string.Empty;
        public string IsSettled { get; set; } = string.Empty;
        public string IsOkForAccounting { get; set; } = string.Empty;
        public string IsPrinted { get; set; } = string.Empty;
        public string IsEmailed { get; set; } = string.Empty;
        public string IsEInvoiced { get; set; } = string.Empty;
        public string TermsOfPayment { get; set; } = string.Empty;
        public string Marking { get; set; } = string.Empty;
        public string InvoiceFee { get; set; } = string.Empty;
        public string CurrencyRate { get; set; } = string.Empty;
        public string CurrencyId { get; set; } = string.Empty;
        public string PdfName { get; set; } = string.Empty;
        public string TotExVat { get; set; } = string.Empty;
        public string TotVat { get; set; } = string.Empty;
        public string TotSum { get; set; } = string.Empty;
        public string Rounding { get; set; } = string.Empty;
        public string ExportResult { get; set; } = string.Empty;
        public string CrediflowSessionId { get; set; } = string.Empty;

        public virtual ICollection<InvoiceRow> InvoiceRows { get; set; } = new List<InvoiceRow>();





    }
}