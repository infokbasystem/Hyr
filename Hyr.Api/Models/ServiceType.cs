namespace Hyr.Api.Models
{
    public class ServiceType
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public string ServiceCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;

        public virtual Office? Office { get; set; }
    }
}