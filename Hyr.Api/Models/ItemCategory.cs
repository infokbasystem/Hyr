using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Hyr.Api.Models
{
    public class ItemCategory
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public string Name { get; set; } = string.Empty;

        public virtual Office? Office { get; set; }
        public virtual ICollection<Item>? Items { get; set; } = new List<Item>();
    }
}