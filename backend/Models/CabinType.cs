namespace Backend.Models
{
    public class CabinType
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int? SortNr { get; set; }

        public virtual ICollection<Item>? Items { get; set; } = new List<Item>();
    }
}
