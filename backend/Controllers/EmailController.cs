using System.Globalization;
using System.Text.Json;
using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using MimeKit;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EmailController : ControllerBase
    {
        public const int MaxRequestBytes = 25_000_000;

        private static readonly JsonSerializerOptions RecipientJsonOptions = new(JsonSerializerDefaults.Web);
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly IEmailSender _emailSender;
        private readonly ILogger<EmailController> _logger;

        public EmailController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService,
            IEmailSender emailSender,
            ILogger<EmailController> logger)
        {
            _context = context;
            _currentUserService = currentUserService;
            _emailSender = emailSender;
            _logger = logger;
        }

        /// <summary>
        /// Sends a multipart message with subject, body, receivers, ccRecipients, files,
        /// and exactly one of invoiceId or reservationId. The first file is the original PDF.
        /// </summary>
        [HttpPost("send")]
        [DisableFormValueModelBinding]
        [RequestSizeLimit(MaxRequestBytes)]
        [RequestFormLimits(
            MultipartBodyLengthLimit = MaxRequestBytes,
            MemoryBufferThreshold = MaxRequestBytes,
            ValueLengthLimit = MaxRequestBytes)]
        [ProducesResponseType(typeof(EmailSendResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(EmailErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(EmailErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(EmailErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(EmailErrorResponse), StatusCodes.Status413PayloadTooLarge)]
        [ProducesResponseType(typeof(EmailErrorResponse), StatusCodes.Status503ServiceUnavailable)]
        public async Task<ActionResult<EmailSendResponse>> Send(CancellationToken cancellationToken)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User, cancellationToken);
            if (user == null)
            {
                return Unauthorized(new EmailErrorResponse("Användaren hittades inte."));
            }
            if (!user.OfficeId.HasValue)
            {
                return BadRequest(new EmailErrorResponse("Användaren saknar kontor."));
            }
            if (Request.ContentLength > MaxRequestBytes)
            {
                return PayloadTooLarge();
            }
            if (!Request.HasFormContentType
                || !Request.ContentType!.StartsWith("multipart/form-data", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new EmailErrorResponse("Meddelandet måste skickas som multipart/form-data."));
            }

            IFormCollection? form = null;
            var invalidForm = false;
            var originalBody = Request.Body;
            Request.Body = new LimitedRequestBodyStream(originalBody, MaxRequestBytes);
            try
            {
                try
                {
                    form = await Request.ReadFormAsync(cancellationToken);
                }
                catch (InvalidDataException)
                {
                    invalidForm = true;
                }
                await Request.Body.CopyToAsync(Stream.Null, cancellationToken);
            }
            catch (MultipartRequestTooLargeException)
            {
                return PayloadTooLarge();
            }
            catch (BadHttpRequestException exception) when (
                exception.StatusCode == StatusCodes.Status413PayloadTooLarge)
            {
                return PayloadTooLarge();
            }
            catch (IOException) when (!cancellationToken.IsCancellationRequested)
            {
                return BadRequest(new EmailErrorResponse("Meddelandets formulär kunde inte läsas."));
            }
            finally
            {
                Request.Body = originalBody;
            }

            if (invalidForm || form == null)
            {
                return BadRequest(new EmailErrorResponse("Meddelandets formulär är ogiltigt."));
            }
            if (!TrySingleValue(form, "subject", out var subject)
                || subject.Contains('\r') || subject.Contains('\n')
                || !TrySingleValue(form, "body", out var body)
                || !TrySingleValue(form, "receivers", out var receiversJson)
                || !TrySingleValue(form, "ccRecipients", out var ccJson)
                || !TryGetDocumentId(form, out var invoiceId, out var reservationId)
                || !TryGetRecipients(receiversJson, ccJson, out var to, out var cc))
            {
                return BadRequest(new EmailErrorResponse("Kontrollera meddelandets fält, dokument och mottagare."));
            }

            Invoice? invoice = null;
            if (invoiceId.HasValue)
            {
                invoice = await _context.Invoices.FirstOrDefaultAsync(
                    item => item.Id == invoiceId.Value && item.OfficeId == user.OfficeId.Value,
                    cancellationToken);
                if (invoice == null)
                {
                    return NotFound(new EmailErrorResponse("Fakturan hittades inte."));
                }
            }
            else if (!await _context.Reservations.AsNoTracking().AnyAsync(
                item => item.Id == reservationId!.Value && item.OfficeId == user.OfficeId.Value,
                cancellationToken))
            {
                return NotFound(new EmailErrorResponse("Bokningen hittades inte."));
            }

            var attachments = await ReadAttachmentsAsync(form.Files, cancellationToken);
            if (attachments == null)
            {
                return BadRequest(new EmailErrorResponse("En giltig original-PDF och giltiga bilagor krävs."));
            }

            try
            {
                await _emailSender.SendAsync(new EmailMessage(to, cc, subject, body, attachments), cancellationToken);
            }
            catch (EmailConfigurationException)
            {
                _logger.LogWarning("Email delivery is not configured.");
                return StatusCode(StatusCodes.Status503ServiceUnavailable,
                    new EmailErrorResponse("E-posttjänsten är inte korrekt konfigurerad."));
            }
            catch (NotSupportedException)
            {
                _logger.LogWarning("The configured email sender does not support this message.");
                return StatusCode(StatusCodes.Status503ServiceUnavailable,
                    new EmailErrorResponse("E-posttjänsten stöder inte meddelandet."));
            }
            catch (EmailDeliveryException exception)
            {
                _logger.LogWarning("Email delivery failed. Outcome: {Outcome}.", exception.Outcome);
                var message = exception.Outcome == EmailDeliveryOutcome.Unknown
                    ? "Meddelandet kan ha skickats, men leveransen kunde inte bekräftas. Kontrollera leveransen innan du skickar igen."
                    : "E-posttjänsten är inte tillgänglig. Meddelandet skickades inte.";
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new EmailErrorResponse(message));
            }

            if (invoice == null)
            {
                return Ok(new EmailSendResponse("E-postmeddelandet skickades.", null, null,
                    null, reservationId, null, null));
            }

            var modifiedDate = DateTimeOffset.UtcNow;
            invoice.IsEmailed = true;
            invoice.ModifiedDate = modifiedDate.UtcDateTime;
            invoice.ModifiedByUserId = user.Id;

            // Once SMTP has accepted the message, a disconnected client must not abandon the status update.
            using var statusUpdateTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            try
            {
                await _context.SaveChangesAsync(statusUpdateTimeout.Token);
            }
            catch (Exception exception) when (
                exception is not OutOfMemoryException and not StackOverflowException and not AccessViolationException)
            {
                // SMTP has already accepted the message, so a failed status save must not look like a failed send.
                _logger.LogError("SMTP accepted the message, but the invoice status could not be saved ({FailureType}).",
                    exception.GetType().Name);
                return Ok(new EmailSendResponse(
                    "E-postmeddelandet skickades.",
                    false,
                    "E-postmeddelandet skickades, men fakturans e-poststatus kunde inte bekräftas. Kontrollera fakturan.",
                    invoiceId, null, null, null));
            }

            return Ok(new EmailSendResponse("E-postmeddelandet skickades.", true, null,
                invoiceId, null, modifiedDate, user.Id));
        }

        private ObjectResult PayloadTooLarge() =>
            StatusCode(StatusCodes.Status413PayloadTooLarge,
                new EmailErrorResponse("Meddelandet får vara högst 25 000 000 byte inklusive formulärdata."));

        private static bool TrySingleValue(IFormCollection form, string key, out string value)
        {
            value = string.Empty;
            if (!form.TryGetValue(key, out var values) || values.Count != 1 || values[0] == null)
            {
                return false;
            }
            value = values[0]!;
            return true;
        }

        private static bool TryGetDocumentId(IFormCollection form, out int? invoiceId, out int? reservationId)
        {
            invoiceId = null;
            reservationId = null;
            var hasInvoice = form.ContainsKey("invoiceId");
            var hasReservation = form.ContainsKey("reservationId");
            if (hasInvoice == hasReservation)
            {
                return false;
            }

            var key = hasInvoice ? "invoiceId" : "reservationId";
            if (!TrySingleValue(form, key, out var value)
                || !int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var id)
                || id <= 0)
            {
                return false;
            }
            if (hasInvoice)
            {
                invoiceId = id;
            }
            else
            {
                reservationId = id;
            }
            return true;
        }

        private static bool TryGetRecipients(
            string receiversJson, string ccJson, out List<string> to, out List<string> cc)
        {
            to = [];
            cc = [];
            List<Recipient?>? receivers;
            List<Recipient?>? copies;
            try
            {
                receivers = JsonSerializer.Deserialize<List<Recipient?>>(receiversJson, RecipientJsonOptions);
                copies = JsonSerializer.Deserialize<List<Recipient?>>(ccJson, RecipientJsonOptions);
            }
            catch (JsonException)
            {
                return false;
            }

            if (receivers == null || copies == null || receivers.Any(item => item == null) || copies.Any(item => item == null))
            {
                return false;
            }

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            return AddSelected(receivers, to, seen)
                && AddSelected(copies, cc, seen)
                && (to.Count > 0 || cc.Count > 0);
        }

        private static bool AddSelected(IEnumerable<Recipient?> recipients, List<string> result, HashSet<string> seen)
        {
            foreach (var recipient in recipients)
            {
                if (!recipient!.DoSend)
                {
                    continue;
                }

                var address = recipient.Email?.Trim();
                if (string.IsNullOrWhiteSpace(address)
                    || address.Any(char.IsControl)
                    || !MailboxAddress.TryParse(address, out var parsed)
                    || parsed == null
                    || !string.Equals(parsed.Address, address, StringComparison.OrdinalIgnoreCase)
                    || address.LastIndexOf('@') <= 0
                    || address.EndsWith('@'))
                {
                    return false;
                }
                if (seen.Add(parsed.Address))
                {
                    result.Add(parsed.Address);
                }
            }
            return true;
        }

        private static async Task<List<EmailAttachment>?> ReadAttachmentsAsync(
            IFormFileCollection files, CancellationToken cancellationToken)
        {
            if (files.Count == 0 || files.Any(file => !string.Equals(file.Name, "files", StringComparison.OrdinalIgnoreCase)))
            {
                return null;
            }

            var attachments = new List<EmailAttachment>(files.Count);
            for (var index = 0; index < files.Count; index++)
            {
                var file = files[index];
                if (file.Length < 0 || file.Length > MaxRequestBytes || (index == 0 && file.Length == 0))
                {
                    return null;
                }

                var contentType = string.IsNullOrWhiteSpace(file.ContentType)
                    ? "application/octet-stream"
                    : file.ContentType;
                if (!ContentType.TryParse(contentType, out _))
                {
                    return null;
                }

                await using var content = new MemoryStream((int)file.Length);
                await file.CopyToAsync(content, cancellationToken);
                var bytes = content.ToArray();
                if (index == 0 && !bytes.AsSpan().StartsWith("%PDF-"u8))
                {
                    return null;
                }

                attachments.Add(new EmailAttachment(SanitizeFileName(file.FileName, index == 0), contentType, bytes));
            }
            return attachments;
        }

        private static string SanitizeFileName(string fileName, bool original)
        {
            var name = (fileName ?? string.Empty).Replace('\\', '/');
            name = name[(name.LastIndexOf('/') + 1)..];
            const string invalid = "<>:\"/\\|?*";
            var safe = new string(name.Select(character =>
                char.IsControl(character)
                    || char.GetUnicodeCategory(character) == UnicodeCategory.Format
                    || invalid.Contains(character)
                    ? '_'
                    : character).ToArray()).Trim(' ', '.');
            if (string.IsNullOrEmpty(safe))
            {
                return original ? "document.pdf" : "attachment";
            }
            if (safe.Length <= 180)
            {
                return safe;
            }

            var extension = Path.GetExtension(safe);
            if (extension.Length > 30)
            {
                extension = string.Empty;
            }
            var prefixLength = 180 - extension.Length;
            if (char.IsHighSurrogate(safe[prefixLength - 1]))
            {
                prefixLength--;
            }
            return safe[..prefixLength] + extension;
        }

        private sealed record Recipient(string? Email, bool DoSend);

        [AttributeUsage(AttributeTargets.Method)]
        private sealed class DisableFormValueModelBindingAttribute : Attribute, IResourceFilter
        {
            public void OnResourceExecuting(ResourceExecutingContext context)
            {
                var factories = context.ValueProviderFactories;
                for (var index = factories.Count - 1; index >= 0; index--)
                {
                    if (factories[index] is FormValueProviderFactory or FormFileValueProviderFactory or JQueryFormValueProviderFactory)
                    {
                        factories.RemoveAt(index);
                    }
                }
            }

            public void OnResourceExecuted(ResourceExecutedContext context) { }
        }

        private sealed class MultipartRequestTooLargeException : IOException;

        private sealed class LimitedRequestBodyStream(Stream source, long limit) : Stream
        {
            private long _read;

            public override bool CanRead => source.CanRead;
            public override bool CanSeek => false;
            public override bool CanWrite => false;
            public override long Length => throw new NotSupportedException();
            public override long Position
            {
                get => throw new NotSupportedException();
                set => throw new NotSupportedException();
            }

            public override int Read(byte[] buffer, int offset, int count) =>
                Read(buffer.AsSpan(offset, count));

            public override int Read(Span<byte> buffer)
            {
                var count = source.Read(buffer[..AllowedRead(buffer.Length)]);
                return CountRead(count);
            }

            public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken) =>
                ReadAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();

            public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
            {
                var count = await source.ReadAsync(buffer[..AllowedRead(buffer.Length)], cancellationToken);
                return CountRead(count);
            }

            private int AllowedRead(int requested) => (int)Math.Min(requested, limit - _read + 1);

            private int CountRead(int count)
            {
                _read += count;
                if (_read > limit)
                {
                    throw new MultipartRequestTooLargeException();
                }
                return count;
            }

            public override void Flush() => throw new NotSupportedException();
            public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
            public override void SetLength(long value) => throw new NotSupportedException();
            public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
        }
    }
}
