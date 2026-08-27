namespace Hyr.Api.Dtos
{
    public class AccountOptionDto
    {
        public int Id { get; set; }
        public int? AccountNr { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class VatRateOptionDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal? Rate { get; set; }
    }

    public class ArticleFormOptionsDto
    {
        public List<AccountOptionDto> Accounts { get; set; } = [];
        public List<VatRateOptionDto> VatRates { get; set; } = [];
    }
}