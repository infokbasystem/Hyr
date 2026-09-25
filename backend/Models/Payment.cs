namespace Backend.Models
{
    public class Payment
    {
        public int Id { get; set; }
        public int OfficeId { get; set; }
        public int InvoiceId { get; set; }
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public string? FortnoxPaymentNumber { get; set; }
        public string? FortnoxInvoiceNumber { get; set; }
        public decimal? AmountCurrency { get; set; }
        public string? Currency { get; set; }
        public decimal? CurrencyRate { get; set; }
        public decimal? CurrencyUnit { get; set; }
        public bool? Booked { get; set; }
        public string? FortnoxSource { get; set; }
        public DateTime? SyncedAtUtc { get; set; }
        public DateTime? CreatedDate { get; set; }
        public DateTime? ModifiedDate { get; set; }

        public virtual Office? Office { get; set; }
        public virtual Invoice? Invoice { get; set; }
    }
}
