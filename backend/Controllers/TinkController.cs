using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TinkController : ControllerBase
    {
        private const string TemplateItem = "TINKPAYMENT";
        private const string PaymentMethodCode = "TINK";

        // Statuses from Tink that mean the money is on its way to our account.
        private static readonly string[] SettledStatuses =
        {
            "SENT",
            "PAID",
            "EXECUTED",
            "SETTLEMENT_COMPLETED",
        };

        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly ITinkPaymentService _tinkPaymentService;
        private readonly IEmailSender _emailSender;
        private readonly ISmsSender _smsSender;

        public TinkController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService,
            ITinkPaymentService tinkPaymentService,
            IEmailSender emailSender,
            ISmsSender smsSender)
        {
            _context = context;
            _currentUserService = currentUserService;
            _tinkPaymentService = tinkPaymentService;
            _emailSender = emailSender;
            _smsSender = smsSender;
        }

        [HttpPost("invoice/{invoiceId}/payment-request")]
        public async Task<IActionResult> CreatePaymentRequest(int invoiceId, CancellationToken cancellationToken)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (user.OfficeId == null)
            {
                return BadRequest(new { message = "Office not found" });
            }

            var invoice = await _context.Invoices
                .Include(i => i.InvoiceRows)
                .Include(i => i.Customer)
                .FirstOrDefaultAsync(i => i.Id == invoiceId && i.OfficeId == user.OfficeId.Value, cancellationToken);

            if (invoice == null)
            {
                return NotFound(new { message = "Fakturan hittades inte" });
            }

            if (invoice.IsSettled)
            {
                return BadRequest(new { message = "Fakturan är redan reglerad" });
            }

            var office = await _context.Offices.FirstOrDefaultAsync(o => o.Id == user.OfficeId.Value, cancellationToken);
            if (office == null)
            {
                return BadRequest(new { message = "Office not found" });
            }

            var amount = GetOutstandingAmount(invoice);

            try
            {
                var result = await _tinkPaymentService.CreatePaymentRequestAsync(office, invoice, amount, cancellationToken);

                var paymentRequest = new TinkPaymentRequest
                {
                    OfficeId = office.Id,
                    InvoiceId = invoice.Id,
                    TinkRequestId = result.TinkRequestId,
                    Amount = result.Amount,
                    Currency = result.Currency,
                    Market = result.Market,
                    LinkUrl = result.LinkUrl,
                    Status = "CREATED",
                    CreatedDate = DateTime.UtcNow,
                    CreatedByUserId = user.Id,
                };

                _context.TinkPaymentRequests.Add(paymentRequest);
                await _context.SaveChangesAsync(cancellationToken);

                return Ok(ToDto(paymentRequest, invoice));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("payment-request/{id}/send")]
        public async Task<IActionResult> SendPaymentRequest(int id, [FromBody] TinkSendRequestDto request, CancellationToken cancellationToken)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (user.OfficeId == null)
            {
                return BadRequest(new { message = "Office not found" });
            }

            var paymentRequest = await _context.TinkPaymentRequests
                .Include(p => p.Invoice)
                .FirstOrDefaultAsync(p => p.Id == id && p.OfficeId == user.OfficeId.Value, cancellationToken);

            if (paymentRequest == null)
            {
                return NotFound(new { message = "Betalningen hittades inte" });
            }

            if (paymentRequest.Invoice?.IsSettled == true)
            {
                return BadRequest(new { message = "Fakturan är redan reglerad" });
            }

            var channel = (request?.Channel ?? string.Empty).Trim().ToUpperInvariant();
            var to = (request?.To ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(to))
            {
                return BadRequest(new { message = "Mottagare saknas" });
            }

            try
            {
                if (channel == "EMAIL")
                {
                    var template = await _context.MailTexts
                        .AsNoTracking()
                        .FirstOrDefaultAsync(m => m.OfficeId == user.OfficeId.Value && m.Item == TemplateItem, cancellationToken);

                    var subject = string.IsNullOrWhiteSpace(template?.Subject) ? "Betala din faktura" : template!.Subject;
                    var body = string.IsNullOrWhiteSpace(template?.BodyHtml)
                        ? "<p>Betala din faktura på {{link}}</p>"
                        : template!.BodyHtml;

                    await _emailSender.SendAsync(to, ApplyPlaceholders(subject, paymentRequest), ApplyPlaceholders(body, paymentRequest), cancellationToken);
                    paymentRequest.SentEmail = to;
                }
                else if (channel == "SMS")
                {
                    var template = await _context.SmsTexts
                        .AsNoTracking()
                        .FirstOrDefaultAsync(s => s.OfficeId == user.OfficeId.Value && s.Item == TemplateItem, cancellationToken);

                    var text = string.IsNullOrWhiteSpace(template?.Text)
                        ? "Betala din faktura: {{link}}"
                        : template!.Text;

                    await _smsSender.SendAsync(to, ApplyPlaceholders(text, paymentRequest), cancellationToken);
                    paymentRequest.SentMobile = to;
                }
                else
                {
                    return BadRequest(new { message = "Ogiltig kanal. Använd EMAIL eller SMS." });
                }
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }

            paymentRequest.SentDate = DateTime.UtcNow;
            paymentRequest.ModifiedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            return Ok(ToDto(paymentRequest, paymentRequest.Invoice));
        }

        [HttpGet("payment-request/{id}/status")]
        public async Task<IActionResult> GetStatus(int id, CancellationToken cancellationToken)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (user.OfficeId == null)
            {
                return BadRequest(new { message = "Office not found" });
            }

            var paymentRequest = await _context.TinkPaymentRequests
                .Include(p => p.Invoice)
                .FirstOrDefaultAsync(p => p.Id == id && p.OfficeId == user.OfficeId.Value, cancellationToken);

            if (paymentRequest == null)
            {
                return NotFound(new { message = "Betalningen hittades inte" });
            }

            var office = await _context.Offices.FirstOrDefaultAsync(o => o.Id == user.OfficeId.Value, cancellationToken);
            if (office == null)
            {
                return BadRequest(new { message = "Office not found" });
            }

            try
            {
                var status = await _tinkPaymentService.GetStatusAsync(office, paymentRequest.TinkRequestId, cancellationToken);

                paymentRequest.Status = status.Status;
                paymentRequest.StatusMessage = status.StatusMessage;
                paymentRequest.ModifiedDate = DateTime.UtcNow;

                if (SettledStatuses.Contains(status.Status, StringComparer.OrdinalIgnoreCase) && paymentRequest.PaymentId == null)
                {
                    await SettleInvoiceAsync(paymentRequest, cancellationToken);
                }

                await _context.SaveChangesAsync(cancellationToken);

                return Ok(ToDto(paymentRequest, paymentRequest.Invoice));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private async Task SettleInvoiceAsync(TinkPaymentRequest paymentRequest, CancellationToken cancellationToken)
        {
            var payment = new Payment
            {
                OfficeId = paymentRequest.OfficeId,
                InvoiceId = paymentRequest.InvoiceId,
                PaymentDate = DateTime.UtcNow,
                Amount = paymentRequest.Amount,
                PaymentMethod = PaymentMethodCode,
                Reference = paymentRequest.TinkRequestId,
                Note = paymentRequest.StatusMessage,
                CreatedDate = DateTime.UtcNow,
            };

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync(cancellationToken);

            paymentRequest.PaymentId = payment.Id;

            var invoice = paymentRequest.Invoice ?? await _context.Invoices.FirstOrDefaultAsync(i => i.Id == paymentRequest.InvoiceId, cancellationToken);
            if (invoice != null)
            {
                invoice.IsSettled = true;
                invoice.InvoicePayMethod = PaymentMethodCode;
            }
        }

        private static decimal GetOutstandingAmount(Invoice invoice)
        {
            var total = invoice.TotSum ?? invoice.InvoiceRows.Sum(row => row.Sum ?? 0m);
            return Math.Round(total, 2, MidpointRounding.AwayFromZero);
        }

        private static string ApplyPlaceholders(string text, TinkPaymentRequest paymentRequest)
        {
            return text
                .Replace("{{link}}", paymentRequest.LinkUrl)
                .Replace("{{amount}}", paymentRequest.Amount.ToString("0.00"))
                .Replace("{{invoiceNr}}", paymentRequest.Invoice?.InvoiceNr?.ToString() ?? string.Empty);
        }

        private static TinkPaymentRequestDto ToDto(TinkPaymentRequest paymentRequest, Invoice? invoice)
        {
            return new TinkPaymentRequestDto
            {
                Id = paymentRequest.Id,
                InvoiceId = paymentRequest.InvoiceId,
                TinkRequestId = paymentRequest.TinkRequestId,
                Amount = paymentRequest.Amount,
                Currency = paymentRequest.Currency,
                LinkUrl = paymentRequest.LinkUrl,
                Status = paymentRequest.Status,
                StatusMessage = paymentRequest.StatusMessage,
                IsSettled = invoice?.IsSettled ?? false,
                CustomerEmail = invoice?.Customer?.Email ?? string.Empty,
                CustomerMobilePhone = invoice?.Customer?.MobilePhone ?? string.Empty,
            };
        }
    }
}
