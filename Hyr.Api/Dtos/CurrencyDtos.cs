namespace Hyr.Api.Dtos;

public class CurrencyDto
{
    public int Id { get; set; }
    public int OfficeId { get; set; }
    public string CurrencyName { get; set; } = string.Empty;
    public double? PurchaseCurrencyRate { get; set; }
    public double? SalesCurrencyRate { get; set; }
    public string KeyFortnox { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}

public class CurrencyUpsertDto
{
    public int Id { get; set; }
    public string CurrencyName { get; set; } = string.Empty;
    public double? PurchaseCurrencyRate { get; set; }
    public double? SalesCurrencyRate { get; set; }
    public string KeyFortnox { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}