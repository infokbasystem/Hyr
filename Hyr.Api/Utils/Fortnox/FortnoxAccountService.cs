using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Hyr.Api.Utils.Fortnox.Models;

namespace Hyr.Api.Utils
{
    public class FortnoxAccountService
    {
        private readonly HttpClient _httpClient;

        public FortnoxAccountService(string accessToken)
        {
            _httpClient = new HttpClient();
            _httpClient.BaseAddress = new Uri("https://api.fortnox.se/3/");
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");

        }

        public async Task<Account?> GetAccountAsync(int accountNumber)
        {
            // var request = new HttpRequestMessage(HttpMethod.Get, "https://api.fortnox.se/3/accounts/3001");
            // var response = await _httpClient.SendAsync(request);
            // response.EnsureSuccessStatusCode();
            // var a = await response.Content.ReadAsStringAsync();
            // return null;

            var response = await _httpClient.GetAsync($"accounts/{accountNumber}");
            if (!response.IsSuccessStatusCode)
                return null;
            var resultJson = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<AccountResponse>(resultJson);
            return result?.Account;
        }

        public async Task<string> AddAccountAsync(Account account)
        {
            var accountWrapper = new
            {
                Account = account
            };

            var json = JsonSerializer.Serialize(accountWrapper);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("accounts", content);

            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsStringAsync();
        }
        // {
        //     var account = new
        //     {
        //         Account = new
        //         {
        //             Number = accountNumber,
        //             Description = description,
        //             Active = active
        //         }
        //     };

        //     var json = JsonSerializer.Serialize(account);
        //     var content = new StringContent(json, Encoding.UTF8, "application/json");

        //     var response = await _httpClient.PostAsync("accounts", content);

        //     response.EnsureSuccessStatusCode();

        //     return await response.Content.ReadAsStringAsync();
        // }
    }
}