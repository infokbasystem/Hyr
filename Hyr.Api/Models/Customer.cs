using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Hyr.Api.Models
{
    public class Customer
    {

        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public int? CustomerNr { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string OrgNr { get; set; } = string.Empty;
        public string VatNr { get; set; } = string.Empty;
        public string Street1 { get; set; } = string.Empty;
        public string Street2 { get; set; } = string.Empty;
        public string ZipCode { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Telephone { get; set; } = string.Empty;
        public string MobilePhone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int? NrOfInvoiceDays { get; set; }
        public string Note { get; set; } = string.Empty;
        public decimal? CreditLimit { get; set; }
        public int? ImportId { get; set; }
        public string ImportSource { get; set; } = string.Empty;
        public string KeySpcs { get; set; } = string.Empty;
        public string KeyFortnox { get; set; } = string.Empty;
        public string KeyWinassist { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public string RegNr { get; set; } = string.Empty;
        public bool IsCompany { get; set; }
        public bool VatRegisterd { get; set; }
        public string PgNr { get; set; } = string.Empty;
        public string BgNr { get; set; } = string.Empty;
        public string EfakturaAddresseeIntermediator { get; set; } = string.Empty;
        public string EfakturaAddresseeID { get; set; } = string.Empty;
        public string EfakturaAddresseeIDType { get; set; } = string.Empty;
        public string EfakturaBankCode { get; set; } = string.Empty;
        public string EfakturaBankId { get; set; } = string.Empty;
        public string EfakturaBankName { get; set; } = string.Empty;
        public string EfakturaVatHomeTown { get; set; } = string.Empty;
        public string EfakturaVatRegistration { get; set; } = string.Empty;
        public int? CrediflowPartyId { get; set; }
        public int? GLNnr { get; set; }

        public virtual Office? Office { get; set; }
        public virtual ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
        public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();



        // [NotMapped]
        // public int lngCustomer_ID { get; set; }
        // [NotMapped]
        // public string? strCustomerNr { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strCustomer { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strOrganizationNr { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strContactPerson { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strPostalAddress { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strPostalCode { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strAddress { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strExternalKey { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strEmail { get; set; } = string.Empty;
        // [NotMapped]
        // public string? strTelephone1 { get; set; } = string.Empty;
        // [NotMapped]
        // public bool bolActive { get; set; }

    }
}