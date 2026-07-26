namespace Hyr.Api.Models
{
    public class Department
    {
        public int Id { get; set; }
        public int OfficeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }

        public virtual Office? Office { get; set; }
    }
}