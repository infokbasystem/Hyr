using System.Globalization;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Backend.Data;
using Backend.Models;

namespace Backend.Services;

public interface IReservationPdfService
{
    Task<GeneratedPdf?> GenerateReservationPdfAsync(int officeId, int reservationId, CancellationToken cancellationToken);
}

// ---------- Data model ----------

public record ReservationPdfModel
{
    // Rental company (issuer)
    public byte[]? LogoBytes { get; init; }
    public required string CompanyName { get; init; }
    public required string CompanyAddress { get; init; }
    public required string CompanyCountry { get; init; }
    public required string CompanyEmergencyNumber { get; init; }
    public required string CompanyPhone { get; init; }
    public required string CompanyEmail { get; init; }
    public required string CompanyWeb { get; init; }
    public required string Bankgiro { get; init; }
    public required string OrgNr { get; init; }
    public required string VatNr { get; init; }
    public required string Iban { get; init; }
    public required string SwiftBic { get; init; }
    public required string JournalNr { get; init; }

    // Contract header
    public required string ContractNumber { get; init; }
    public required string PrintDate { get; init; }

    // Customer (Hyresman)
    public required string CustomerName { get; init; }
    public required string CustomerAddress { get; init; }
    public required string CustomerPostalCity { get; init; }
    public required string CustomerTelephone { get; init; }
    public required string CustomerMobile { get; init; }
    public required string CustomerEmail { get; init; }
    public required string CustomerReference { get; init; }

    // Vehicle
    public required string VehicleDescription { get; init; }
    public required string RegNr { get; init; }
    public required string ModelYear { get; init; }
    public required string Category { get; init; }
    public required string OdometerOut { get; init; }
    public required string OdometerIn { get; init; }
    public required string DrivenKm { get; init; }

    // Driver / reference
    public required string DriverName { get; init; }
    public required string DriverPhone { get; init; }
    public required string DriverLicenceNr { get; init; }
    public required string ReferencePerson { get; init; }

    // Booking period
    public required string BookedFrom { get; init; }
    public required string BookedTo { get; init; }
    public required string BookedFromDate { get; init; }
    public required string BookedFromTime { get; init; }
    public required string BookedToDate { get; init; }
    public required string BookedToTime { get; init; }
    public required string PickupLocation { get; init; }
    public required string DropoffLocation { get; init; }
    public required string PickupPlace { get; init; }
    public required string DropoffPlace { get; init; }
    public required string AbroadAllowed { get; init; }

    // Other info
    public required string OtherInfo { get; init; }
    public required string FuelType { get; init; }

    // Insurance / damage
    public required string InsuranceCompany { get; init; }
    public required string InsuranceCompanyPhone { get; init; }
    public required string InsurancePriceList { get; init; }
    public required string RentalApprovedUntil { get; init; }
    public required string CustomerVatLiable { get; init; }
    public required string PermitIssuer { get; init; }
    public required string DamageNumber { get; init; }
    public required string DamageDate { get; init; }
    public required string OtherPartyRegNr { get; init; }
    public required string OtherPartyPhone { get; init; }
    public required string InsuranceCustomerRegNr { get; init; }
    public required string SelfRiskReduction { get; init; }
    public required decimal SelfRiskAmount { get; init; }
    public required decimal? DeductibleReductionCostPerDay { get; init; }

    // Charges
    public required IReadOnlyList<ChargeLine> Charges { get; init; }
    public required decimal TotalDue { get; init; }
    public required IReadOnlyList<string> FreeKmTerms { get; init; }

    // Payment / deposit
    public required string PriceListNote { get; init; }
    public required string PriceListName { get; init; }
    public required bool HasPriceCalculation { get; init; }
    public required decimal DepositPaid { get; init; }
    public required string DepositRatePerDay { get; init; }

    public required string Currency { get; init; }
    public required string TermsText { get; init; }
    public required string NoteExternal { get; init; }
    public required string RulesText { get; init; }
    public required string ApprovalText { get; init; }
    public required string ReceiptText { get; init; }
    public required string SignerName { get; init; }
}

public record ChargeLine(
    string Description,
    decimal Qty,
    decimal UnitPrice,
    decimal AmountCustomer,
    decimal? AmountInsurer = null,
    decimal? AmountInternal = null);

// ---------- Service ----------

public sealed class ReservationPdfService(ApplicationDbContext dbContext) : IReservationPdfService
{
    public async Task<GeneratedPdf?> GenerateReservationPdfAsync(int officeId, int reservationId, CancellationToken cancellationToken)
    {
        var reservation = await dbContext.Reservations
            .AsNoTracking()
            .Include(r => r.Office)
            .Include(r => r.Customer)
            .Include(r => r.CreatedByUser)
            .Include(r => r.ReservationItems)
                .ThenInclude(ri => ri.Item)
                    .ThenInclude(i => i!.ItemModel)
            .Include(r => r.ReservationItems)
                .ThenInclude(ri => ri.Item)
                    .ThenInclude(i => i!.ItemCategory)
            .FirstOrDefaultAsync(r => r.Id == reservationId && r.OfficeId == officeId, cancellationToken);

        if (reservation?.Office is null)
            return null;

        var vehicleItem = reservation.ReservationItems.FirstOrDefault(ri => ri.ItemTypeCode == "VEHICLE");
        InsuranceCompany? insuranceCompany = null;
        if (vehicleItem?.InsuranceCompanyId is int insuranceCompanyId)
        {
            insuranceCompany = await dbContext.InsuranceCompanies
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == insuranceCompanyId, cancellationToken);
        }

