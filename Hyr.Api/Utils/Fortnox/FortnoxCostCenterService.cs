using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Hyr.Api.Utils.Fortnox.Models;

namespace Hyr.Api.Utils
{
    public class FortnoxCostCenterService
    {
        private readonly HttpClient _httpClient;

        public FortnoxCostCenterService(string accessToken)
        {
            _httpClient = new HttpClient();
            _httpClient.BaseAddress = new Uri("https://api.fortnox.se/3/");
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");

        }

        public async Task<CostCenter?> GetCostCenterAsync(string code)
        {
            var response = await _httpClient.GetAsync($"costcenters/{code}");
            if (!response.IsSuccessStatusCode)
                return null;
            var resultJson = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<CostCenterResponse>(resultJson);
            return result?.CostCenter;
        }

        public async Task<string> AddCostCenterAsync(CostCenter costCenter)
        {
            var costCenterWrapper = new
            {
                CostCenter = costCenter
            };

            var json = JsonSerializer.Serialize(costCenterWrapper);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("costcenters", content);

            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsStringAsync();
        }
        // {
        //     var costCenter = new
        //     {
        //         CostCenter = new
        //         {
        //             Number = costCenterNumber,
        //             Description = description,
        //             Active = active
        //         }
        //     };

        //     var json = JsonSerializer.Serialize(costCenter);
        //     var content = new StringContent(json, Encoding.UTF8, "application/json");

        //     var response = await _httpClient.PostAsync("costCenters", content);

        //     response.EnsureSuccessStatusCode();

        //     return await response.Content.ReadAsStringAsync();
        // }
    }
}