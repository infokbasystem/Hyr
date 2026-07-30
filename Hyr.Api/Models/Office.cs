
namespace Hyr.Api.Models
{
    public class Office
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Street { get; set; } = string.Empty;
        public string ZipCode { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public decimal? InvoiceFee { get; set; }
        public string GeneralContractText { get; set; } = string.Empty;
        public string DeductibleReductionText { get; set; } = string.Empty;
        public decimal? LatePaymentInterest { get; set; }
        public string Telephone { get; set; } = string.Empty;
        public string MobilePhone { get; set; } = string.Empty;
        public string EmergencyNumber { get; set; } = string.Empty;
        public string FaxNr { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Web { get; set; } = string.Empty;
        public string OrganizationNr { get; set; } = string.Empty;
        public string VatNr { get; set; } = string.Empty;
        public string Bank { get; set; } = string.Empty;
        public string SwiftBic { get; set; } = string.Empty;
        public string BankAccountNr { get; set; } = string.Empty;
        public string BgNr { get; set; } = string.Empty;
        public string PgNr { get; set; } = string.Empty;
        public int? DefaultPaymentDays { get; set; }
        public bool ViewContractPricesOnPrint { get; set; }
        public string VatRegCity { get; set; } = string.Empty;
        public string VatRegText { get; set; } = string.Empty;
        public string Iban { get; set; } = string.Empty;
        public string CrediflowId { get; set; } = string.Empty;
        public string GlnNr { get; set; } = string.Empty;
        public string FortnoxAccessToken { get; set; } = string.Empty;
        public string FortnoxRefreshToken { get; set; } = string.Empty;
        public DateTime? FortnoxTokenCreated { get; set; }
        public int? FortnoxTokenExpiresInSeconds { get; set; }
        public string DefaultBookedFromTime { get; set; } = string.Empty;
        public string DefaultBookedToTime { get; set; } = string.Empty;

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
        public virtual ICollection<ServiceType> ServiceTypes { get; set; } = new List<ServiceType>();
        public virtual ICollection<InsuranceCompany> InsuranceCompanies { get; set; } = new List<InsuranceCompany>();
        public virtual ICollection<Department> Departments { get; set; } = new List<Department>();
        public virtual ICollection<MailText> MailTexts { get; set; } = new List<MailText>();
        public virtual ICollection<SmsText> SmsTexts { get; set; } = new List<SmsText>();
        public virtual ICollection<OfficeItemType> OfficeItemTypes { get; set; } = new List<OfficeItemType>();
    }
}