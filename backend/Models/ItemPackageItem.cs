namespace Backend.Models
{
    public class ItemPackageItem
    {
        public int ItemId { get; set; }
        public int PackageItemId { get; set; }
        public decimal Quantity { get; set; } = 1m;

        public virtual Item? Item { get; set; }
        public virtual Item? PackageItem { get; set; }
    }
}
