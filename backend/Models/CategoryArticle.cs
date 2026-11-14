using System.Text.Json.Serialization;

namespace Backend.Models;

public class CategoryArticle
{
    public int ItemCategoryId { get; set; }
    public int ArticleId { get; set; }
    public decimal Quantity { get; set; } = 1m;

    [JsonIgnore]
    public virtual ItemCategory? ItemCategory { get; set; }
    [JsonIgnore]
    public virtual Article? Article { get; set; }
}
