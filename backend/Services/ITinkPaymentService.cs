using Backend.Models;

namespace Backend.Services
{
    public record TinkPaymentRequestResult(string TinkRequestId, string LinkUrl, decimal Amount, string Currency, string Market);

    public record TinkPaymentStatusResult(string Status, string StatusMessage);

    public interface ITinkPaymentService
    {
        Task<TinkPaymentRequestResult> CreatePaymentRequestAsync(Office office, Invoice invoice, decimal amount, CancellationToken cancellationToken = default);

        Task<TinkPaymentStatusResult> GetStatusAsync(Office office, string tinkRequestId, CancellationToken cancellationToken = default);
    }
}
