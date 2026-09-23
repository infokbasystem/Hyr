public class InvoiceRow
{
    public int lngInvoiceRow_ID { get; set; }
    public int? lngInvoice_ID { get; set; }
    public int? lngPriceRow_ID { get; set; }
    public int? lngSortOrder { get; set; }
    public int? lngInvoiceRow { get; set; }
    public int? lngItem_ID { get; set; }
    public int? lngItemType_ID { get; set; }
    public string strPriceKey { get; set; } = string.Empty;
    public string strArticleNr { get; set; } = string.Empty;
    public string strText0 { get; set; } = string.Empty;
    public string strText { get; set; } = string.Empty;
    public string strText2 { get; set; } = string.Empty;
    public double? dblNrOf { get; set; }
    public double? dblRentDays { get; set; }
    public double? dblBasePrice { get; set; }
    public double? dblUnitPrice { get; set; }
    public double? dblSum { get; set; }
    public bool bolVATGround { get; set; }
    public string strAccountNr { get; set; } = string.Empty;
    public string strCostCenter { get; set; } = string.Empty;
    public bool bolCompareWithPriceRow { get; set; }
    public bool bolCalculate { get; set; }
}