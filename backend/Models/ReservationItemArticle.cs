using System.Text.Json.Serialization;

namespace Backend.Models;

public class ReservationItemArticle
{
    public int Id { get; set; }
    public int ReservationItemId { get; set; }
    public int ArticleId { get; set; }
    public decimal Quantity { get; set; } = 1m;
    public decimal? UnitPrice { get; set; }

    [JsonIgnore]
    public virtual ReservationItem? ReservationItem { get; set; }
    [JsonIgnore]
    public virtual Article? Article { get; set; }
}
