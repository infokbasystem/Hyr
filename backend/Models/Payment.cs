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
        public DateTime? CreatedDate { get; set; }
        public DateTime? ModifiedDate { get; set; }

        public virtual Office? Office { get; set; }
        public virtual Invoice? Invoice { get; set; }
    }
}
