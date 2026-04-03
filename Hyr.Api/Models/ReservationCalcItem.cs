
using Microsoft.EntityFrameworkCore.Metadata.Internal;

namespace Hyr.Api.Models
{
    public class ReservationCalcItem
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public int? ReservationCalcId { get; set; }
        public int? ItemId { get; set; }
        public int? PriceListId { get; set; }
        public string Text { get; set; } = string.Empty;
        public decimal? Qty { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? Sum { get; set; }

        public virtual Office? Office { get; set; }
        public virtual ReservationCalc? ReservationCalc { get; set; }
        public virtual Item? Item { get; set; }
        public virtual PriceList? PriceList { get; set; }
        public virtual ICollection<InvoiceRow>? InvoiceRows { get; set; } = new List<InvoiceRow>();

    }
}
