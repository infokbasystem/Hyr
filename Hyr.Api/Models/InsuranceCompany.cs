namespace Hyr.Api.Models
{
    public class InsuranceCompany
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string OrganizationNr { get; set; } = string.Empty;
        public string ContactPerson { get; set; } = string.Empty;
        public string Telephone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Street { get; set; } = string.Empty;
        public string ZipCode { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public int? PaymentDays { get; set; }
        public string KeyFortnox { get; set; } = string.Empty;

        public virtual Office? Office { get; set; }
    }
}
