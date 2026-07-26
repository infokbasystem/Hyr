using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Hyr.Api.Models
{
    public class ItemType
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;

        public virtual ICollection<Item>? Items { get; set; } = new List<Item>();
        public virtual ICollection<OfficeItemType> OfficeItemTypes { get; set; } = new List<OfficeItemType>();
    }
}