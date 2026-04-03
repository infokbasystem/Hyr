using System.Text.Json.Serialization;

namespace Hyr.Api.Utils.Fortnox.Models
{
    public class CostCenter
    {
        public string Code { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool Active { get; set; }
    }

    public class CostCenterResponse
    {
        [JsonPropertyName("CostCenter")]
        public CostCenter? CostCenter { get; set; }
    }

    public class CostCentersResponse
    {
        [JsonPropertyName("CostCenters")]
        public List<CostCenter>? CostCenters { get; set; }
    }
}