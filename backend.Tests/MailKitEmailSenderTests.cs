using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using Backend.Services;
using MailKit;
using MailKit.Security;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MimeKit;
using Xunit;

namespace Backend.Tests;

public class MailKitEmailSenderTests
{
    [Theory]
    [InlineData(true, SecureSocketOptions.StartTls)]
    [InlineData(false, SecureSocketOptions.Auto)]
    public async Task MultiRecipientMessageUsesConfiguredSmtpAndPreservesMimeAttachments(
        bool useStartTls, SecureSocketOptions expectedSecurity)
    {
        var settings = ValidSettings();
        settings.UseStartTls = useStartTls;
        var (sender, transport) = Create(settings);
        var content = new byte[] { 0, 1, 128, 255 };
        var text = "synthetic text"u8.ToArray();
        var email = new EmailMessage(
            ["to@example.test"], ["cc@example.test"], "Subject", "<p>Synthetic HTML</p>",
            [
                new("file.bin", "application/octet-stream", content),
                new("file.txt", "text/plain; charset=utf-8", text),
            ]);

        await sender.SendAsync(email, CancellationToken.None);

        Assert.Equal("smtp.example.test", transport.ConnectArguments![0]);
        Assert.Equal(2525, transport.ConnectArguments[1]);
        Assert.Equal(expectedSecurity, transport.ConnectArguments[2]);
        Assert.Equal("synthetic-user", transport.AuthenticateArguments![0]);
        Assert.Equal("synthetic-password", transport.AuthenticateArguments[1]);
        var sent = Assert.IsType<MimeMessage>(transport.Message);
        Assert.Equal("sender@example.test", Assert.Single(sent.From.Mailboxes).Address);
        Assert.Equal("Synthetic sender", Assert.Single(sent.From.Mailboxes).Name);
        Assert.Equal("to@example.test", Assert.Single(sent.To.Mailboxes).Address);
        Assert.Equal("cc@example.test", Assert.Single(sent.Cc.Mailboxes).Address);
        Assert.Equal("Subject", sent.Subject);
        Assert.Equal("<p>Synthetic HTML</p>", sent.HtmlBody);
        var attachments = sent.Attachments.Cast<MimePart>().ToArray();
        Assert.Equal(2, attachments.Length);
        var attachment = attachments[0];
        Assert.Equal("file.bin", attachment.FileName);
        Assert.Equal("application/octet-stream", attachment.ContentType.MimeType);
        await using var decoded = new MemoryStream();
        var binaryContent = attachment.Content ?? throw new InvalidOperationException("Expected binary MIME content.");
        await binaryContent.DecodeToAsync(decoded);
        Assert.Equal(content, decoded.ToArray());
        Assert.Equal("text/plain", attachments[1].ContentType.MimeType);
        Assert.Equal("utf-8", attachments[1].ContentType.Charset);
        await using var decodedText = new MemoryStream();
        var textContent = attachments[1].Content ?? throw new InvalidOperationException("Expected text MIME content.");
        await textContent.DecodeToAsync(decodedText);
        Assert.Equal(text, decodedText.ToArray());
        Assert.True(transport.Disconnected);
        Assert.True(transport.Disposed);
    }

    [Fact]
    public async Task ExistingSingleRecipientMethodStillSendsHtmlWithoutAuthenticationWhenUserNameIsBlank()
    {
        var settings = ValidSettings();
        settings.UserName = "";
        settings.Password = "";
        var (sender, transport) = Create(settings);

        await sender.SendAsync("recipient@example.test", "Existing subject", "<p>Existing body</p>");

        var sent = Assert.IsType<MimeMessage>(transport.Message);
        Assert.Equal("recipient@example.test", Assert.Single(sent.To.Mailboxes).Address);
        Assert.Empty(sent.Cc);
        Assert.Equal("Existing subject", sent.Subject);
        Assert.Equal("<p>Existing body</p>", sent.HtmlBody);
        Assert.Null(transport.AuthenticateArguments);
    }

    [Fact]
    public async Task ExistingSingleRecipientMethodPreservesTransportExceptionTypes()
    {
        var (sender, transport) = Create(ValidSettings());
        var failure = new ServiceNotConnectedException("Synthetic connection failure");
        transport.FailureStage = "connect";
        transport.Failure = failure;

        var exception = await Assert.ThrowsAsync<ServiceNotConnectedException>(() =>
            sender.SendAsync("recipient@example.test", "Subject", "Body"));

        Assert.Same(failure, exception);
    }

