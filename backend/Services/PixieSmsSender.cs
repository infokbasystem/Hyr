using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Backend.Services
{
    public interface ISmsSender
    {
        Task SendAsync(string toNumber, string message, CancellationToken cancellationToken = default);
    }

    // Pixie gateway: expects a JSON POST with bearer auth. Adjust payload when Pixie API docs are available.
    public class PixieSmsSender : ISmsSender
    {
        public const string HttpClientName = "sms";

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly SmsSettings _settings;
        private readonly ILogger<PixieSmsSender> _logger;

        public PixieSmsSender(IHttpClientFactory httpClientFactory, IOptions<SmsSettings> settings, ILogger<PixieSmsSender> logger)
        {
            _httpClientFactory = httpClientFactory;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task SendAsync(string toNumber, string message, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.BaseUrl) || string.IsNullOrWhiteSpace(_settings.ApiKey))
            {
                throw new InvalidOperationException("SMS-utskick är inte konfigurerat (Sms:BaseUrl och Sms:ApiKey saknas).");
            }

            if (string.IsNullOrWhiteSpace(toNumber))
            {
                throw new InvalidOperationException("Mottagarens mobilnummer saknas.");
            }

            var payload = new
            {
                from = _settings.Sender,
                to = toNumber,
                message,
            };

            var client = _httpClientFactory.CreateClient(HttpClientName);
            client.BaseAddress = new Uri(_settings.BaseUrl);

            using var request = new HttpRequestMessage(HttpMethod.Post, "sms")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);

            using var response = await client.SendAsync(request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("SMS send failed with {StatusCode}: {Body}", response.StatusCode, body);
                throw new InvalidOperationException($"Kunde inte skicka SMS ({(int)response.StatusCode}).");
            }

            _logger.LogInformation("SMS sent to {ToNumber}", toNumber);
        }
    }
}
