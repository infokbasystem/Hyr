
namespace Hyr.Api.Models
{
    public class PriceList
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public virtual ICollection<ReservationCalcItem> ReservationCalcItems { get; set; } = new List<ReservationCalcItem>();
    }
}