    [Fact]
    public async Task CcOnlyMessageAndAttachmentAreTransmittedAsMimeToLocalSmtp()
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        try
        {
            var captureTask = CaptureSmtpAsync(listener, timeout.Token);
            var settings = ValidSettings();
            settings.Host = "127.0.0.1";
            settings.Port = ((IPEndPoint)listener.LocalEndpoint).Port;
            settings.UseStartTls = false;
            settings.UserName = "";
            settings.Password = "";
            var sender = new MailKitEmailSender(Options.Create(settings), NullLogger<MailKitEmailSender>.Instance);
            var bytes = new byte[] { 0, 1, 128, 255 };

            await sender.SendAsync(new EmailMessage(
                [], ["copy@example.test"], "Subject", "<p>Message</p>",
                [new EmailAttachment("document.pdf", "application/pdf", bytes)]), timeout.Token);

            var (recipients, rawMessage) = await captureTask;
            Assert.Contains(recipients, line => line.Contains("copy@example.test", StringComparison.OrdinalIgnoreCase));
            using var stream = new MemoryStream(Encoding.ASCII.GetBytes(rawMessage));
            var message = MimeMessage.Load(stream);
            Assert.Empty(message.To);
            Assert.Equal("copy@example.test", Assert.Single(message.Cc.Mailboxes).Address);
            Assert.Equal("<p>Message</p>", message.HtmlBody);
            var attachment = Assert.IsType<MimePart>(Assert.Single(message.Attachments));
            Assert.Equal("document.pdf", attachment.FileName);
            await using var decoded = new MemoryStream();
            var content = attachment.Content ?? throw new InvalidOperationException("Expected PDF MIME content.");
            await content.DecodeToAsync(decoded, timeout.Token);
            Assert.Equal(bytes, decoded.ToArray());
        }
        finally
        {
            timeout.Cancel();
            listener.Stop();
        }
    }

    [Fact]
    public async Task LegacySenderImplementationsRemainUsableWithoutSilentlyDroppingAttachments()
    {
        IEmailSender sender = new LegacyOnlySender();
        await sender.SendAsync("recipient@example.test", "Subject", "Body");

        await Assert.ThrowsAsync<NotSupportedException>(() => sender.SendAsync(
            new EmailMessage(["recipient@example.test"], [], "Subject", "Body",
                [new EmailAttachment("document.pdf", "application/pdf", "%PDF-"u8.ToArray())])));
    }

    [Theory]
    [InlineData("", 587, "sender@example.test")]
    [InlineData("invalid/host", 587, "sender@example.test")]
    [InlineData("smtp.example.test", 0, "sender@example.test")]
    [InlineData("smtp.example.test", 65536, "sender@example.test")]
    [InlineData("smtp.example.test", 587, "not-an-email")]
    public async Task SettingsAreValidatedOnlyWhenSending(string host, int port, string fromAddress)
    {
        var settings = ValidSettings();
        settings.Host = host;
        settings.Port = port;
        settings.FromAddress = fromAddress;
        var factoryCalled = false;
        var sender = new MailKitEmailSender(Options.Create(settings), NullLogger<MailKitEmailSender>.Instance,
            () =>
            {
                factoryCalled = true;
                return DispatchProxy.Create<IMailTransport, FakeTransport>();
            });

        await Assert.ThrowsAsync<EmailConfigurationException>(() =>
            sender.SendAsync("recipient@example.test", "Subject", "Body"));
        Assert.False(factoryCalled);
    }

    [Theory]
    [InlineData("connect", EmailDeliveryOutcome.NotSent)]
    [InlineData("authenticate", EmailDeliveryOutcome.NotSent)]
    [InlineData("send", EmailDeliveryOutcome.Unknown)]
    public async Task ReportsWhetherFailurePrecededSubmissionOrHasAnUncertainOutcome(
        string stage, EmailDeliveryOutcome expected)
    {
        var (sender, transport) = Create(ValidSettings());
        transport.FailureStage = stage;
        transport.Failure = new IOException("synthetic network details");

        var exception = await Assert.ThrowsAsync<EmailDeliveryException>(() =>
            sender.SendAsync(new EmailMessage(["recipient@example.test"], [], "Subject", "Body", [])));

        Assert.Equal(expected, exception.Outcome);
        Assert.True(transport.Disposed);
    }

    [Fact]
    public async Task AcceptanceRemainsSuccessfulWhenCancellationDisconnectAndCleanupOccurAfterSend()
    {
        using var cancellation = new CancellationTokenSource();
        var (sender, transport) = Create(ValidSettings());
        transport.OnSend = cancellation.Cancel;
        transport.DisconnectFailure = new OperationCanceledException(cancellation.Token);
        transport.DisposeFailure = new IOException("synthetic cleanup failure");

        await sender.SendAsync("recipient@example.test", "Subject", "Body", cancellation.Token);

        Assert.True(cancellation.IsCancellationRequested);
        Assert.NotNull(transport.Message);
        Assert.True(transport.Disconnected);
        Assert.True(transport.Disposed);
    }

    [Fact]
    public async Task CancellationDuringSubmissionPropagates()
    {
        using var cancellation = new CancellationTokenSource();
        var (sender, transport) = Create(ValidSettings());
        transport.OnSend = cancellation.Cancel;
        transport.FailureStage = "send";
        transport.Failure = new OperationCanceledException(cancellation.Token);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            sender.SendAsync("recipient@example.test", "Subject", "Body", cancellation.Token));
        Assert.True(transport.Disposed);
    }

    [Fact]
    public void ExistingDependencyInjectionRegistrationCanResolveTheSender()
    {
        var services = new ServiceCollection();
        services.AddOptions();
        services.AddLogging();
        services.AddScoped<IEmailSender, MailKitEmailSender>();
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();

        Assert.IsType<MailKitEmailSender>(scope.ServiceProvider.GetRequiredService<IEmailSender>());
    }

    private static async Task<(List<string> Recipients, string Message)> CaptureSmtpAsync(
        TcpListener listener, CancellationToken cancellationToken)
    {
        using var client = await listener.AcceptTcpClientAsync(cancellationToken);
        await using var stream = client.GetStream();
        using var reader = new StreamReader(stream, Encoding.ASCII, false, 1024, leaveOpen: true);
        await using var writer = new StreamWriter(stream, Encoding.ASCII, 1024, leaveOpen: true)
        {
            AutoFlush = true,
            NewLine = "\r\n",
        };
        var recipients = new List<string>();
        var message = new StringBuilder();
        var inData = false;
        await writer.WriteLineAsync("220 localhost ESMTP");

        while (await reader.ReadLineAsync(cancellationToken) is { } line)
        {
            if (inData)
            {
                if (line == ".")
                {
                    inData = false;
                    await writer.WriteLineAsync("250 accepted");
                }
                else
                {
                    message.Append(line.StartsWith("..", StringComparison.Ordinal) ? line[1..] : line).Append("\r\n");
                }
            }
            else if (line.StartsWith("EHLO ", StringComparison.OrdinalIgnoreCase))
            {
                await writer.WriteLineAsync("250-localhost\r\n250 SIZE 30000000");
            }
            else if (line.StartsWith("MAIL FROM:", StringComparison.OrdinalIgnoreCase))
            {
                await writer.WriteLineAsync("250 sender accepted");
            }
            else if (line.StartsWith("RCPT TO:", StringComparison.OrdinalIgnoreCase))
            {
                recipients.Add(line);
                await writer.WriteLineAsync("250 recipient accepted");
            }
            else if (line.Equals("DATA", StringComparison.OrdinalIgnoreCase))
            {
                inData = true;
                await writer.WriteLineAsync("354 end with a dot");
            }
            else if (line.Equals("QUIT", StringComparison.OrdinalIgnoreCase))
            {
                await writer.WriteLineAsync("221 bye");
                break;
            }
            else
            {
                throw new InvalidOperationException($"Unexpected local SMTP command: {line}");
            }
        }

        return (recipients, message.ToString());
    }

    private static SmtpSettings ValidSettings() => new()
    {
        Host = "smtp.example.test",
        Port = 2525,
        UseStartTls = true,
        UserName = "synthetic-user",
        Password = "synthetic-password",
        FromAddress = "sender@example.test",
        FromName = "Synthetic sender",
    };

    private static (MailKitEmailSender Sender, FakeTransport Transport) Create(SmtpSettings settings)
    {
        var proxy = DispatchProxy.Create<IMailTransport, FakeTransport>();
        var transport = (FakeTransport)(object)proxy;
        return (new MailKitEmailSender(Options.Create(settings), NullLogger<MailKitEmailSender>.Instance, () => proxy), transport);
    }

    private sealed class LegacyOnlySender : IEmailSender
    {
        public Task SendAsync(string toAddress, string subject, string htmlBody, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }

    public class FakeTransport : DispatchProxy
    {
        public object?[]? ConnectArguments { get; private set; }
        public object?[]? AuthenticateArguments { get; private set; }
        public MimeMessage? Message { get; private set; }
        public string? FailureStage { get; set; }
        public Exception? Failure { get; set; }
        public Exception? DisconnectFailure { get; set; }
        public Exception? DisposeFailure { get; set; }
        public Action? OnSend { get; set; }
        public bool Disconnected { get; private set; }
        public bool Disposed { get; private set; }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            switch (targetMethod!.Name)
            {
                case "ConnectAsync":
                    ConnectArguments = args;
                    return FailureStage == "connect" ? Task.FromException(Failure!) : Task.CompletedTask;
                case "AuthenticateAsync":
                    AuthenticateArguments = args;
                    return FailureStage == "authenticate" ? Task.FromException(Failure!) : Task.CompletedTask;
                case "SendAsync":
                    Message = (MimeMessage)args![0]!;
                    OnSend?.Invoke();
                    return FailureStage == "send" ? Task.FromException<string>(Failure!) : Task.FromResult("accepted");
                case "DisconnectAsync":
                    Disconnected = true;
                    return DisconnectFailure == null ? Task.CompletedTask : Task.FromException(DisconnectFailure);
                case "Dispose":
                    Disposed = true;
                    if (DisposeFailure != null)
                    {
                        throw DisposeFailure;
                    }
                    return null;
                default:
                    throw new NotSupportedException($"Unexpected transport operation: {targetMethod.Name}");
            }
        }
    }
}
