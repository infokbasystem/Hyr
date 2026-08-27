namespace Hyr.Api.Dtos;

using Hyr.Api.Models;

public sealed class InvoiceDto
{
    public int Id { get; set; }
    public int? OfficeId { get; set; }
    public int? CreatedByUserId { get; set; }
    public DateTime? CreatedDate { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public int? ModifiedByUserId { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public string ModifiedByUserName { get; set; } = string.Empty;
    public int? InvoiceNr { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }
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
    public ICollection<InvoiceRow> InvoiceRows { get; set; } = new List<InvoiceRow>();
}

public sealed class InvoiceUpsertDto
{
    public int Id { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public string InvoicePayMethod { get; set; } = string.Empty;
    public int? NrOfInvoiceDays { get; set; }
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
    public string ExportResult { get; set; } = string.Empty;
    public string CrediflowSessionId { get; set; } = string.Empty;
    public ICollection<InvoiceRow> InvoiceRows { get; set; } = new List<InvoiceRow>();
}

public sealed class InvoiceCurrencyOptionDto
{
    public int Id { get; set; }
    public string CurrencyName { get; set; } = string.Empty;
    public decimal? PurchaseCurrencyRate { get; set; }
    public decimal? SalesCurrencyRate { get; set; }
    public bool IsDefault { get; set; }
}

public sealed class InvoicePaymentMethodOptionDto
{
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public sealed class InvoiceFormOptionsDto
{
    public List<InvoiceCurrencyOptionDto> Currencies { get; set; } = [];
    public List<InvoicePaymentMethodOptionDto> PaymentMethods { get; set; } = [];
}
