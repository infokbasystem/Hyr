namespace Backend.Services
{
    public sealed record EmailAttachment(string FileName, string ContentType, byte[] Content);

    public sealed record EmailMessage(
        IReadOnlyList<string> To,
        IReadOnlyList<string> Cc,
        string Subject,
        string HtmlBody,
        IReadOnlyList<EmailAttachment> Attachments);

    public enum EmailDeliveryOutcome
    {
        NotSent,
        Unknown,
    }

    public sealed class EmailDeliveryException : Exception
    {
        public EmailDeliveryException(EmailDeliveryOutcome outcome, Exception innerException)
            : base("Email delivery failed.", innerException)
        {
            Outcome = outcome;
        }

        public EmailDeliveryOutcome Outcome { get; }
    }

    public sealed class EmailConfigurationException : InvalidOperationException
    {
        public EmailConfigurationException()
            : base("E-postutskick är inte korrekt konfigurerat.")
        {
        }
    }
}
