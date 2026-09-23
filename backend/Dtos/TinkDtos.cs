namespace Backend.Dtos
{
    public class TinkPaymentRequestDto
    {
        public int Id { get; set; }
        public int InvoiceId { get; set; }
        public string TinkRequestId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string LinkUrl { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string StatusMessage { get; set; } = string.Empty;
        public bool IsSettled { get; set; }
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerMobilePhone { get; set; } = string.Empty;
    }

    public class TinkSendRequestDto
    {
        public string Channel { get; set; } = string.Empty;
        public string To { get; set; } = string.Empty;
    }
}
