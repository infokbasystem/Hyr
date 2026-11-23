using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Backend.Controllers;
using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Backend.Tests;

public class EmailControllerTests
{
    private static readonly byte[] OriginalPdf = "%PDF-1.7\nsynthetic document"u8.ToArray();

    [Fact]
    public async Task InvoiceSendSelectsAndDeduplicatesRecipientsAndPreservesAttachmentsBeforeUpdatingStatus()
    {
        await using var db = await Seed();
        var sender = new TestSender();
        sender.OnSend = async (_, _) =>
        {
            var before = await db.Invoices.AsNoTracking().SingleAsync(invoice => invoice.Id == 11);
            Assert.False(before.IsEmailed);
            Assert.Equal(99, before.ModifiedByUserId);
        };
        var extra = new byte[] { 0, 1, 254, 255 };
        var form = new TestForm
        {
            Receivers = """[{"email":" first@example.test ","doSend":true},{"email":"invalid","doSend":false},{"email":"FIRST@example.test","doSend":true},{"email":"other@example.test","doSend":true}]""",
            CcRecipients = """[{"email":"OTHER@example.test","doSend":true},{"email":"copy@example.test","doSend":true},{"email":"COPY@example.test","doSend":true}]""",
            Files =
            [
                new("files", @"C:\fakepath\invoice.pdf", "application/pdf", OriginalPdf),
                new("files", "../../report?.txt", "text/plain; charset=utf-8", extra),
                new("files", "empty.bin", "application/octet-stream", []),
            ],
        };
        var controller = await Controller(db, sender, form);

        var response = Success(await controller.Send(CancellationToken.None));

        var sent = Assert.Single(sender.Messages);
        Assert.Equal(new[] { "first@example.test", "other@example.test" }, sent.To);
        Assert.Equal(new[] { "copy@example.test" }, sent.Cc);
        Assert.Equal(form.Subject, sent.Subject);
        Assert.Equal(form.Body, sent.HtmlBody);
        Assert.Equal(new[] { "invoice.pdf", "report_.txt", "empty.bin" }, sent.Attachments.Select(item => item.FileName));
        Assert.Equal(new[] { "application/pdf", "text/plain; charset=utf-8", "application/octet-stream" },
            sent.Attachments.Select(item => item.ContentType));
        Assert.Equal(OriginalPdf, sent.Attachments[0].Content);
        Assert.Equal(extra, sent.Attachments[1].Content);
        Assert.Empty(sent.Attachments[2].Content);
        Assert.True(response.InvoiceStatusUpdated);
        Assert.Null(response.Warning);
        Assert.Equal(11, response.InvoiceId);
        Assert.Null(response.ReservationId);
        Assert.Equal(7, response.ModifiedByUserId);
        Assert.NotNull(response.ModifiedDate);
        var saved = await db.Invoices.AsNoTracking().SingleAsync(invoice => invoice.Id == 11);
        Assert.True(saved.IsEmailed);
        Assert.Equal(7, saved.ModifiedByUserId);
        Assert.Equal(response.ModifiedDate!.Value.UtcDateTime, saved.ModifiedDate);
        var json = JsonSerializer.SerializeToElement(response, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.Equal(new[]
        {
            "invoiceId", "invoiceStatusUpdated", "message", "modifiedByUserId", "modifiedDate", "reservationId", "warning",
        }, json.EnumerateObject().Select(property => property.Name).Order().ToArray());
        Assert.True(json.GetProperty("invoiceStatusUpdated").GetBoolean());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("reservationId").ValueKind);
    }

    [Fact]
    public async Task CcOnlyReservationAllowsBlankSubjectAndBodyWithoutChangingReservation()
    {
        await using var db = await Seed();
        var sender = new TestSender();
        var controller = await Controller(db, sender, new TestForm
        {
            Subject = "",
            Body = "",
            InvoiceId = null,
            ReservationId = "21",
            Receivers = """[{"email":"not an email","doSend":false}]""",
            CcRecipients = """[{"email":" cc@example.test ","doSend":true}]""",
        });
        var savesBefore = db.SaveTokens.Count;

        var response = Success(await controller.Send(CancellationToken.None));

        var sent = Assert.Single(sender.Messages);
        Assert.Empty(sent.To);
        Assert.Equal(new[] { "cc@example.test" }, sent.Cc);
        Assert.Equal("", sent.Subject);
        Assert.Equal("", sent.HtmlBody);
        Assert.Null(response.InvoiceStatusUpdated);
        Assert.Null(response.InvoiceId);
        Assert.Equal(21, response.ReservationId);
        Assert.Null(response.Warning);
        Assert.Equal(savesBefore, db.SaveTokens.Count);
        var reservation = await db.Reservations.AsNoTracking().SingleAsync(item => item.Id == 21);
        Assert.Equal("BOOKED", reservation.StatusCode);
        Assert.Equal(99, reservation.ModifiedByUserId);
    }

