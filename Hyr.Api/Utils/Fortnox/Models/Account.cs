using System.Text.Json.Serialization;

namespace Hyr.Api.Utils.Fortnox.Models
{
    public class Account
    {
        public int Number { get; set; }
        public string? Description { get; set; } = string.Empty;
        public bool Active { get; set; }
    }

    public class AccountResponse
    {
        [JsonPropertyName("Account")]
        public Account? Account { get; set; }
    }

    public class AccountsResponse
    {
        [JsonPropertyName("Accounts")]
        public List<Account>? Accounts { get; set; }
    }
}