        var allCalcs = await dbContext.ReservationCalcs
            .AsNoTracking()
            .Include(rc => rc.ReservationCalcItems)
            .Where(rc => rc.ReservationId == reservation.Id)
            .ToListAsync(cancellationToken);

        var latestCalcsByReceiver = allCalcs
            .GroupBy(rc => rc.ReceiverTypeCode)
            .Select(g => g.OrderByDescending(rc => rc.Id).First())
            .ToList();

        var customerCalc = latestCalcsByReceiver.FirstOrDefault(rc => rc.ReceiverTypeCode == ReceiverTypeCodes.Customer);

        PriceList? priceList = null;
        var priceListId = customerCalc?.ReservationCalcItems.Select(item => item.PriceListId).FirstOrDefault(id => id.HasValue);
        if (priceListId is int resolvedPriceListId)
        {
            priceList = await dbContext.PriceLists
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == resolvedPriceListId, cancellationToken);
        }

        var model = CreateModel(reservation, insuranceCompany, customerCalc, priceList, latestCalcsByReceiver);
        var document = new ReservationDocument(model);
        var content = document.GeneratePdf();

        var number = reservation.ReservationNr?.ToString(CultureInfo.InvariantCulture) ?? reservation.Id.ToString(CultureInfo.InvariantCulture);
        return new GeneratedPdf(content, $"reservation_{number}.pdf");
    }

    private ReservationPdfModel CreateModel(Reservation reservation, InsuranceCompany? insuranceCompany, ReservationCalc? lastCalc, PriceList? priceList, IReadOnlyList<ReservationCalc> latestCalcsByReceiver)
    {
        var office = reservation.Office!;
        var customer = reservation.Customer;
        var vehicle = reservation.ReservationItems.FirstOrDefault(ri => ri.ItemTypeCode == "VEHICLE");
        var hasInsuranceItem = reservation.ReservationItems.Any(ri => ri.IsInsurance);

        var customerAddress = FirstNonEmpty(reservation.Address, customer?.Street1, customer?.Street2);
        var customerZipCode = FirstNonEmpty(reservation.ZipCode, customer?.ZipCode);
        var customerCity = FirstNonEmpty(customer?.City);
        var customerPostalCity = $"{customerZipCode} {customerCity}".Trim();
        var customerTelephone = FirstNonEmpty(reservation.TelephoneWorkplace, customer?.Telephone);
        var customerMobile = FirstNonEmpty(reservation.MobilePhone, customer?.MobilePhone);
        var customerEmail = FirstNonEmpty(reservation.Email, customer?.Email);

        // Build charges by merging the latest calculation per receiver type, grouped by row text
        var chargeRows = new List<(string Text, decimal? Qty, decimal? UnitPrice, decimal? Customer, decimal? Insurer, decimal? Internal)>();
        var chargeRowIndexByText = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var calc in latestCalcsByReceiver.OrderBy(rc => rc.ReceiverTypeCode == ReceiverTypeCodes.Customer ? 0 : rc.ReceiverTypeCode == ReceiverTypeCodes.InsuranceCompany ? 1 : 2))
        {
            foreach (var item in calc.ReservationCalcItems)
            {
                var text = item.Text ?? "";
                if (!chargeRowIndexByText.TryGetValue(text, out var index))
                {
                    index = chargeRows.Count;
                    chargeRowIndexByText[text] = index;
                    chargeRows.Add((text, null, null, null, null, null));
                }

                var row = chargeRows[index];
                row.Qty ??= item.Qty;
                row.UnitPrice ??= item.UnitPrice;

                if (calc.ReceiverTypeCode == ReceiverTypeCodes.Customer)
                    row.Customer = (row.Customer ?? 0) + (item.Sum ?? 0);
                else if (calc.ReceiverTypeCode == ReceiverTypeCodes.InsuranceCompany)
                    row.Insurer = (row.Insurer ?? 0) + (item.Sum ?? 0);
                else if (calc.ReceiverTypeCode == ReceiverTypeCodes.Internal)
                    row.Internal = (row.Internal ?? 0) + (item.Sum ?? 0);

                chargeRows[index] = row;
            }
        }

        var charges = chargeRows
            .Select(row => new ChargeLine(row.Text, row.Qty ?? 0, row.UnitPrice ?? 0, row.Customer ?? 0, row.Insurer, row.Internal))
            .ToList();

        var totalDue = charges.Sum(line => line.AmountCustomer);

        // Build free km terms (dummy data)
        var freeKmTerms = new List<string>
        {
            "Dygn fria km: 560,00/dag",
            "Vecka fria km: 2 882,00/vecka, 560,00/merdag",
            "Månad inkl 2500 km: 6 435,00/mån, 257,40/merdag, inkl. 83 km/merdag, 1,00/merkm",
        };

        return new ReservationPdfModel
        {
            // Company info (from office)
            LogoBytes = office.LogoData is { Length: > 0 } ? office.LogoData : null,
            CompanyName = office.Name ?? "Hyr",
            CompanyAddress = $"{office.Street}, {office.ZipCode} {office.City}".Trim(),
            CompanyCountry = office.Country ?? "",
            CompanyEmergencyNumber = office.EmergencyNumber ?? "",
            CompanyPhone = office.Telephone ?? "Tel",
            CompanyEmail = office.Email ?? "Email",
            CompanyWeb = office.Web ?? "",
            Bankgiro = office.BgNr ?? "",
            OrgNr = office.OrganizationNr ?? "000000-0000",
            VatNr = office.VatNr ?? "",
            Iban = office.Iban ?? "",
            SwiftBic = "XXXXSESS",
            JournalNr = "000-0000000",

            // Contract
            ContractNumber = reservation.ReservationNr?.ToString(CultureInfo.InvariantCulture) ?? reservation.Id.ToString(CultureInfo.InvariantCulture),
            PrintDate = DateTime.Now.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),

            // Customer
            CustomerName = reservation.CustomerName ?? "Ej angivet",
            CustomerAddress = customerAddress,
            CustomerPostalCity = customerPostalCity,
            CustomerTelephone = customerTelephone,
            CustomerMobile = customerMobile,
            CustomerEmail = customerEmail,
            CustomerReference = reservation.CustomerMarking ?? "",

            // Vehicle (from first vehicle item or dummy)
            VehicleDescription = FirstNonEmpty($"{vehicle?.Item?.Manufacturer} {vehicle?.Item?.ItemModel?.Name}".Trim(), vehicle?.Item?.ItemModel?.Name),
            RegNr = FirstNonEmpty(vehicle?.RegNr, vehicle?.Item?.RegNr),
            ModelYear = FirstNonEmpty(vehicle?.YearModel, vehicle?.Item?.YearModel),
            Category = FirstNonEmpty(vehicle?.Item?.ItemCategory?.Name),
            OdometerOut = vehicle?.KmOut?.ToString() ?? "0",
            OdometerIn = vehicle?.KmIn?.ToString() ?? "0",
            DrivenKm = ((vehicle?.KmIn ?? 0) - (vehicle?.KmOut ?? 0)).ToString(),

            // Driver / reference
            DriverName = FirstNonEmpty(reservation.DriverName),
            DriverPhone = FirstNonEmpty(reservation.DriverMobilePhone),
            DriverLicenceNr = FirstNonEmpty(reservation.DriverLicenceNr),
            ReferencePerson = FirstNonEmpty(reservation.Reference, reservation.CustomerMarking),

            // Booking
            BookedFrom = FormatDateTime(vehicle?.BookedFrom),
            BookedTo = FormatDateTime(vehicle?.BookedTo),
            BookedFromDate = FormatDate(vehicle?.BookedFrom),
            BookedFromTime = FormatTime(vehicle?.BookedFrom),
            BookedToDate = FormatDate(vehicle?.BookedTo),
            BookedToTime = FormatTime(vehicle?.BookedTo),
            PickupLocation = "Hämtas i " + (reservation.DeliveryPlace ?? office.City ?? "Luleå"),
            DropoffLocation = "Lämnas i " + (reservation.DeliveryPlace ?? office.City ?? "Luleå"),
            PickupPlace = FirstNonEmpty(vehicle?.PickupPlaceNote),
            DropoffPlace = FirstNonEmpty(vehicle?.DeliveryPlaceNote, reservation.DeliveryPlace),
            AbroadAllowed = vehicle?.AbroadOk == true ? "TILLÅTET" : "EJ TILLÅTET",

            // Other
            OtherInfo = FirstNonEmpty(vehicle?.Item?.Equipment),
            FuelType = FirstNonEmpty(vehicle?.Item?.Fuel),

            // Insurance / damage
            InsuranceCompany = hasInsuranceItem ? FirstNonEmpty(insuranceCompany?.Name) : "",
            InsuranceCompanyPhone = hasInsuranceItem ? FirstNonEmpty(insuranceCompany?.Telephone) : "",
            InsurancePriceList = "",
            RentalApprovedUntil = "",
            CustomerVatLiable = "",
            PermitIssuer = "",
            DamageNumber = hasInsuranceItem ? FirstNonEmpty(vehicle?.InsuranceDamageNr) : "",
            DamageDate = hasInsuranceItem ? FormatDate(vehicle?.InsuranceDamageDate) : "",
            OtherPartyRegNr = hasInsuranceItem ? FirstNonEmpty(vehicle?.InsuranceCounterpartRegNr) : "",
            OtherPartyPhone = "",
            InsuranceCustomerRegNr = hasInsuranceItem ? FirstNonEmpty(vehicle?.InsuranceCustomerRegNr, vehicle?.RegNr, vehicle?.Item?.RegNr) : "",
            SelfRiskReduction = vehicle?.InsuranceIsSjalvriskReduction == true ? "Ja" : "Nej",
            SelfRiskAmount = 0m,
            DeductibleReductionCostPerDay = office.DeductibleReductionCostPerDay,

            // Charges
            Charges = charges.AsReadOnly(),
            TotalDue = totalDue,
            FreeKmTerms = freeKmTerms.AsReadOnly(),

            // Payment
            PriceListNote = priceList is not null ? $"Prislista: {priceList.Name} (ex moms)" : "",
            PriceListName = FirstNonEmpty(priceList?.Name),
            HasPriceCalculation = lastCalc is not null,
            DepositPaid = reservation.Deposition ?? 0.00m,
            DepositRatePerDay = "X kr/dag",

            Currency = "kr",

            TermsText = FirstNonEmpty(office.GeneralContractText),
            NoteExternal = FirstNonEmpty(reservation.NoteExternal),

            RulesText = "Rökning och djur är förbjuden i hyrbilen. Drivmedel tillkommer på samtliga fordon. " +
                        "Hyresman skall alltid ringa oss när denne är åter med bilen.",

            ApprovalText = "Undertecknad förklarar sig införstådd med och godkänner hyresvillkoren. Böter och avgifter " +
                          "som uppkommer under hyrestiden betalas av hyresmannen.",

            ReceiptText = "Fordonet besiktigat och mottaget. Ovanstående belopp kvitteras samt eventuell deposition återbetalad.",
            SignerName = FirstNonEmpty(reservation.CreatedByUser?.Name),
        };
    }

    private string FormatDateTime(DateTime? value) =>
        value?.ToString("yyyy-MM-dd HH:mm", CultureInfo.GetCultureInfo("sv-SE")) ?? "";

    private string FormatDate(DateTime? value) =>
        value?.ToString("yyyy-MM-dd", CultureInfo.GetCultureInfo("sv-SE")) ?? "";

    private string FormatTime(DateTime? value) =>
        value?.ToString("HH:mm", CultureInfo.GetCultureInfo("sv-SE")) ?? "";

    private static string FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? "";
}

