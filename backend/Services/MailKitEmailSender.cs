using System.Net.Sockets;
using System.Runtime.ExceptionServices;
using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Backend.Services
{
    public interface IEmailSender
    {
        Task SendAsync(string toAddress, string subject, string htmlBody, CancellationToken cancellationToken = default);
        Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException("This email sender does not support multipart messages.");
    }

    public class MailKitEmailSender : IEmailSender
    {
        private readonly SmtpSettings _settings;
        private readonly ILogger<MailKitEmailSender> _logger;
        private readonly Func<IMailTransport> _clientFactory;

        public MailKitEmailSender(IOptions<SmtpSettings> settings, ILogger<MailKitEmailSender> logger)
            : this(settings, logger, () => new SmtpClient())
        {
        }

        public MailKitEmailSender(
            IOptions<SmtpSettings> settings,
            ILogger<MailKitEmailSender> logger,
            Func<IMailTransport> clientFactory)
        {
            _settings = settings.Value;
            _logger = logger;
            _clientFactory = clientFactory;
        }

        public async Task SendAsync(string toAddress, string subject, string htmlBody, CancellationToken cancellationToken = default)
        {
            try
            {
                await SendAsync(new EmailMessage(
                    string.IsNullOrWhiteSpace(toAddress) ? [] : [toAddress],
                    [],
                    subject,
                    htmlBody,
                    []), cancellationToken);
            }
            catch (EmailDeliveryException exception) when (exception.InnerException != null)
            {
                ExceptionDispatchInfo.Capture(exception.InnerException).Throw();
            }
        }

        public async Task SendAsync(EmailMessage email, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            ValidateSettings();

            if (email.To.Count == 0 && email.Cc.Count == 0)
            {
                throw new InvalidOperationException("Mottagarens e-postadress saknas.");
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_settings.FromName, _settings.FromAddress));
            foreach (var address in email.To)
            {
                message.To.Add(MailboxAddress.Parse(address));
            }
            foreach (var address in email.Cc)
            {
                message.Cc.Add(MailboxAddress.Parse(address));
            }
            message.Subject = email.Subject;

            var body = new BodyBuilder { HtmlBody = email.HtmlBody };
            foreach (var attachment in email.Attachments)
            {
                cancellationToken.ThrowIfCancellationRequested();
                body.Attachments.Add(attachment.FileName, attachment.Content, ContentType.Parse(attachment.ContentType));
            }
            message.Body = body.ToMessageBody();

            var client = _clientFactory();
            var secureSocketOptions = _settings.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
            try
            {
                try
                {
                    await client.ConnectAsync(_settings.Host, _settings.Port, secureSocketOptions, cancellationToken);
                    if (!string.IsNullOrWhiteSpace(_settings.UserName))
                    {
                        await client.AuthenticateAsync(_settings.UserName, _settings.Password, cancellationToken);
                    }
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception exception) when (IsTransportFailure(exception) || exception is OperationCanceledException)
                {
                    throw new EmailDeliveryException(EmailDeliveryOutcome.NotSent, exception);
                }

                try
                {
                    await client.SendAsync(message, cancellationToken);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    _logger.LogWarning("SMTP submission was cancelled; the delivery outcome is unknown.");
                    throw;
                }
                catch (Exception exception) when (IsTransportFailure(exception) || exception is OperationCanceledException)
                {
                    throw new EmailDeliveryException(EmailDeliveryOutcome.Unknown, exception);
                }

                try
                {
                    await client.DisconnectAsync(true, cancellationToken);
                }
                catch (Exception exception) when (IsRecoverable(exception))
                {
                    _logger.LogWarning("SMTP accepted the message, but disconnecting failed.");
                }

                _logger.LogInformation("SMTP accepted an email message.");
            }
            finally
            {
                try
                {
                    client.Dispose();
                }
                catch (Exception exception) when (IsRecoverable(exception))
                {
                    _logger.LogWarning("SMTP client cleanup failed.");
                }
            }
        }

        private void ValidateSettings()
        {
            if (string.IsNullOrWhiteSpace(_settings.Host)
                || _settings.Host.Any(character => char.IsWhiteSpace(character) || char.IsControl(character))
                || Uri.CheckHostName(_settings.Host) == UriHostNameType.Unknown
                || _settings.Port is < 1 or > 65535
                || string.IsNullOrWhiteSpace(_settings.FromAddress)
                || !MailboxAddress.TryParse(_settings.FromAddress, out var from)
                || from == null
                || !string.Equals(from.Address, _settings.FromAddress, StringComparison.OrdinalIgnoreCase)
                || !from.Address.Contains('@')
                || (!string.IsNullOrWhiteSpace(_settings.UserName) && _settings.Password == null))
            {
                throw new EmailConfigurationException();
            }
        }

        private static bool IsTransportFailure(Exception exception) =>
            exception is IOException or SocketException or TimeoutException
                or SmtpCommandException or SmtpProtocolException
                or MailKit.Security.AuthenticationException or System.Security.Authentication.AuthenticationException
                or SslHandshakeException or ServiceNotConnectedException or ServiceNotAuthenticatedException
                or NotSupportedException;

        private static bool IsRecoverable(Exception exception) =>
            exception is not OutOfMemoryException and not StackOverflowException and not AccessViolationException;
    }
}
