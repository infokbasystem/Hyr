using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Backend.Services
{
    public interface IEmailSender
    {
        Task SendAsync(string toAddress, string subject, string htmlBody, CancellationToken cancellationToken = default);
    }

    public class MailKitEmailSender : IEmailSender
    {
        private readonly SmtpSettings _settings;
        private readonly ILogger<MailKitEmailSender> _logger;

        public MailKitEmailSender(IOptions<SmtpSettings> settings, ILogger<MailKitEmailSender> logger)
        {
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task SendAsync(string toAddress, string subject, string htmlBody, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.Host) || string.IsNullOrWhiteSpace(_settings.FromAddress))
            {
                throw new InvalidOperationException("E-postutskick är inte konfigurerat (Smtp:Host och Smtp:FromAddress saknas).");
            }

            if (string.IsNullOrWhiteSpace(toAddress))
            {
                throw new InvalidOperationException("Mottagarens e-postadress saknas.");
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_settings.FromName, _settings.FromAddress));
            message.To.Add(MailboxAddress.Parse(toAddress));
            message.Subject = subject;
            message.Body = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();

            using var client = new SmtpClient();
            var secureSocketOptions = _settings.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;

            await client.ConnectAsync(_settings.Host, _settings.Port, secureSocketOptions, cancellationToken);

            if (!string.IsNullOrWhiteSpace(_settings.UserName))
            {
                await client.AuthenticateAsync(_settings.UserName, _settings.Password, cancellationToken);
            }

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);

            _logger.LogInformation("Email sent to {ToAddress} with subject {Subject}", toAddress, subject);
        }
    }
}
