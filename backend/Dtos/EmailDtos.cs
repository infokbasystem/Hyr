namespace Backend.Dtos
{
    /// <summary>Confirms SMTP acceptance and reports whether an invoice status was saved.</summary>
    public sealed record EmailSendResponse(
        string Message,
        bool? InvoiceStatusUpdated,
        string? Warning,
        int? InvoiceId,
        int? ReservationId,
        DateTimeOffset? ModifiedDate,
        int? ModifiedByUserId);

    /// <summary>Describes a safe, user-facing email delivery error.</summary>
    public sealed record EmailErrorResponse(string Message);
}