    [Fact]
    public async Task RequiresAuthenticationAndAnOffice()
    {
        await using var db = await Seed();
        var sender = new TestSender();
        var noUser = await Controller(db, sender, new TestForm(), new TestUserService(null));
        var noOffice = await Controller(db, sender, new TestForm(), new TestUserService(new User { Id = 7 }));

        Assert.IsType<UnauthorizedObjectResult>((await noUser.Send(CancellationToken.None)).Result);
        Assert.IsType<BadRequestObjectResult>((await noOffice.Send(CancellationToken.None)).Result);
        Assert.NotNull(Attribute.GetCustomAttribute(typeof(EmailController), typeof(AuthorizeAttribute)));
        Assert.Empty(sender.Messages);
    }

    [Theory]
    [InlineData("12", null)]
    [InlineData("999", null)]
    [InlineData(null, "22")]
    [InlineData(null, "999")]
    public async Task DocumentsFromOtherOfficesOrMissingAreNotSent(string? invoiceId, string? reservationId)
    {
        await using var db = await Seed();
        var sender = new TestSender();
        var controller = await Controller(db, sender, new TestForm { InvoiceId = invoiceId, ReservationId = reservationId });

        Assert.IsType<NotFoundObjectResult>((await controller.Send(CancellationToken.None)).Result);
        Assert.Empty(sender.Messages);
        Assert.False((await db.Invoices.AsNoTracking().SingleAsync(item => item.Id == 11)).IsEmailed);
    }

    [Theory]
    [InlineData("no-document")]
    [InlineData("both-documents")]
    [InlineData("bad-id")]
    [InlineData("no-recipient")]
    [InlineData("bad-selected-to")]
    [InlineData("bad-selected-cc")]
    [InlineData("bad-json")]
    [InlineData("non-array")]
    [InlineData("null-recipient")]
    [InlineData("missing-body")]
    [InlineData("duplicate-subject")]
    [InlineData("header-injection")]
    [InlineData("missing-pdf")]
    [InlineData("empty-first-file")]
    [InlineData("not-pdf")]
    [InlineData("wrong-file-field")]
    [InlineData("bad-content-type")]
    public async Task RejectsInvalidMultipartInputsWithoutSending(string invalid)
    {
        await using var db = await Seed();
        var sender = new TestSender();
        var form = invalid switch
        {
            "no-document" => new TestForm { InvoiceId = null },
            "both-documents" => new TestForm { ReservationId = "21" },
            "bad-id" => new TestForm { InvoiceId = "0" },
            "no-recipient" => new TestForm { Receivers = "[]", CcRecipients = "[]" },
            "bad-selected-to" => new TestForm { Receivers = """[{"email":"bad-address","doSend":true}]""" },
            "bad-selected-cc" => new TestForm { CcRecipients = """[{"email":"bad-address","doSend":true}]""" },
            "bad-json" => new TestForm { Receivers = "[" },
            "non-array" => new TestForm { Receivers = "{}" },
            "null-recipient" => new TestForm { Receivers = "[null]" },
            "missing-body" => new TestForm { Body = null },
            "duplicate-subject" => new TestForm { DuplicateSubject = true },
            "header-injection" => new TestForm { Subject = "subject\r\nBcc: other@example.test" },
            "missing-pdf" => new TestForm { Files = [] },
            "empty-first-file" => new TestForm
            {
                Files = [new("files", "empty.pdf", "application/pdf", []), new("files", "extra.pdf", "application/pdf", OriginalPdf)],
            },
            "not-pdf" => new TestForm { Files = [new("files", "fake.pdf", "application/pdf", "not a pdf"u8.ToArray())] },
            "wrong-file-field" => new TestForm { Files = [new("other", "invoice.pdf", "application/pdf", OriginalPdf)] },
            "bad-content-type" => new TestForm { Files = [new("files", "invoice.pdf", "not a media type", OriginalPdf)] },
            _ => throw new ArgumentOutOfRangeException(nameof(invalid)),
        };
        var controller = await Controller(db, sender, form);

        Assert.IsType<BadRequestObjectResult>((await controller.Send(CancellationToken.None)).Result);
        Assert.Empty(sender.Messages);
        Assert.False((await db.Invoices.AsNoTracking().SingleAsync(item => item.Id == 11)).IsEmailed);
    }