// ---------- Document ----------

public class ReservationDocument : IDocument
{
    private readonly ReservationPdfModel _m;

    private static readonly string Dark = "#1F2937";
    private static readonly string Accent = "#B91C1C";
    private static readonly string Grey = "#6B7280";
    private static readonly string LightBg = "#F3F4F6";
    private static readonly string Line = "#D1D5DB";

    public ReservationDocument(ReservationPdfModel model) => _m = model;

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.MarginLeft(0, Unit.Millimetre);
            page.MarginRight(0, Unit.Millimetre);
            page.MarginTop(10, Unit.Millimetre);
            page.MarginBottom(0, Unit.Millimetre);
            page.DefaultTextStyle(x => x.FontFamily("Helvetica").FontSize(8.5f).FontColor(Dark));

            page.Content().PaddingHorizontal(14, Unit.Millimetre).Column(col =>
            {
                col.Item().Element(ComposeHeader);

                col.Spacing(20);

                col.Item().ExtendVertical().Border(0.6f).BorderColor(Line).PaddingVertical(8).Row(row =>
                {
                    // ---------- LEFT COLUMN ----------
                    row.RelativeItem(1f).Column(c =>
                    {
                        c.Item().Element(ComposeCustomer);
                        c.Item().Element(ComposeDriver);
                        c.Item().Element(ComposeTerms);
                        c.Item().Element(ComposeDeposition);
                        c.Item().Element(ComposeDeductibleReduction);
                        c.Item().Element(ComposeExternalNote);
                        c.Item().Element(ComposeInsurance);
                    });

                    row.ConstantItem(1).LineVertical(0.6f).LineColor(Line);

                    // ---------- RIGHT COLUMN ----------
                    row.RelativeItem(1f).Column(c =>
                    {
                        c.Item().Element(ComposeVehicle);
                        c.Item().Element(ComposeBooking);
                        c.Item().Element(ComposePriceList);
                        c.Item().Element(ComposeChargesTable);
                        c.Item().Element(ComposeClosing);
                    });


                });


                // col.Item().PaddingTop(3).LineHorizontal(1.2f).LineColor(Accent);
                // col.Item().PaddingTop(8).Element(ComposeCustomerVehicle);
                // col.Item().PaddingTop(8).Element(ComposeDriverBooking);
                // col.Item().PaddingTop(8).Element(ComposeInsurance);
                // col.Item().PaddingTop(8).Element(ComposeChargesTable);
                // col.Item().PaddingTop(6).Element(ComposeFreeKmTerms);
                // col.Item().PaddingTop(8).Element(ComposePaymentSummary);
                // col.Item().PaddingTop(8).Element(ComposeRules);
                // col.Item().PaddingTop(12).Element(ComposeSignatures);
            });

