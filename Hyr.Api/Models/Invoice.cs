using System.ComponentModel.DataAnnotations.Schema;

namespace Hyr.Api.Models
{
    public class Invoice
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public int? CreatedByUserId { get; set; }
        public DateTime? CreatedDate { get; set; }
        public int? ModifiedByUserId { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public int? InvoiceNr { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public DateTime? AccountedDate { get; set; }
        public string InvoiceType { get; set; } = string.Empty;
        public string InvoicePayMethod { get; set; } = string.Empty;
        public int? NrOfInvoiceDays { get; set; }
        public int? CreditingInvoiceId { get; set; }
        public int? CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerReference { get; set; } = string.Empty;
        public string VatNr { get; set; } = string.Empty;
        public string OrgNr { get; set; } = string.Empty;
        public string Street1 { get; set; } = string.Empty;
        public string Street2 { get; set; } = string.Empty;
        public int? ZipCode { get; set; }
        public string City { get; set; } = string.Empty;
        public string OurReference { get; set; } = string.Empty;
        public string YourReference { get; set; } = string.Empty;
        public int? AccountNr { get; set; }
        public int? AccountNrVat { get; set; }
        public string Note { get; set; } = string.Empty;
        public bool IsCancelled { get; set; }
        public bool IsSettled { get; set; }
        public bool IsOkForAccounting { get; set; }
        public bool IsPrinted { get; set; }
        public bool IsEmailed { get; set; }
        public bool IsEInvoiced { get; set; }
        public string TermsOfPayment { get; set; } = string.Empty;
        public string Marking { get; set; } = string.Empty;
        public decimal? InvoiceFee { get; set; }
        public decimal? CurrencyRate { get; set; }
        public int? CurrencyId { get; set; }
        public string PdfName { get; set; } = string.Empty;
        public decimal? TotExVat { get; set; }
        public decimal? TotVat { get; set; }
        public decimal? TotSum { get; set; }
        public decimal? Rounding { get; set; }
        public string ExportResult { get; set; } = string.Empty;
        public string CrediflowSessionId { get; set; } = string.Empty;

        public virtual Office? Office { get; set; }
        public virtual User? CreatedByUser { get; set; }
        public virtual User? ModifiedByUser { get; set; }
        public virtual Customer? Customer { get; set; }
        public virtual ICollection<InvoiceRow> InvoiceRows { get; set; } = new List<InvoiceRow>();


        [NotMapped]
        public DateTime? DueDate { get; set; }


        // [NotMapped]
        // public int lngInvoice_ID { get; set; }
        // [NotMapped]
        // public int? lngCustomer_ID { get; set; }
        // [NotMapped]
        // public int? lngInvoiceNr { get; set; }
        // [NotMapped]
        // public int? lngInvoiceStatus_ID { get; set; }
        // [NotMapped]
        // public int? lngInvoicePayMethod_ID { get; set; }
        // [NotMapped]
        // public int? lngInvoiceType_ID { get; set; }
        // [NotMapped]
        // public int? lngCreditingInvoiceNr { get; set; }
        // [NotMapped]
        // public string? strOrganizationNr { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strCustomer { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strCustomerNr { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strPostalAddress { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strPostalCode { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strTelephone1 { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strYourRef { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strOurRef { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strNoteExternal { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strInvoiceText { get; set; } = string.Empty;
        // [NotMapped]
        // public int? lngInvoiceDays { get; set; }
        // [NotMapped]
        // public DateTime? dteInvoiceDate { get; set; }
        // [NotMapped]
        // public DateTime? dteAccountDate { get; set; }
        // [NotMapped]
        // public string? strCostCenter { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strAccount { get; set; } = string.Empty;
        // [NotMapped]
        // public bool bolInvoiceOK { get; set; }
        // [NotMapped]
        // public string? strMessage { get; set; } = string.Empty;
        // [NotMapped]
        // public bool bolPrinted { get; set; }
        // [NotMapped]
        // public string? strAddressExtra { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strAddress { get; set; } = string.Empty;

        // [NotMapped]
        // public DateTime? DueDate { get; set; }
        // [NotMapped]
        // public decimal TotalAmount { get; set; }

    }
}