    [Theory]
    [InlineData("two@@example.test")]
    [InlineData("Name <to@example.test>")]
    [InlineData("to@example.test\r\nBcc: other@example.test")]
    [InlineData("to@example..test")]
    public async Task RejectsSelectedAddressesThatAreNotSingleMailboxes(string address)
    {
        await using var db = await Seed();
        var sender = new TestSender();
        var json = JsonSerializer.Serialize(new[] { new { email = address, doSend = true } });
        var controller = await Controller(db, sender, new TestForm { Receivers = json });

        Assert.IsType<BadRequestObjectResult>((await controller.Send(CancellationToken.None)).Result);
        Assert.Empty(sender.Messages);
    }

    [Fact]
    public async Task RejectsOversizedContentLengthBeforeReadingTheBody()
    {
        await using var db = await Seed();
        var sender = new TestSender();
        var controller = await Controller(db, sender, new TestForm());
        controller.Request.ContentLength = EmailController.MaxRequestBytes + 1L;

        Assert.Equal(StatusCodes.Status413PayloadTooLarge, Status(await controller.Send(CancellationToken.None)));
        Assert.Empty(sender.Messages);
    }

    [Fact]
    public async Task EnforcesExactMultipartLimitForUnknownLengthRequests()
    {
        await using var db = await Seed();
        var sender = new TestSender();
        const string boundary = "email-limit-boundary";
        var prefix = Encoding.ASCII.GetBytes(
            $"--{boundary}\r\nContent-Disposition: form-data; name=\"subject\"\r\n\r\n\r\n" +
            $"--{boundary}\r\nContent-Disposition: form-data; name=\"body\"\r\n\r\n\r\n" +
            $"--{boundary}\r\nContent-Disposition: form-data; name=\"receivers\"\r\n\r\n[{{\"email\":\"test@example.test\",\"doSend\":true}}]\r\n" +
            $"--{boundary}\r\nContent-Disposition: form-data; name=\"ccRecipients\"\r\n\r\n[]\r\n" +
            $"--{boundary}\r\nContent-Disposition: form-data; name=\"reservationId\"\r\n\r\n21\r\n" +
            $"--{boundary}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"original.pdf\"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.7\r\n" +
            $"--{boundary}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"extra.bin\"\r\nContent-Type: application/octet-stream\r\n\r\n");
        var suffix = Encoding.ASCII.GetBytes($"\r\n--{boundary}--\r\n");
        var bytes = new byte[EmailController.MaxRequestBytes + 1];
        Buffer.BlockCopy(prefix, 0, bytes, 0, prefix.Length);
        Buffer.BlockCopy(suffix, 0, bytes, EmailController.MaxRequestBytes - suffix.Length, suffix.Length);

        var exact = RawController(db, sender, new MemoryStream(bytes, 0, EmailController.MaxRequestBytes, false), boundary);
        var result = Success(await exact.Send(CancellationToken.None));
        Assert.Equal(21, result.ReservationId);
        Assert.Equal(EmailController.MaxRequestBytes - prefix.Length - suffix.Length,
            Assert.Single(sender.Messages).Attachments[1].Content.Length);

        sender.Messages.Clear();
        Buffer.BlockCopy(suffix, 0, bytes, EmailController.MaxRequestBytes - suffix.Length + 1, suffix.Length);
        bytes[EmailController.MaxRequestBytes - suffix.Length] = 0;
        var tooLarge = RawController(db, sender, new MemoryStream(bytes, false), boundary);
        Assert.Equal(StatusCodes.Status413PayloadTooLarge, Status(await tooLarge.Send(CancellationToken.None)));
        Assert.Empty(sender.Messages);
    }

