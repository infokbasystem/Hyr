
namespace Hyr.Api.Models
{
    public class Office
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string FortnoxAccessToken { get; set; } = string.Empty;
        public string FortnoxRefreshToken { get; set; } = string.Empty;
        public DateTime? FortnoxTokenCreated { get; set; }
        public int? FortnoxTokenExpiresInSeconds { get; set; }

        public virtual ICollection<User> Users { get; set; } = new List<User>();
        public virtual ICollection<Customer> Customers { get; set; } = new List<Customer>();
        public virtual ICollection<Item> Items { get; set; } = new List<Item>();
        public virtual ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
        public virtual ICollection<ReservationItem> ReservationItems { get; set; } = new List<ReservationItem>();
        public virtual ICollection<ReservationCalc> ReservationCalcs { get; set; } = new List<ReservationCalc>();
        public virtual ICollection<ReservationCalcItem> ReservationCalcItems { get; set; } = new List<ReservationCalcItem>();
        public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
        public virtual ICollection<InvoiceRow> InvoiceRows { get; set; } = new List<InvoiceRow>();
        public virtual ICollection<Account> Accounts { get; set; } = new List<Account>();
        public virtual ICollection<Article> Articles { get; set; } = new List<Article>();
        public virtual ICollection<VatRate> VatRates { get; set; } = new List<VatRate>();
        public virtual ICollection<ItemCategory> ItemCategories { get; set; } = new List<ItemCategory>();
        public virtual ICollection<ItemModel> ItemModels { get; set; } = new List<ItemModel>();
    }
}