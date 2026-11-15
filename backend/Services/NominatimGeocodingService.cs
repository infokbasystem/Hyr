using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Backend.Services
{
    public class GeocodingSettings
    {
        public string BaseUrl { get; set; } = "https://nominatim.openstreetmap.org";
        // Nominatim's usage policy requires an identifying User-Agent, ideally with a contact address.
        public string UserAgent { get; set; } = "Hyr/1.0";
        public string CountryCodes { get; set; } = "se";
        public string Language { get; set; } = "sv";
        public int MaxResults { get; set; } = 5;
        public int CacheMinutes { get; set; } = 60;
        public int MinRequestIntervalMilliseconds { get; set; } = 1100;
    }

    public sealed record GeocodingQuery(string? Street, string? ZipCode, string? City, string? FreeText);

    public sealed record GeocodingResult(
        string DisplayName,
        decimal Latitude,
        decimal Longitude,
        string Street,
        string ZipCode,
        string City);

    public class GeocodingUnavailableException : Exception
    {
        public GeocodingUnavailableException(string message, Exception? inner = null) : base(message, inner)
        {
        }
    }

    public interface IGeocodingService
    {
        Task<IReadOnlyList<GeocodingResult>> SearchAsync(GeocodingQuery query, CancellationToken cancellationToken = default);
    }

    public class NominatimGeocodingService : IGeocodingService
    {
        public const string HttpClientName = "geocoding";

        // Nominatim allows at most one request per second per application, so every instance shares one gate.
        private static readonly SemaphoreSlim RequestGate = new(1, 1);
        private static DateTime _lastRequestUtc = DateTime.MinValue;

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;
        private readonly GeocodingSettings _settings;
        private readonly ILogger<NominatimGeocodingService> _logger;

        public NominatimGeocodingService(
            IHttpClientFactory httpClientFactory,
            IMemoryCache cache,
            IOptions<GeocodingSettings> settings,
            ILogger<NominatimGeocodingService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _cache = cache;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<IReadOnlyList<GeocodingResult>> SearchAsync(GeocodingQuery query, CancellationToken cancellationToken = default)
        {
            var path = BuildRequestPath(query);
            if (path == null)
            {
                return [];
            }

            if (_cache.TryGetValue(path, out IReadOnlyList<GeocodingResult>? cached) && cached != null)
            {
                return cached;
            }

            var results = await FetchAsync(path, cancellationToken);
            _cache.Set(path, results, TimeSpan.FromMinutes(Math.Max(1, _settings.CacheMinutes)));
            return results;
        }

        internal string? BuildRequestPath(GeocodingQuery query)
        {
            var street = query.Street?.Trim();
            var zip = query.ZipCode?.Trim();
            var city = query.City?.Trim();
            var freeText = query.FreeText?.Trim();

            var parameters = new List<KeyValuePair<string, string>>();
            if (!string.IsNullOrEmpty(freeText))
            {
                parameters.Add(new("q", freeText));
            }
            else if (!string.IsNullOrEmpty(street) || !string.IsNullOrEmpty(zip) || !string.IsNullOrEmpty(city))
            {
                if (!string.IsNullOrEmpty(street)) parameters.Add(new("street", street));
                if (!string.IsNullOrEmpty(zip)) parameters.Add(new("postalcode", zip));
                if (!string.IsNullOrEmpty(city)) parameters.Add(new("city", city));
            }
            else
            {
                return null;
            }

            parameters.Add(new("format", "jsonv2"));
            parameters.Add(new("addressdetails", "1"));
            parameters.Add(new("limit", Math.Clamp(_settings.MaxResults, 1, 10).ToString(CultureInfo.InvariantCulture)));
            if (!string.IsNullOrWhiteSpace(_settings.CountryCodes))
            {
                parameters.Add(new("countrycodes", _settings.CountryCodes));
            }
            if (!string.IsNullOrWhiteSpace(_settings.Language))
            {
                parameters.Add(new("accept-language", _settings.Language));
            }

            return "search?" + string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));
        }

        private async Task<IReadOnlyList<GeocodingResult>> FetchAsync(string path, CancellationToken cancellationToken)
        {
            await RequestGate.WaitAsync(cancellationToken);
            try
            {
                var wait = TimeSpan.FromMilliseconds(_settings.MinRequestIntervalMilliseconds) - (DateTime.UtcNow - _lastRequestUtc);
                if (wait > TimeSpan.Zero)
                {
                    await Task.Delay(wait, cancellationToken);
                }

                var client = _httpClientFactory.CreateClient(HttpClientName);
                client.BaseAddress = new Uri(_settings.BaseUrl.TrimEnd('/') + "/");
                client.Timeout = TimeSpan.FromSeconds(10);
                client.DefaultRequestHeaders.UserAgent.Clear();
                client.DefaultRequestHeaders.UserAgent.ParseAdd(_settings.UserAgent);
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                _lastRequestUtc = DateTime.UtcNow;
                using var response = await client.GetAsync(path, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Geocoding request failed with status {StatusCode}", (int)response.StatusCode);
                    throw new GeocodingUnavailableException("Adressökningen är inte tillgänglig just nu. Försök igen senare eller klicka direkt på kartan.");
                }

                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                return ParseResults(body);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(ex, "Geocoding request failed");
                throw new GeocodingUnavailableException("Adressökningen är inte tillgänglig just nu. Försök igen senare eller klicka direkt på kartan.", ex);
            }
            catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "Geocoding request timed out");
                throw new GeocodingUnavailableException("Adressökningen tog för lång tid. Försök igen senare eller klicka direkt på kartan.", ex);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Geocoding response could not be parsed");
                throw new GeocodingUnavailableException("Adressökningen gav ett oväntat svar.", ex);
            }
            finally
            {
                RequestGate.Release();
            }
        }

        internal static IReadOnlyList<GeocodingResult> ParseResults(string json)
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            var results = new List<GeocodingResult>();
            foreach (var element in document.RootElement.EnumerateArray())
            {
                if (!TryGetCoordinate(element, "lat", out var latitude) || !TryGetCoordinate(element, "lon", out var longitude))
                {
                    continue;
                }

                var address = element.TryGetProperty("address", out var addressElement) && addressElement.ValueKind == JsonValueKind.Object
                    ? addressElement
                    : (JsonElement?)null;

                var road = GetString(address, "road") ?? GetString(address, "pedestrian") ?? GetString(address, "footway") ?? string.Empty;
                var houseNumber = GetString(address, "house_number");
                var street = string.IsNullOrEmpty(road) ? string.Empty : string.IsNullOrEmpty(houseNumber) ? road : $"{road} {houseNumber}";
                var city = GetString(address, "city") ?? GetString(address, "town") ?? GetString(address, "village")
                    ?? GetString(address, "municipality") ?? GetString(address, "hamlet") ?? string.Empty;

                results.Add(new GeocodingResult(
                    GetString(element, "display_name") ?? string.Empty,
                    Math.Round(latitude, 6),
                    Math.Round(longitude, 6),
                    street,
                    GetString(address, "postcode") ?? string.Empty,
                    city));
            }

            return results;
        }

        private static bool TryGetCoordinate(JsonElement element, string name, out decimal value)
        {
            value = 0m;
            if (!element.TryGetProperty(name, out var property))
            {
                return false;
            }

            return property.ValueKind switch
            {
                JsonValueKind.String => decimal.TryParse(property.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out value),
                JsonValueKind.Number => property.TryGetDecimal(out value),
                _ => false,
            };
        }

        private static string? GetString(JsonElement? element, string name) =>
            element.HasValue ? GetString(element.Value, name) : null;

        private static string? GetString(JsonElement element, string name) =>
            element.TryGetProperty(name, out var property) && property.ValueKind == JsonValueKind.String
                ? property.GetString()?.Trim()
                : null;
    }
}
