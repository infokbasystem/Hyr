namespace Backend.Models
{
    public class IntegrationSchedule
    {
        public int Id { get; set; }
        public int OfficeId { get; set; }
        public string Integration { get; set; } = string.Empty;
        public string Variable { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;

        public virtual Office? Office { get; set; }
    }
}
