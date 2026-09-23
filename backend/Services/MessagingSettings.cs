namespace Backend.Services
{
    public class TinkSettings
    {
        public string ApiBaseUrl { get; set; } = "https://api.tink.com";
        public string RedirectUri { get; set; } = string.Empty;
    }

    public class SmtpSettings
    {
        public string Host { get; set; } = string.Empty;
        public int Port { get; set; } = 587;
        public bool UseStartTls { get; set; } = true;
        public string UserName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FromAddress { get; set; } = string.Empty;
        public string FromName { get; set; } = string.Empty;
    }

    public class SmsSettings
    {
        public string Provider { get; set; } = "pixie";
        public string BaseUrl { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string Sender { get; set; } = string.Empty;
    }
}
