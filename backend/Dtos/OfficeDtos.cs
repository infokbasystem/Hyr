namespace Backend.Dtos;

public class OfficeTinkSettingsDto
{
    public bool TinkEnabled { get; set; }
    public string TinkClientId { get; set; } = string.Empty;
    public bool HasClientSecret { get; set; }
    public string TinkMarket { get; set; } = string.Empty;
    public string TinkLocale { get; set; } = string.Empty;
    public string TinkRecipientName { get; set; } = string.Empty;
    public string TinkRecipientAccountNumber { get; set; } = string.Empty;
    public string TinkRecipientAccountType { get; set; } = string.Empty;
    public string TinkPaymentScheme { get; set; } = string.Empty;
}

public class OfficeTinkSettingsUpdateDto
{
    public bool TinkEnabled { get; set; }
    public string? TinkClientId { get; set; }
    public string? TinkClientSecret { get; set; }
    public bool ClearClientSecret { get; set; }
    public string? TinkMarket { get; set; }
    public string? TinkLocale { get; set; }
    public string? TinkRecipientName { get; set; }
    public string? TinkRecipientAccountNumber { get; set; }
    public string? TinkRecipientAccountType { get; set; }
    public string? TinkPaymentScheme { get; set; }
}

public class OfficeCompanyInfoDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Street { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public decimal? InvoiceFee { get; set; }
    public string GeneralContractText { get; set; } = string.Empty;
    public string DeductibleReductionText { get; set; } = string.Empty;
    public decimal? DeductibleReductionCostPerDay { get; set; }
    public decimal? LatePaymentInterest { get; set; }
    public string Telephone { get; set; } = string.Empty;
    public string MobilePhone { get; set; } = string.Empty;
    public string EmergencyNumber { get; set; } = string.Empty;
    public string FaxNr { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Web { get; set; } = string.Empty;
    public string OrganizationNr { get; set; } = string.Empty;
    public string VatNr { get; set; } = string.Empty;
    public string Bank { get; set; } = string.Empty;
    public string SwiftBic { get; set; } = string.Empty;
    public string BankAccountNr { get; set; } = string.Empty;
    public string BgNr { get; set; } = string.Empty;
    public string PgNr { get; set; } = string.Empty;
    public int? DefaultPaymentDays { get; set; }
    public bool ViewContractPricesOnPrint { get; set; }
    public string VatRegCity { get; set; } = string.Empty;
    public string VatRegText { get; set; } = string.Empty;
    public string Iban { get; set; } = string.Empty;
    public string CrediflowId { get; set; } = string.Empty;
    public string GlnNr { get; set; } = string.Empty;
    public string? LogoDataUrl { get; set; }
}

public class OfficeCompanyInfoUpdateDto
{
    public string Name { get; set; } = string.Empty;
    public string Street { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public decimal? InvoiceFee { get; set; }
    public string GeneralContractText { get; set; } = string.Empty;
    public string DeductibleReductionText { get; set; } = string.Empty;
    public decimal? DeductibleReductionCostPerDay { get; set; }
    public decimal? LatePaymentInterest { get; set; }
    public string Telephone { get; set; } = string.Empty;
    public string MobilePhone { get; set; } = string.Empty;
    public string EmergencyNumber { get; set; } = string.Empty;
    public string FaxNr { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Web { get; set; } = string.Empty;
    public string OrganizationNr { get; set; } = string.Empty;
    public string VatNr { get; set; } = string.Empty;
    public string Bank { get; set; } = string.Empty;
    public string SwiftBic { get; set; } = string.Empty;
    public string BankAccountNr { get; set; } = string.Empty;
    public string BgNr { get; set; } = string.Empty;
    public string PgNr { get; set; } = string.Empty;
    public int? DefaultPaymentDays { get; set; }
    public bool ViewContractPricesOnPrint { get; set; }
    public string VatRegCity { get; set; } = string.Empty;
    public string VatRegText { get; set; } = string.Empty;
    public string Iban { get; set; } = string.Empty;
    public string CrediflowId { get; set; } = string.Empty;
    public string GlnNr { get; set; } = string.Empty;
}

public class OfficeItemTypeSettingDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsSelected { get; set; }
}

public class OfficeItemTypeSettingsDto
{
    public List<OfficeItemTypeSettingDto> ItemTypes { get; set; } = [];
    public string DefaultBookedFromTime { get; set; } = string.Empty;
    public string DefaultBookedToTime { get; set; } = string.Empty;
}

public class OfficeItemTypeSettingsUpdateDto
{
    public List<int> ItemTypeIds { get; set; } = [];
    public string DefaultBookedFromTime { get; set; } = string.Empty;
    public string DefaultBookedToTime { get; set; } = string.Empty;
}