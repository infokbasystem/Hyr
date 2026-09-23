namespace Backend.Models
{
    public class OfficeItemType
    {
        public int OfficeId { get; set; }
        public int ItemTypeId { get; set; }

        public virtual Office? Office { get; set; }
        public virtual ItemType? ItemType { get; set; }
    }
}