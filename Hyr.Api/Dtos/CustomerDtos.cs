namespace Hyr.Api.Dtos;

public class CustomerDto
{
    public int Id { get; set; }
    public int? OfficeId { get; set; }
    public int? CustomerNr { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string OrgNr { get; set; } = string.Empty;
    public string VatNr { get; set; } = string.Empty;
    public string Street1 { get; set; } = string.Empty;
    public string Street2 { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Telephone { get; set; } = string.Empty;
    public string MobilePhone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int? NrOfInvoiceDays { get; set; }
    public string Note { get; set; } = string.Empty;
    public decimal? CreditLimit { get; set; }
    public int? ImportId { get; set; }
    public string ImportSource { get; set; } = string.Empty;
    public string KeySpcs { get; set; } = string.Empty;
    public string KeyFortnox { get; set; } = string.Empty;
    public string KeyWinassist { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string RegNr { get; set; } = string.Empty;
    public bool IsCompany { get; set; }
    public bool VatRegisterd { get; set; }
    public string PgNr { get; set; } = string.Empty;
    public string BgNr { get; set; } = string.Empty;
    public string EfakturaAddresseeIntermediator { get; set; } = string.Empty;
    public string EfakturaAddresseeID { get; set; } = string.Empty;
    public string EfakturaAddresseeIDType { get; set; } = string.Empty;
    public string EfakturaBankCode { get; set; } = string.Empty;
    public string EfakturaBankId { get; set; } = string.Empty;
    public string EfakturaBankName { get; set; } = string.Empty;
    public string EfakturaVatHomeTown { get; set; } = string.Empty;
    public string EfakturaVatRegistration { get; set; } = string.Empty;
    public int? CrediflowPartyId { get; set; }
    public int? GLNnr { get; set; }
    public int? DefaultPriceListId { get; set; }

    // Audit / tracking fields
    public DateTime? CreatedAt { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedByName { get; set; }
}

public class CustomerUpsertDto
{
    public int? CustomerNr { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string OrgNr { get; set; } = string.Empty;
    public string VatNr { get; set; } = string.Empty;
    public string Street1 { get; set; } = string.Empty;
    public string Street2 { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Telephone { get; set; } = string.Empty;
    public string MobilePhone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int? NrOfInvoiceDays { get; set; }
    public string Note { get; set; } = string.Empty;
    public decimal? CreditLimit { get; set; }
    public int? ImportId { get; set; }
    public string ImportSource { get; set; } = string.Empty;
    public string KeySpcs { get; set; } = string.Empty;
    public string KeyFortnox { get; set; } = string.Empty;
    public string KeyWinassist { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string RegNr { get; set; } = string.Empty;
    public bool IsCompany { get; set; }
    public bool VatRegisterd { get; set; }
    public string PgNr { get; set; } = string.Empty;
    public string BgNr { get; set; } = string.Empty;
    public string EfakturaAddresseeIntermediator { get; set; } = string.Empty;
    public string EfakturaAddresseeID { get; set; } = string.Empty;
    public string EfakturaAddresseeIDType { get; set; } = string.Empty;
    public string EfakturaBankCode { get; set; } = string.Empty;
    public string EfakturaBankId { get; set; } = string.Empty;
    public string EfakturaBankName { get; set; } = string.Empty;
    public string EfakturaVatHomeTown { get; set; } = string.Empty;
    public string EfakturaVatRegistration { get; set; } = string.Empty;
    public int? CrediflowPartyId { get; set; }
    public int? GLNnr { get; set; }
    public int? DefaultPriceListId { get; set; }
}
