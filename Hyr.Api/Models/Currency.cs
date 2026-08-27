namespace Hyr.Api.Models
{
    public class Currency
    {
        public int Id { get; set; }
        public int OfficeId { get; set; }
        public string CurrencyName { get; set; } = string.Empty;
        public double? PurchaseCurrencyRate { get; set; }
        public double? SalesCurrencyRate { get; set; }
        public string KeyFortnox { get; set; } = string.Empty;
        public bool IsDefault { get; set; }

        public virtual Office? Office { get; set; }
    }
}