
namespace Backend.Models
{
    public class ReservationCalc
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public int? ReservationId { get; set; }
        public DateTime? DateTimeFrom { get; set; }
        public DateTime? DateTimeTo { get; set; }
        public string ReceiverTypeCode { get; set; } = ReceiverTypeCodes.Customer;

        public virtual Office? Office { get; set; }
        public virtual Reservation? Reservation { get; set; }
        public ICollection<ReservationCalcItem> ReservationCalcItems { get; set; } = new List<ReservationCalcItem>();

    }
}