    [Fact]
    public async Task KestrelAcceptsTheExactMultipartLimitAndRejectsOneByteMore()
    {
        var sender = new TestSender();
        var builder = WebApplication.CreateSlimBuilder(new WebApplicationOptions
        {
            ApplicationName = typeof(EmailController).Assembly.FullName,
        });
        builder.Logging.ClearProviders();
        builder.WebHost.UseKestrel().UseUrls("http://127.0.0.1:0");
        builder.Services.AddControllers().AddApplicationPart(typeof(EmailController).Assembly);
        builder.Services.AddAuthentication();
        builder.Services.AddAuthorization();
        var databaseName = Guid.NewGuid().ToString();
        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(databaseName));
        builder.Services.AddSingleton<ICurrentUserService>(new TestUserService(new User { Id = 7, OfficeId = 1 }));
        builder.Services.AddSingleton<IEmailSender>(sender);
        await using var app = builder.Build();
        app.Use(async (context, next) =>
        {
            context.User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, "7")], "test"));
            await next();
        });
        app.UseAuthorization();
        app.MapControllers();
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Reservations.Add(new Reservation { Id = 21, OfficeId = 1 });
            await db.SaveChangesAsync();
        }
        await app.StartAsync();

        using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };
        var form = new TestForm
        {
            InvoiceId = null,
            ReservationId = "21",
            Files =
            [
                new("files", "reservation.pdf", "application/pdf", OriginalPdf),
                new("files", "extra.bin", "application/octet-stream", []),
            ],
        };
        var (emptyBytes, _) = await Multipart(form);
        var padding = EmailController.MaxRequestBytes - emptyBytes.Length;

        async Task<HttpResponseMessage> SendWithPadding(int count)
        {
            var request = form with
            {
                Files = [form.Files[0], form.Files[1] with { Bytes = new byte[count] }],
            };
            var (bytes, contentType) = await Multipart(request);
            Assert.Equal(emptyBytes.Length + count, bytes.Length);
            using var content = new ByteArrayContent(bytes);
            content.Headers.TryAddWithoutValidation("Content-Type", contentType);
            using var message = new HttpRequestMessage(HttpMethod.Post, "/api/email/send") { Content = content };
            message.Headers.ExpectContinue = true;
            return await client.SendAsync(message);
        }

        using var exact = await SendWithPadding(padding);
        Assert.Equal(System.Net.HttpStatusCode.OK, exact.StatusCode);
        using var oversized = await SendWithPadding(padding + 1);
        Assert.True(oversized.StatusCode == System.Net.HttpStatusCode.RequestEntityTooLarge,
            $"Expected 413, got {(int)oversized.StatusCode}: {await oversized.Content.ReadAsStringAsync()}");
        Assert.Single(sender.Messages);
    }

    [Fact]
    public async Task UnknownLengthLimitIncludesBytesAfterTheFinalMultipartBoundary()
    {
        await using var db = await Seed();
        var sender = new TestSender();
        var (bytes, contentType) = await Multipart(new TestForm());
        var controller = NewController(db, sender);
        controller.Request.ContentType = contentType;
        controller.Request.Body = new PaddedStream(bytes, EmailController.MaxRequestBytes);

        Assert.Equal(StatusCodes.Status413PayloadTooLarge, Status(await controller.Send(CancellationToken.None)));
        Assert.Empty(sender.Messages);
    }

    [Theory]
    [InlineData(EmailDeliveryOutcome.NotSent)]
    [InlineData(EmailDeliveryOutcome.Unknown)]
    public async Task DeliveryFailuresAreSafeAndDoNotChangeInvoiceStatus(EmailDeliveryOutcome outcome)
    {
        await using var db = await Seed();
        var sender = new TestSender
        {
            Failure = new EmailDeliveryException(outcome, new IOException("synthetic-secret-and-html-body")),
        };
        var controller = await Controller(db, sender, new TestForm());

        var result = Assert.IsType<ObjectResult>((await controller.Send(CancellationToken.None)).Result);

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, result.StatusCode);
        var error = Assert.IsType<EmailErrorResponse>(result.Value);
        Assert.DoesNotContain("synthetic-secret", error.Message);
        if (outcome == EmailDeliveryOutcome.Unknown)
        {
            Assert.Contains("kan ha skickats", error.Message);
        }
        var invoice = await db.Invoices.AsNoTracking().SingleAsync(item => item.Id == 11);
        Assert.False(invoice.IsEmailed);
        Assert.Equal(99, invoice.ModifiedByUserId);
    }

    [Fact]
    public async Task InvalidSmtpSettingsReturnUnavailableWithoutUpdatingStatus()
    {
        await using var db = await Seed();
        var sender = new TestSender { Failure = new EmailConfigurationException() };
        var controller = await Controller(db, sender, new TestForm());

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, Status(await controller.Send(CancellationToken.None)));
        Assert.False((await db.Invoices.AsNoTracking().SingleAsync(item => item.Id == 11)).IsEmailed);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task AcceptedEmailWithStatusSaveFailureReturnsSuccessWithExplicitWarning(bool cancelAfterAcceptance)
    {
        await using var db = await Seed();
        db.SaveFailure = new InvalidOperationException("synthetic database secret");
        using var cancellation = new CancellationTokenSource();
        var sender = new TestSender
        {
            OnSend = (_, _) =>
            {
                if (cancelAfterAcceptance)
                {
                    cancellation.Cancel();
                }
                return Task.CompletedTask;
            },
        };
        var controller = await Controller(db, sender, new TestForm());

        var response = Success(await controller.Send(cancellation.Token));

        Assert.False(response.InvoiceStatusUpdated);
        Assert.NotNull(response.Warning);
        Assert.Contains("skickades", response.Warning);
        Assert.DoesNotContain("synthetic database secret", response.Warning);
        Assert.Null(response.ModifiedDate);
        Assert.Single(sender.Messages);
        db.ChangeTracker.Clear();
        Assert.False((await db.Invoices.SingleAsync(item => item.Id == 11)).IsEmailed);
    }

    [Fact]
    public async Task CancellationAfterAcceptanceStillPersistsInvoiceStatus()
    {
        await using var db = await Seed();
        using var cancellation = new CancellationTokenSource();
        var sender = new TestSender
        {
            OnSend = (_, token) =>
            {
                Assert.Equal(cancellation.Token, token);
                cancellation.Cancel();
                return Task.CompletedTask;
            },
        };
        var controller = await Controller(db, sender, new TestForm());

        var response = Success(await controller.Send(cancellation.Token));

        Assert.True(response.InvoiceStatusUpdated);
        Assert.False(db.SaveTokens[^1].IsCancellationRequested);
        Assert.True((await db.Invoices.AsNoTracking().SingleAsync(item => item.Id == 11)).IsEmailed);
    }

    [Fact]
    public async Task CancellationDuringSubmissionPropagatesWithoutUpdatingInvoice()
    {
        await using var db = await Seed();
        using var cancellation = new CancellationTokenSource();
        var sender = new TestSender
        {
            OnSend = (_, token) =>
            {
                cancellation.Cancel();
                return Task.FromCanceled(token);
            },
        };
        var controller = await Controller(db, sender, new TestForm());

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => controller.Send(cancellation.Token));
        Assert.False((await db.Invoices.AsNoTracking().SingleAsync(item => item.Id == 11)).IsEmailed);
    }

    private static EmailSendResponse Success(ActionResult<EmailSendResponse> result) =>
        Assert.IsType<EmailSendResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);

    private static int? Status(ActionResult<EmailSendResponse> result) =>
        Assert.IsAssignableFrom<ObjectResult>(result.Result).StatusCode;

    private static async Task<TestDbContext> Seed()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        var db = new TestDbContext(options);
        db.Invoices.AddRange(
            new Invoice { Id = 11, OfficeId = 1, ModifiedByUserId = 99, ModifiedDate = new DateTime(2020, 1, 1) },
            new Invoice { Id = 12, OfficeId = 2 });
        db.Reservations.AddRange(
            new Reservation { Id = 21, OfficeId = 1, StatusCode = "BOOKED", ModifiedByUserId = 99 },
            new Reservation { Id = 22, OfficeId = 2 });
        await db.SaveChangesAsync();
        return db;
    }

    private static async Task<EmailController> Controller(
        TestDbContext db, TestSender sender, TestForm form, ICurrentUserService? userService = null)
    {
        var (bytes, contentType) = await Multipart(form);
        var controller = NewController(db, sender, userService);
        controller.Request.ContentType = contentType;
        controller.Request.ContentLength = bytes.Length;
        controller.Request.Body = new MemoryStream(bytes, false);
        return controller;
    }

    private static EmailController RawController(TestDbContext db, TestSender sender, Stream body, string boundary)
    {
        var controller = NewController(db, sender);
        controller.Request.ContentType = $"multipart/form-data; boundary={boundary}";
        controller.Request.Body = body;
        controller.HttpContext.Features.Set<IFormFeature>(new FormFeature(controller.Request, new FormOptions
        {
            MemoryBufferThreshold = EmailController.MaxRequestBytes,
            MultipartBodyLengthLimit = EmailController.MaxRequestBytes,
            ValueLengthLimit = EmailController.MaxRequestBytes,
        }));
        return controller;
    }

    private static EmailController NewController(
        TestDbContext db, TestSender sender, ICurrentUserService? userService = null) =>
        new(db, userService ?? new TestUserService(new User { Id = 7, OfficeId = 1 }), sender,
            NullLogger<EmailController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
        };

    private static async Task<(byte[] Bytes, string ContentType)> Multipart(TestForm form)
    {
        using var content = new MultipartFormDataContent("email-test-boundary");
        AddValue("subject", form.Subject);
        if (form.DuplicateSubject)
        {
            AddValue("subject", form.Subject);
        }
        AddValue("body", form.Body);
        AddValue("receivers", form.Receivers);
        AddValue("ccRecipients", form.CcRecipients);
        AddValue("invoiceId", form.InvoiceId);
        AddValue("reservationId", form.ReservationId);
        foreach (var file in form.Files)
        {
            var part = new ByteArrayContent(file.Bytes);
            part.Headers.TryAddWithoutValidation("Content-Type", file.ContentType);
            content.Add(part, file.FieldName, file.FileName);
        }
        return (await content.ReadAsByteArrayAsync(), content.Headers.ContentType!.ToString());

        void AddValue(string key, string? value)
        {
            if (value != null)
            {
                content.Add(new StringContent(value, Encoding.UTF8), key);
            }
        }
    }

    private sealed record TestForm
    {
        public string? Subject { get; init; } = "Synthetic subject";
        public string? Body { get; init; } = "<p>Synthetic message</p>";
        public string? Receivers { get; init; } = """[{"email":"to@example.test","doSend":true}]""";
        public string? CcRecipients { get; init; } = "[]";
        public string? InvoiceId { get; init; } = "11";
        public string? ReservationId { get; init; }
        public bool DuplicateSubject { get; init; }
        public List<TestFile> Files { get; init; } = [new("files", "invoice.pdf", "application/pdf", OriginalPdf)];
    }

    private sealed record TestFile(string FieldName, string FileName, string ContentType, byte[] Bytes);

    private sealed class TestUserService(User? user) : ICurrentUserService
    {
        public Task<User?> GetCurrentUserAsync(ClaimsPrincipal? principal) => Task.FromResult(user);
    }

    private sealed class TestSender : IEmailSender
    {
        public List<EmailMessage> Messages { get; } = [];
        public Exception? Failure { get; init; }
        public Func<EmailMessage, CancellationToken, Task>? OnSend { get; set; }

        public Task SendAsync(string toAddress, string subject, string htmlBody, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            Messages.Add(message);
            if (Failure != null)
            {
                throw Failure;
            }
            if (OnSend != null)
            {
                await OnSend(message, cancellationToken);
            }
        }
    }

    private sealed class TestDbContext(DbContextOptions<ApplicationDbContext> options) : ApplicationDbContext(options)
    {
        public List<CancellationToken> SaveTokens { get; } = [];
        public Exception? SaveFailure { get; set; }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveTokens.Add(cancellationToken);
            return SaveFailure == null
                ? base.SaveChangesAsync(cancellationToken)
                : Task.FromException<int>(SaveFailure);
        }
    }

    private sealed class PaddedStream(byte[] prefix, long padding) : Stream
    {
        private int _position;
        private long _remainingPadding = padding;

        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }
        public override int Read(byte[] buffer, int offset, int count) => Read(buffer.AsSpan(offset, count));
        public override int Read(Span<byte> buffer)
        {
            if (_position < prefix.Length)
            {
                var count = Math.Min(buffer.Length, prefix.Length - _position);
                prefix.AsSpan(_position, count).CopyTo(buffer);
                _position += count;
                return count;
            }
            var size = (int)Math.Min(buffer.Length, _remainingPadding);
            buffer[..size].Clear();
            _remainingPadding -= size;
            return size;
        }
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return ValueTask.FromResult(Read(buffer.Span));
        }
        public override void Flush() => throw new NotSupportedException();
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }
}
