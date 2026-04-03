using System.ComponentModel.DataAnnotations.Schema;

namespace Hyr.Api.Models
{
    public class Reservation
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public int? CreatedByUserId { get; set; }
        public DateTime? CreatedDate { get; set; }
        public int? ModifiedByUserId { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public int? ReservationNr { get; set; }
        public int? CustomerId { get; set; }
        public string StatusCode { get; set; } = string.Empty;
        public string DriverMobilePhone { get; set; } = string.Empty;
        public string DriverNote { get; set; } = string.Empty;
        public string DriverLicenceNr { get; set; } = string.Empty;
        public DateTime? DriverLicenceExpireDate { get; set; }
        public string Orderer { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string ZipCode { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string MobilePhone { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public decimal? Deposition { get; set; }
        public string Note { get; set; } = string.Empty;
        public string DeliveryPlaceNote { get; set; } = string.Empty;
        public string PickupPlaceNote { get; set; } = string.Empty;
        public bool IsOngoingInvoicing { get; set; }
        public string OngoingInvoicingInterval { get; set; } = string.Empty;

        public virtual Office? Office { get; set; }
        public virtual User? CreatedByUser { get; set; }
        public virtual User? ModifiedByUser { get; set; }
        public virtual Customer? Customer { get; set; }
        
        public virtual ICollection<ReservationItem> ReservationItems { get; set; } = new List<ReservationItem>();
        public virtual ICollection<ReservationCalc> ReservationCalcs { get; set; } = new List<ReservationCalc>();

        [NotMapped]
        public string CreatedByUserName { get; set; } = string.Empty;
        [NotMapped]
        public string ModifiedByUserName { get; set; } = string.Empty;

    }
}