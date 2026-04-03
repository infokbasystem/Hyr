using System.ComponentModel.DataAnnotations;

namespace Hyr.Api.Models
{
    public class User
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;
        [Required]
        [StringLength(200)]
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLogin { get; set; } = null;

        public virtual Office? Office { get; set; }
        public virtual ICollection<Invoice> CreatedInvoices { get; set; } = new List<Invoice>();
        public virtual ICollection<Invoice> ModifiedInvoices { get; set; } = new List<Invoice>();
        public virtual ICollection<Reservation> CreatedReservations { get; set; } = new List<Reservation>();
        public virtual ICollection<Reservation> ModifiedReservations { get; set; } = new List<Reservation>();
    }
}