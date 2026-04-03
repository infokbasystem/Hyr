namespace Hyr.Api.Models
{
    public class FortnoxActivateRequest
    {
        public string Code { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string RedirectUrl { get; set; }= string.Empty;
    }
}