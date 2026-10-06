using System;

namespace Branches.HYRFLEX
{
    public sealed record HyrflexAccessCustomer(
        int Id,
        string CustomerNr,
        string CustomerName,
        string OrganizationNr,
        string ContactPerson,
        string PostalAddress,
        string PostalCode,
        string DeliveryAddress,
        string DeliveryPostalAddress,
        string DeliveryPostalCode,
        string Telephone1,
        string Telephone2,
        string Fax,
        string Email,
        int? InvoiceDays,
        int? Discount,
        bool InvoiceFee,
        string Note,
        string ExternalKey,
        bool Active,
        DateTime? Created,
        bool Bankrupt,
        int? CustomerType,
        bool BlockReservations,
        bool ViewPriceCalcOnContract
    );

    public sealed class HyrflexAccessItem
    {
        public int Id { get; set; }
        public string ItemNr { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public int? AccountNr { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsStorageItem { get; set; } = false;
        public string Manufacturer { get; set; } = string.Empty;
        public string MachineNr { get; set; } = string.Empty;
        public string CostCenterNr { get; set; } = string.Empty;
        public decimal? BasePrice { get; set; }
        public int? NrOfItemsTotal { get; set; }
        public int? PlatformHeightMm { get; set; }
        public int? PlatformLengthMm { get; set; }
        public string PopupText { get; set; } = string.Empty;
        public decimal? PricePerDay { get; set; }
        public decimal? ReplacementCost { get; set; }
        public bool UnavailableForReservation { get; set; } = false;
        public string UnavailableReason { get; set; } = string.Empty;
        public decimal? WeightKg { get; set; }
    }

    public sealed class HyrflexInvoiceRow
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
}