            page.Footer().PaddingTop(5, Unit.Millimetre).Element(ComposeFooter);
        });
    }

    private void ComposeFooter(IContainer container)
    {
        var addressLines = _m.CompanyAddress
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        container.PaddingHorizontal(50).PaddingTop(10).PaddingBottom(15).DefaultTextStyle(style => style.FontSize(9).LineHeight(1.4f)).Row(row =>
        {
            row.RelativeItem().Column(c =>
            {
                c.Item().Text(_m.CompanyName).Bold();
                foreach (var line in addressLines) c.Item().Text(line);
                if (!string.IsNullOrWhiteSpace(_m.CompanyCountry)) c.Item().Text(_m.CompanyCountry);
            });
            row.RelativeItem().Column(c =>
            {
                if (!string.IsNullOrWhiteSpace(_m.CompanyEmergencyNumber)) c.Item().Text($"Jour {_m.CompanyEmergencyNumber}").FontColor(Accent);
                if (!string.IsNullOrWhiteSpace(_m.CompanyPhone)) c.Item().Text($"Tel {_m.CompanyPhone}");
                if (!string.IsNullOrWhiteSpace(_m.CompanyEmail)) c.Item().Text($"Mail {_m.CompanyEmail}");
            });
            row.RelativeItem().Column(c =>
            {
                c.Item().Text("Betalningsinformation").Bold();
                if (!string.IsNullOrWhiteSpace(_m.Bankgiro)) c.Item().Text($"Bankgiro {_m.Bankgiro}");
                if (!string.IsNullOrWhiteSpace(_m.Iban)) c.Item().Text($"IBAN {_m.Iban}");
            });
            row.RelativeItem().Column(c =>
            {
                c.Item().Text("Godkänd för F-skatt");
                if (!string.IsNullOrWhiteSpace(_m.OrgNr)) c.Item().Text($"Org.nr {_m.OrgNr}");
                if (!string.IsNullOrWhiteSpace(_m.VatNr)) c.Item().Text($"VAT {_m.VatNr}");
            });
        });
    }

    private void ComposeHeader(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem(1.5f).Column(c =>
            {
                if (_m.LogoBytes is { Length: > 0 } logoBytes)
                {
                    c.Item().AlignLeft().Width(180).Height(50).Image(logoBytes).FitArea();
                    c.Item().PaddingTop(3).Width(180).AlignCenter().Text($"{_m.CompanyPhone}  \u00b7  {_m.CompanyAddress}")
                        .FontSize(8).FontColor(Grey);
                }

                // c.Item().PaddingTop(_m.LogoBytes is { Length: > 0 } ? 4 : 0).Text(_m.CompanyName).FontSize(16).Bold().FontColor(Dark);
                // c.Item().PaddingTop(2).Text(
                //     $"{_m.CompanyAddress}\n" +
                //     $"Tel: {_m.CompanyPhone}  ·  {_m.CompanyEmail}  ·  Org.nr {_m.OrgNr}\n" +
                //     $"Bankgiro {_m.Bankgiro}  ·  IBAN {_m.Iban}  ·  Swift/Bic {_m.SwiftBic}")
                //     .FontSize(6.5f).FontColor(Grey).LineHeight(1.3f);
            });

            row.RelativeItem(1f).Column(c =>
            {
                c.Item().PaddingTop(8).AlignRight().Text("HYRESKONTRAKT").FontSize(13).Bold().FontColor(Accent);
                c.Item().AlignRight().PaddingTop(2).Text(text =>
                {
                    text.AlignRight();
                    text.DefaultTextStyle(x => x.FontSize(6.5f).FontColor(Grey));
                    text.Span("Kontrakt #: ");
                    text.Span(_m.ContractNumber).Bold().FontColor(Dark);
                    text.Line("");
                    text.Span($"Utskriftsdatum: {_m.PrintDate}");
                    text.Line("");
                    text.Span($"Journr: {_m.JournalNr}");
                });
            });
        });
    }

    private void ComposeCustomer(IContainer container)
    {
        container.BorderBottom(0.6f).BorderColor(Line).PaddingHorizontal(12).PaddingBottom(8).Column(c =>
        {
            c.Item().Text("Hyresman").FontSize(6.5f).SemiBold();
            c.Item().PaddingTop(3).Text(_m.CustomerName).FontSize(8.5f);
            if (!string.IsNullOrWhiteSpace(_m.CustomerAddress))
                c.Item().PaddingTop(4).Text(_m.CustomerAddress).FontSize(8.5f);
            if (!string.IsNullOrWhiteSpace(_m.CustomerPostalCity))
                c.Item().PaddingTop(4).Text(_m.CustomerPostalCity).FontSize(8.5f);

            c.Item().PaddingTop(8).Row(r =>
            {
                r.RelativeItem().Text("Telefon").FontSize(6.5f).SemiBold();
                r.RelativeItem().Text("Mobil").FontSize(6.5f).SemiBold();
                r.RelativeItem().Text("Email").FontSize(6.5f).SemiBold();
            });
            c.Item().Row(r =>
            {
                r.RelativeItem().PaddingTop(3).Text(_m.CustomerTelephone).FontSize(8.5f);
                r.RelativeItem().PaddingTop(3).Text(_m.CustomerMobile).FontSize(8.5f);
                r.RelativeItem().PaddingTop(3).Text(_m.CustomerEmail).FontSize(8.5f);
            });

            c.Item().PaddingTop(8).Text("Referens").FontSize(6.5f);
            c.Item().PaddingTop(3).Text(_m.CustomerReference).FontSize(8.5f);
        });
    }

    private void ComposeDriver(IContainer container)
    {
        container.BorderBottom(0.6f).BorderColor(Line).PaddingHorizontal(12).PaddingBottom(8).Column(c =>
        {
            c.Item().PaddingTop(8).Row(r =>
            {
                r.RelativeItem().Text("Förare").FontSize(6.5f).SemiBold();
                r.RelativeItem().Text("Körkortsnummer").FontSize(6.5f).SemiBold();
            });
            c.Item().Row(r =>
            {
                r.RelativeItem().PaddingTop(3).Text(_m.DriverName).FontSize(8.5f);
                r.RelativeItem().PaddingTop(3).Text(_m.DriverLicenceNr).FontSize(8.5f);
            });

            c.Item().PaddingTop(8).Row(r =>
            {
                r.RelativeItem().Text("Telefon").FontSize(6.5f).SemiBold();
                r.RelativeItem().Text("Utland").FontSize(6.5f).SemiBold();
            });
            c.Item().Row(r =>
            {
                r.RelativeItem().PaddingTop(3).Text(_m.DriverPhone).FontSize(8.5f);
                r.RelativeItem().PaddingTop(3).Text(_m.AbroadAllowed).FontSize(8.5f);
            });
        });
    }

    private void ComposeTerms(IContainer container)
    {
        container.BorderBottom(0.6f).BorderColor(Line).PaddingHorizontal(12).PaddingTop(8).PaddingBottom(8).Height(95).Text(_m.TermsText)
            .FontSize(8.0f).SemiBold().LineHeight(1.3f);
    }

    private void ComposeDeductibleReduction(IContainer container)
    {
        var isSelected = _m.SelfRiskReduction == "Ja";

        container.BorderBottom(0.6f).BorderColor(Line).PaddingHorizontal(12).PaddingTop(8).PaddingBottom(8).Column(c =>
        {
            c.Item().Text("Självriskreducering").FontSize(6.5f).SemiBold();

            c.Item().PaddingTop(6).Row(r =>
            {
                r.AutoItem().Row(cb =>
                {
                    cb.AutoItem().Width(10).Height(10).Border(0.6f).BorderColor(Line)
                        .AlignCenter().AlignMiddle().Text(isSelected ? "X" : "").FontSize(7f).SemiBold();
                    cb.AutoItem().PaddingLeft(4).Text("Ja").FontSize(8.5f);
                });

                r.AutoItem().PaddingLeft(10).Row(cb =>
                {
                    cb.AutoItem().Width(10).Height(10).Border(0.6f).BorderColor(Line)
                        .AlignCenter().AlignMiddle().Text(!isSelected ? "X" : "").FontSize(7f).SemiBold();
                    cb.AutoItem().PaddingLeft(4).Text("Nej").FontSize(8.5f);
                });

                r.AutoItem().PaddingTop(1).PaddingLeft(20).Text("Belopp").FontSize(6.5f);
                r.AutoItem().PaddingLeft(5).PaddingTop(1).Text(_m.DeductibleReductionCostPerDay is { } cost ? $"{cost:N2}" : "").FontSize(8.5f);
                r.AutoItem().PaddingLeft(3).PaddingTop(1).Text("kr/dag").FontSize(6.5f);
                r.AutoItem().PaddingLeft(10).PaddingTop(1).Text("Sign.").FontSize(6.5f);
            });

        });
    }

    private void ComposeExternalNote(IContainer container)
    {

        container.BorderBottom(0.6f).BorderColor(Line).PaddingHorizontal(12).PaddingTop(8).PaddingBottom(8).Height(95).Column(c =>
        {
            c.Item().Text("Anteckning").FontSize(6.5f).SemiBold();
            c.Item().PaddingTop(3).Text(_m.NoteExternal).FontSize(8.5f).LineHeight(1.3f);
        });
    }

    private void ComposeVehicle(IContainer container)
    {
        container.BorderBottom(0.6f).BorderColor(Line).PaddingHorizontal(12).PaddingBottom(8).Column(c =>
        {
            c.Item().Row(r =>
            {
                r.RelativeItem(1.5f).Text("Hyresobjekt").FontSize(6.5f).SemiBold();
                r.RelativeItem().Text("Regnr").FontSize(6.5f).SemiBold();
                r.RelativeItem().Text("Årsmodell").FontSize(6.5f).SemiBold();
            });
            c.Item().Row(r =>
            {
                r.RelativeItem(1.5f).PaddingTop(3).Text(_m.VehicleDescription).FontSize(8.5f);
                r.RelativeItem().PaddingTop(3).Text(_m.RegNr).FontSize(8.5f);
                r.RelativeItem().PaddingTop(3).Text(_m.ModelYear).FontSize(8.5f);
            });

            c.Item().PaddingTop(8).Row(r =>
            {
                r.RelativeItem(1.5f).Text("Kategori").FontSize(6.5f).SemiBold();
                r.RelativeItem().Text("Drivmedel").FontSize(6.5f).SemiBold();
                r.RelativeItem().Text("").FontSize(6.5f).SemiBold();
            });
            c.Item().Row(r =>
            {
                r.RelativeItem(1.5f).PaddingTop(3).Text(_m.Category).FontSize(8.5f);
                r.RelativeItem().PaddingTop(3).Text(_m.FuelType).FontSize(8.5f);
                r.RelativeItem().PaddingTop(3).Text("").FontSize(8.5f);
            });

            c.Item().PaddingTop(8).Text("Övrig info").FontSize(6.5f).SemiBold();
            c.Item().PaddingTop(3).Text(_m.OtherInfo).FontSize(8.5f);
        });
    }

    private void ComposeBooking(IContainer container)
    {
        container.BorderBottom(0.6f).BorderColor(Line).PaddingHorizontal(12).PaddingTop(8).PaddingBottom(8).Column(c =>
        {
            c.Item().Row(r =>
            {
                r.RelativeItem(1f).Column(left =>
                {
                    left.Item().Row(rr =>
                    {
                        rr.RelativeItem(1.5f).Text("Bokad från/till").FontSize(6.5f).SemiBold();
                        rr.RelativeItem().Text("kl.").FontSize(6.5f).SemiBold();
                    });
                    left.Item().Row(rr =>
                    {
                        rr.RelativeItem(1.5f).PaddingTop(3).Text(_m.BookedFromDate).FontSize(8.5f);
                        rr.RelativeItem().PaddingTop(3).Text(_m.BookedFromTime).FontSize(8.5f);
                    });
                    left.Item().Row(rr =>
                    {
                        rr.RelativeItem(1.5f).PaddingTop(4).Text(_m.BookedToDate).FontSize(8.5f);
                        rr.RelativeItem().PaddingTop(4).Text(_m.BookedToTime).FontSize(8.5f);
                    });
                });

                r.RelativeItem(1f).Column(right =>
                {
                    right.Item().PaddingTop(8).Text("Lämnas i").FontSize(6.5f);
                    if (!string.IsNullOrWhiteSpace(_m.DropoffPlace))
                        right.Item().PaddingTop(3).Text(_m.DropoffPlace).FontSize(8.5f);

                    right.Item().PaddingTop(8).Text("Hämtas i").FontSize(6.5f);
                    if (!string.IsNullOrWhiteSpace(_m.PickupPlace))
                        right.Item().PaddingTop(3).Text(_m.PickupPlace).FontSize(8.5f);
                });
            });

            c.Item().PaddingTop(8).Row(r =>
            {
                r.RelativeItem().Text("Mätarställning ut/in").FontSize(6.5f).SemiBold();
                r.RelativeItem().Text("Körda km").FontSize(6.5f).SemiBold();
            });
            c.Item().Row(r =>
            {
                r.RelativeItem().PaddingTop(3).Text(_m.OdometerOut).FontSize(8.5f);
                r.RelativeItem().PaddingTop(3).Text(_m.DrivenKm).FontSize(8.5f);
            });
            c.Item().Row(r =>
            {
                r.RelativeItem().PaddingTop(4).Text(_m.OdometerIn).FontSize(8.5f);
                r.RelativeItem().Text("");
            });
        });
    }

    private void ComposePriceList(IContainer container)
    {
        container.BorderBottom(0.6f).BorderColor(Line).PaddingHorizontal(12).PaddingTop(8).PaddingBottom(8).Height(100).Column(c =>
        {
            if (!_m.HasPriceCalculation)
            {
                c.Item().Text("Prisberäkning ej gjord").FontSize(8.5f);
                return;
            }

            c.Item().Text(text =>
            {
                text.DefaultTextStyle(x => x.FontSize(8.5f).FontColor(Dark));
                text.Span("Prislista: ");
                text.Span(_m.PriceListName).Bold();
                text.Span("  (ex moms)");
            });

            foreach (var line in _m.FreeKmTerms)
                c.Item().PaddingTop(4).Text(line).FontSize(6.5f);
        });
    }

    private void ComposeDeposition(IContainer container)
    {
        container.BorderBottom(0.6f).BorderColor(Line).PaddingHorizontal(12).PaddingTop(8).PaddingBottom(8).Text(text =>
        {
            text.DefaultTextStyle(x => x.FontSize(9.5f).Bold().FontColor(Dark));
            text.Span("Erlagd deposition  ");
            text.Span($"{_m.DepositPaid:N2} {_m.Currency}");
        });
    }

    private void ComposeDriverBooking(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Border(0.6f).BorderColor(Line).Padding(8).Column(c =>
            {
                c.Item().Text("Förare / Referens").Bold().FontSize(8.5f);
                c.Item().Text($"Förare: {_m.DriverName}").FontSize(8.5f);
                c.Item().Text($"Telefon: {_m.DriverPhone}").FontSize(8.5f);
                c.Item().Text($"Referens: {_m.ReferencePerson}").FontSize(8.5f);
            });

            row.ConstantItem(8);

            row.RelativeItem().Border(0.6f).BorderColor(Line).Padding(8).Column(c =>
            {
                c.Item().Text("Bokad från / till").Bold().FontSize(8.5f);
                c.Item().Text($"Från: {_m.BookedFrom}").FontSize(8.5f);
                c.Item().Text($"Till: {_m.BookedTo}").FontSize(8.5f);
                c.Item().Text($"{_m.PickupLocation}   /   {_m.DropoffLocation}").FontSize(8.5f);
                c.Item().Text($"Utland: {_m.AbroadAllowed}").FontSize(8.5f);
            });
        });
    }

    private void ComposeInsurance(IContainer container)
    {
        container.PaddingHorizontal(12).PaddingTop(8).PaddingBottom(0).Column(c =>
        {
            // c.Item().Text("Försäkring / Skada").FontSize(6.5f).SemiBold();

            c.Item().PaddingTop(6).Row(r =>
            {
                r.RelativeItem().Column(left =>
                {
                    left.Item().Text("Försäkringsbolag").FontSize(6.5f);
                    left.Item().PaddingTop(3).Text(_m.InsuranceCompany).FontSize(8.5f);

                    left.Item().PaddingTop(8).Text("Försäkringsprislista").FontSize(6.5f);
                    left.Item().PaddingTop(3).Text(_m.InsurancePriceList).FontSize(8.5f);

                    left.Item().PaddingTop(8).Text("Förhyrning godkänd t.o.m.").FontSize(6.5f);
                    left.Item().PaddingTop(3).Text(_m.RentalApprovedUntil).FontSize(8.5f);

                    left.Item().PaddingTop(8).Text("Hyresmans regnr").FontSize(6.5f);
                    left.Item().PaddingTop(3).Text(_m.InsuranceCustomerRegNr).FontSize(8.5f);

                    left.Item().PaddingTop(8).Text("Hyresman momsredov.skyldig").FontSize(6.5f);
                    left.Item().PaddingTop(3).Text(_m.CustomerVatLiable).FontSize(8.5f);
                });

                r.RelativeItem().Column(right =>
                {
                    right.Item().Text("Telefon").FontSize(6.5f);
                    right.Item().PaddingTop(3).Text(_m.InsuranceCompanyPhone).FontSize(8.5f);

                    right.Item().PaddingTop(8).Text("Tillståndsgivare").FontSize(6.5f);
                    right.Item().PaddingTop(3).Text(_m.PermitIssuer).FontSize(8.5f);

                    right.Item().PaddingTop(8).Text("Skadenummer").FontSize(6.5f);
                    right.Item().PaddingTop(3).Text(_m.DamageNumber).FontSize(8.5f);

                    right.Item().PaddingTop(8).Text("Skadedatum").FontSize(6.5f);
                    right.Item().PaddingTop(3).Text(_m.DamageDate).FontSize(8.5f);

                    right.Item().PaddingTop(8).Text("Motparts regnr").FontSize(6.5f);
                    right.Item().PaddingTop(3).Text(_m.OtherPartyRegNr).FontSize(8.5f);

                });
            });
        });
    }

    private void ComposeChargesTable(IContainer container)
    {
        container.Border(0.6f).BorderColor(Line).PaddingHorizontal(12).PaddingTop(8).PaddingBottom(8).Height(170).Column(col =>
        {
            col.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(2.3f); // Benämning
                    columns.RelativeColumn(1.0f); // Antal
                    columns.RelativeColumn(1.1f); // á-pris
                    columns.RelativeColumn(1.3f); // Belopp Hyresman
                    columns.RelativeColumn(1.3f); // Belopp F-bolag
                    columns.RelativeColumn(1.3f); // Belopp internt
                });

                table.Header(header =>
                {
                    header.Cell().Text("Benämning").FontSize(6.5f);
                    header.Cell().AlignRight().Text("Antal").FontSize(6.5f);
                    header.Cell().AlignRight().Text("á-pris").FontSize(6.5f);
                    header.Cell().AlignRight().Text("Hyresm.").FontSize(6.5f);
                    header.Cell().AlignRight().Text("F-bolag").FontSize(6.5f);
                    header.Cell().AlignRight().Text("Internt").FontSize(6.5f);
                });

                foreach (var line in _m.Charges)
                {
                    table.Cell().PaddingTop(4).Text(line.Description).FontSize(6.5f).Bold();
                    table.Cell().PaddingTop(4).AlignRight().Text($"{line.Qty:N2}").FontSize(6.5f).Bold();
                    table.Cell().PaddingTop(4).AlignRight().Text($"{line.UnitPrice:N2}").FontSize(6.5f).Bold();
                    table.Cell().PaddingTop(4).AlignRight().Text($"{line.AmountCustomer:N2}").FontSize(6.5f).Bold();
                    table.Cell().PaddingTop(4).AlignRight().Text(line.AmountInsurer is { } ai ? $"{ai:N2}" : "").FontSize(6.5f);
                    table.Cell().PaddingTop(4).AlignRight().Text(line.AmountInternal is { } aint ? $"{aint:N2}" : "").FontSize(6.5f);
                }
            });

            col.Item().PaddingTop(8).Row(r =>
            {
                r.RelativeItem().Text("Summa").FontSize(8.5f).Bold();
                r.RelativeItem().AlignRight().Text($"{_m.TotalDue:N2}").FontSize(8.5f).Bold();
            });

            col.Item().PaddingTop(6).LineHorizontal(0.6f).LineColor(Line);

            col.Item().PaddingTop(6).Row(r =>
            {
                r.RelativeItem().Text("Att betala / erhålla").FontSize(9.5f).Bold();
                r.RelativeItem().AlignRight().Text($"{_m.TotalDue:N2}").FontSize(9.5f).Bold();
            });
        });
    }

    private void ComposeClosing(IContainer container)
    {
        container.PaddingHorizontal(12).PaddingTop(8).PaddingBottom(0).Column(c =>
        {
            c.Item().Text(_m.ApprovalText).FontSize(8.5f).LineHeight(1.3f);

            c.Item().PaddingTop(16).Text(new string('.', 120)).FontSize(6f).FontColor(Grey);
            c.Item().PaddingTop(4).Text("Hyresman / förare").FontSize(8.5f);

            c.Item().PaddingTop(20).Text(_m.ReceiptText).FontSize(8.5f).LineHeight(1.3f);

            c.Item().PaddingTop(16).Text(new string('.', 120)).FontSize(6f).FontColor(Grey);
            c.Item().PaddingTop(4).Row(r =>
            {
                r.AutoItem().Text("Uthyrare").FontSize(8.5f);
                r.AutoItem().PaddingLeft(20).Text(_m.SignerName).FontSize(8.5f);
            });
        });
    }

    private void ComposeFreeKmTerms(IContainer container)
    {
        container.Column(c =>
        {
            foreach (var line in _m.FreeKmTerms)
                c.Item().Text(line).FontSize(6.5f).FontColor(Grey);
        });
    }

    private void ComposePaymentSummary(IContainer container)
    {
        container.Border(0.6f).BorderColor(Line).Padding(8).Row(row =>
        {
            row.RelativeItem().Column(c =>
            {
                c.Item().Text(_m.PriceListNote).FontSize(8.5f);
                c.Item().Text($"Erlagd deposition: {_m.DepositPaid:N2} {_m.Currency}").FontSize(8.5f);
            });
            row.RelativeItem().Column(c =>
            {
                c.Item().Text($"Depositionsavgift: {_m.DepositRatePerDay}").FontSize(8.5f);
                c.Item().Text($"Drivmedel: {_m.FuelType}").FontSize(8.5f);
            });
        });
    }

    private void ComposeRules(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().Background(Dark).Padding(5).Text("VILLKOR")
                .FontSize(8.5f).Bold().FontColor(Colors.White);

            col.Item().Border(0.6f).BorderColor(Line).BorderTop(0).Padding(8).Column(c =>
            {
                c.Item().Text(_m.RulesText).FontSize(8.5f).LineHeight(1.3f);
                c.Item().PaddingTop(4).Text(_m.ApprovalText).FontSize(8.5f).LineHeight(1.3f);
            });
        });
    }

    private void ComposeSignatures(IContainer container)
    {
        container.Column(outer =>
        {
            outer.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text(new string('_', 40)).FontSize(8.5f);
                    c.Item().PaddingTop(2).Text("Hyresman / förare").FontSize(7).FontColor(Grey);
                });

                row.ConstantItem(16);

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text(new string('_', 40)).FontSize(8.5f);
                    c.Item().PaddingTop(2).Text("Uthyrare").FontSize(7).FontColor(Grey);
                });
            });

            outer.Item().PaddingTop(6).LineHorizontal(0.6f).LineColor(Line);
            outer.Item().PaddingTop(6).Text(_m.ReceiptText).FontSize(7).FontColor(Grey);
        });
    }

    private void HeaderCell(IContainer container, string text, bool leftAlign)
    {
        var aligned = leftAlign ? container : container.AlignRight();
        aligned.Background(Dark).Padding(6).Text(text).FontSize(6.5f).Bold().FontColor(Colors.White);
    }

    private void BodyCell(IContainer container, string text, bool leftAlign, string background)
    {
        var aligned = leftAlign ? container : container.AlignRight();
        aligned.Background(background).BorderBottom(0.4f).BorderColor(Line)
            .Padding(6).Text(text).FontSize(8f);
    }
}

// ---------- Generated PDF DTO ----------

