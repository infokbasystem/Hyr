namespace Backend.Services
{
    public interface IFortnoxInvoicePaymentSyncService
    {
        Task<FortnoxInvoicePaymentSyncResult> SyncAsync(
            int officeId,
            string accessToken,
            CancellationToken cancellationToken = default);
    }

    public sealed record FortnoxInvoicePaymentSyncResult(
        bool Skipped,
        int InsertedPayments,
        int UpdatedPayments,
        int DeletedPayments,
        int UpdatedInvoices,
        IReadOnlyList<string> Warnings);
}
