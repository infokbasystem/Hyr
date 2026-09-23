namespace Backend.Models
{
    public class TinkPaymentRequest
    {
        public int Id { get; set; }
        public int OfficeId { get; set; }
        public int InvoiceId { get; set; }
        public string TinkRequestId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string Market { get; set; } = string.Empty;
        public string LinkUrl { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string StatusMessage { get; set; } = string.Empty;
        public string SentEmail { get; set; } = string.Empty;
        public string SentMobile { get; set; } = string.Empty;
        public DateTime? SentDate { get; set; }
        public int? PaymentId { get; set; }
        public DateTime? CreatedDate { get; set; }
        public int? CreatedByUserId { get; set; }
        public DateTime? ModifiedDate { get; set; }

        public virtual Office? Office { get; set; }
        public virtual Invoice? Invoice { get; set; }
        public virtual Payment? Payment { get; set; }
    }
}
