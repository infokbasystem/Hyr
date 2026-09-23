using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Backend.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Backend.Services
{
    public class TinkPaymentService : ITinkPaymentService
    {
        public const string HttpClientName = "tink";
        private const string DefaultApiBaseUrl = "https://api.tink.com";
        private const string TinkLinkBaseUrl = "https://link.tink.com/1.0/pay/direct/";
        private const string DefaultMarket = "SE";
        private const string DefaultLocale = "sv_SE";
        private const string DefaultPaymentScheme = "SEPA_CREDIT_TRANSFER";
        private const string DefaultAccountType = "iban";
        private const string Currency = "SEK";

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _memoryCache;
        private readonly ISecretProtector _secretProtector;
        private readonly TinkSettings _settings;
        private readonly ILogger<TinkPaymentService> _logger;

        public TinkPaymentService(
            IHttpClientFactory httpClientFactory,
            IMemoryCache memoryCache,
            ISecretProtector secretProtector,
            IOptions<TinkSettings> settings,
            ILogger<TinkPaymentService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _memoryCache = memoryCache;
            _secretProtector = secretProtector;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<TinkPaymentRequestResult> CreatePaymentRequestAsync(Office office, Invoice invoice, decimal amount, CancellationToken cancellationToken = default)
        {
            ValidateOffice(office);

            if (amount <= 0m)
            {
                throw new InvalidOperationException("Fakturabeloppet måste vara större än noll för att skapa en Tink-betalning.");
            }

            var market = GetValueOrDefault(office.TinkMarket, DefaultMarket);
            var accountType = GetValueOrDefault(office.TinkRecipientAccountType, DefaultAccountType);
            var paymentScheme = GetValueOrDefault(office.TinkPaymentScheme, DefaultPaymentScheme);
            var recipientName = GetValueOrDefault(office.TinkRecipientName, office.Name);
            var reference = invoice.InvoiceNr.HasValue ? $"Faktura {invoice.InvoiceNr}" : $"Faktura {invoice.Id}";

            var payload = new
            {
                recipient = new
                {
                    accountNumber = office.TinkRecipientAccountNumber,
                    accountType,
                },
                amount,
                currency = Currency,
                market,
                recipientName,
                sourceMessage = reference,
                remittanceInformation = new
                {
                    type = "UNSTRUCTURED",
                    value = reference,
                },
                paymentScheme,
            };

            var accessToken = await GetAccessTokenAsync(office, cancellationToken);
            var client = CreateClient(office);

            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/payments/requests")
            {
                Content = JsonContent(payload),
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            using var response = await client.SendAsync(request, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Tink payment request failed with {StatusCode}: {Body}", response.StatusCode, body);
                throw new InvalidOperationException($"Tink kunde inte skapa betalningen ({(int)response.StatusCode}).");
            }

            var created = JsonSerializer.Deserialize<TinkPaymentRequestResponse>(body, JsonOptions);
            if (created == null || string.IsNullOrWhiteSpace(created.Id))
            {
                throw new InvalidOperationException("Tink returnerade inget betalnings-id.");
            }

            var linkUrl = BuildTinkLinkUrl(office, created.Id, market);
            return new TinkPaymentRequestResult(created.Id, linkUrl, amount, Currency, market);
        }

        public async Task<TinkPaymentStatusResult> GetStatusAsync(Office office, string tinkRequestId, CancellationToken cancellationToken = default)
        {
            ValidateOffice(office);

            var accessToken = await GetAccessTokenAsync(office, cancellationToken);
            var client = CreateClient(office);

            using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/payments/requests/{Uri.EscapeDataString(tinkRequestId)}/transfers");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            using var response = await client.SendAsync(request, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Tink status request failed with {StatusCode}: {Body}", response.StatusCode, body);
                throw new InvalidOperationException($"Kunde inte hämta betalstatus från Tink ({(int)response.StatusCode}).");
            }

            var transfers = JsonSerializer.Deserialize<TinkTransfersResponse>(body, JsonOptions);
            var transfer = transfers?.PaymentRequestCreatedTransfers?.LastOrDefault();

            if (transfer == null)
            {
                return new TinkPaymentStatusResult("PENDING", "Ingen betalning har påbörjats än.");
            }

            return new TinkPaymentStatusResult(transfer.Status ?? string.Empty, transfer.StatusMessage ?? string.Empty);
        }

        private async Task<string> GetAccessTokenAsync(Office office, CancellationToken cancellationToken)
        {
            var cacheKey = $"tink-token-{office.Id}";
            if (_memoryCache.TryGetValue<string>(cacheKey, out var cachedToken) && !string.IsNullOrEmpty(cachedToken))
            {
                return cachedToken;
            }

            var client = CreateClient(office);
            using var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = office.TinkClientId,
                ["client_secret"] = _secretProtector.Unprotect(office.TinkClientSecret),
                ["grant_type"] = "client_credentials",
                ["scope"] = "payment:read,payment:write",
            });

            using var response = await client.PostAsync("/api/v1/oauth/token", content, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Tink token request failed with {StatusCode}: {Body}", response.StatusCode, body);
                throw new InvalidOperationException($"Kunde inte autentisera mot Tink ({(int)response.StatusCode}).");
            }

            var token = JsonSerializer.Deserialize<TinkTokenResponse>(body, JsonOptions);
            if (token == null || string.IsNullOrWhiteSpace(token.AccessToken))
            {
                throw new InvalidOperationException("Tink returnerade ingen access token.");
            }

            var lifetime = TimeSpan.FromSeconds(Math.Max(30, token.ExpiresIn - 60));
            _memoryCache.Set(cacheKey, token.AccessToken, lifetime);

            return token.AccessToken;
        }

        private HttpClient CreateClient(Office office)
        {
            var client = _httpClientFactory.CreateClient(HttpClientName);
            client.BaseAddress = new Uri(GetValueOrDefault(_settings.ApiBaseUrl, DefaultApiBaseUrl));
            return client;
        }

        private string BuildTinkLinkUrl(Office office, string paymentRequestId, string market)
        {
            var locale = GetValueOrDefault(office.TinkLocale, DefaultLocale);
            var query = new Dictionary<string, string>
            {
                ["client_id"] = office.TinkClientId,
                ["redirect_uri"] = _settings.RedirectUri,
                ["market"] = market,
                ["locale"] = locale,
                ["payment_request_id"] = paymentRequestId,
            };

            var queryString = string.Join("&", query.Select(pair => $"{pair.Key}={Uri.EscapeDataString(pair.Value)}"));
            return $"{TinkLinkBaseUrl}?{queryString}";
        }

        private void ValidateOffice(Office office)
        {
            if (!office.TinkEnabled)
            {
                throw new InvalidOperationException("Tink är inte aktiverat för kontoret.");
            }

            if (string.IsNullOrWhiteSpace(office.TinkClientId) || string.IsNullOrWhiteSpace(office.TinkClientSecret))
            {
                throw new InvalidOperationException("Tink client id och client secret saknas i inställningarna.");
            }

            if (string.IsNullOrWhiteSpace(office.TinkRecipientAccountNumber))
            {
                throw new InvalidOperationException("Mottagarkonto för Tink saknas i inställningarna.");
            }

            if (string.IsNullOrWhiteSpace(_settings.RedirectUri))
            {
                throw new InvalidOperationException("Redirect-URL för Tink saknas i serverkonfigurationen (Tink:RedirectUri).");
            }
        }

        private static string GetValueOrDefault(string value, string fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        }

        private static StringContent JsonContent(object payload)
        {
            return new StringContent(JsonSerializer.Serialize(payload, JsonOptions), System.Text.Encoding.UTF8, "application/json");
        }

        private class TinkTokenResponse
        {
            [JsonPropertyName("access_token")]
            public string AccessToken { get; set; } = string.Empty;

            [JsonPropertyName("expires_in")]
            public int ExpiresIn { get; set; }
        }

        private class TinkPaymentRequestResponse
        {
            public string Id { get; set; } = string.Empty;
        }

        private class TinkTransfersResponse
        {
            public List<TinkTransfer>? PaymentRequestCreatedTransfers { get; set; }
        }

        private class TinkTransfer
        {
            public string? Status { get; set; }
            public string? StatusMessage { get; set; }
        }
    }
}
