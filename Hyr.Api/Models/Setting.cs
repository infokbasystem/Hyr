using System.ComponentModel.DataAnnotations.Schema;

namespace Hyr.Api.Models
{
    [Table("Setting")]
    public class Setting
    {
        public int lngSettings_ID { get; set; }
        public string strCompany { get; set; } = string.Empty;
        public string FortnoxRefreshKey { get; set; } = string.Empty;
        public string FortnoxKey { get; set; } = string.Empty;
    }
}