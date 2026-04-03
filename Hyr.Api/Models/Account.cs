namespace Hyr.Api.Models
{
    public class Account
    {
        public int Id { get; set; }
        public int? OfficeId { get; set; }
        public int? AccountNr { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }

        public virtual Office? Office { get; set; } 

        public virtual ICollection<Article> Articles { get; set; } = new List<Article>();
    }
}