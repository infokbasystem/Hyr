using System.Globalization;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Hyr.Api.Data;
using Hyr.Api.Models;

namespace Hyr.Api.Services;

public interface IReservationPdfService
{
    Task<GeneratedPdf?> GenerateReservationPdfAsync(int officeId, int reservationId, CancellationToken cancellationToken);
}

// ---------- Data model ----------

public record ReservationPdfModel
{
    // Rental company (issuer)
    public required string CompanyName { get; init; }
    public required string CompanyAddress { get; init; }
    public required string CompanyPhone { get; init; }
    public required string CompanyEmail { get; init; }
    public required string Bankgiro { get; init; }
    public required string OrgNr { get; init; }
    public required string Iban { get; init; }
    public required string SwiftBic { get; init; }
    public required string JournalNr { get; init; }

    // Contract header
    public required string ContractNumber { get; init; }
    public required string PrintDate { get; init; }

    // Customer (Hyresman)
    public required string CustomerName { get; init; }
    public required IReadOnlyList<string> CustomerLines { get; init; }

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
    public required string ReferencePerson { get; init; }

    // Booking period
    public required string BookedFrom { get; init; }
    public required string BookedTo { get; init; }
    public required string PickupLocation { get; init; }
    public required string DropoffLocation { get; init; }
    public required string AbroadAllowed { get; init; }

    // Other info
    public required string OtherInfo { get; init; }
    public required string FuelType { get; init; }

    // Insurance / damage
    public required string InsuranceCompany { get; init; }
    public required string InsurancePriceList { get; init; }
    public required string RentalApprovedUntil { get; init; }
    public required string CustomerVatLiable { get; init; }
    public required string PermitIssuer { get; init; }
    public required string DamageNumber { get; init; }
    public required string DamageDate { get; init; }
    public required string OtherPartyRegNr { get; init; }
    public required string OtherPartyPhone { get; init; }
    public required string SelfRiskReduction { get; init; }
    public required decimal SelfRiskAmount { get; init; }

    // Charges
    public required IReadOnlyList<ChargeLine> Charges { get; init; }
    public required decimal TotalDue { get; init; }
    public required IReadOnlyList<string> FreeKmTerms { get; init; }

    // Payment / deposit
    public required string PriceListNote { get; init; }
    public required decimal DepositPaid { get; init; }
    public required string DepositRatePerDay { get; init; }

    public required string Currency { get; init; }
    public required string RulesText { get; init; }
    public required string ApprovalText { get; init; }
    public required string ReceiptText { get; init; }
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
            .Include(r => r.ReservationItems)
                .ThenInclude(ri => ri.Item)
                    .ThenInclude(i => i!.ItemModel)
            .FirstOrDefaultAsync(r => r.Id == reservationId && r.OfficeId == officeId, cancellationToken);

        if (reservation?.Office is null)
            return null;

        var model = CreateModel(reservation);
        var document = new ReservationDocument(model);
        var content = document.GeneratePdf();

        var number = reservation.ReservationNr?.ToString(CultureInfo.InvariantCulture) ?? reservation.Id.ToString(CultureInfo.InvariantCulture);
        return new GeneratedPdf(content, $"reservation_{number}.pdf");
    }

    private ReservationPdfModel CreateModel(Reservation reservation)
    {
        var office = reservation.Office!;
        var customer = reservation.Customer;
        var vehicle = reservation.ReservationItems.FirstOrDefault(ri => ri.ItemTypeCode == "VEHICLE");

        // Build customer lines
        var customerLines = new List<string>();
        if (!string.IsNullOrWhiteSpace(reservation.CustomerName))
            customerLines.Add(reservation.CustomerName);
        if (!string.IsNullOrWhiteSpace(reservation.Address))
            customerLines.Add(reservation.Address);
        if (!string.IsNullOrWhiteSpace(reservation.ZipCode) || !string.IsNullOrWhiteSpace(customer?.City))
        {
            var postal = $"{reservation.ZipCode} {customer?.City}".Trim();
            if (!string.IsNullOrWhiteSpace(postal))
                customerLines.Add(postal);
        }
        if (!string.IsNullOrWhiteSpace(reservation.MobilePhone))
            customerLines.Add($"Tel: {reservation.MobilePhone}");
        if (!string.IsNullOrWhiteSpace(reservation.Email))
            customerLines.Add(reservation.Email);

        // Build charges (dummy data for now)
        var charges = new List<ChargeLine>
        {
            new ChargeLine("Månadshyra inkl 2500 km", 24.00m, 7150.00m, 171600.00m),
            new ChargeLine("Överdygn", 0.00m, 240.00m, 0.00m),
            new ChargeLine("Kilometerkostnad, -25 mil", 0.00m, 0.80m, 0.00m),
            new ChargeLine("Rabatt på hyra", 1.00m, 0.00m, 0.00m),
            new ChargeLine("Självrisk skada (glas)", 1.00m, 2800.00m, 2800.00m),
            new ChargeLine("Drivmedel", 35.50m, 21.00m, 745.50m),
            new ChargeLine("Punkteringsvätska", 1.00m, 400.00m, 400.00m),
            new ChargeLine("Moms", 0.00m, 0.00m, 43886.37m),
        };

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
            CompanyName = office.Name ?? "Hyr",
            CompanyAddress = $"{office.Street}, {office.ZipCode} {office.City}".Trim(),
            CompanyPhone = office.Telephone ?? "Tel",
            CompanyEmail = office.Email ?? "Email",
            Bankgiro = "XXXX-XXXX",
            OrgNr = office.OrganizationNr ?? "000000-0000",
            Iban = "SE00 0000 0000 0000 0000 0000",
            SwiftBic = "XXXXSESS",
            JournalNr = "000-0000000",

            // Contract
            ContractNumber = reservation.ReservationNr?.ToString(CultureInfo.InvariantCulture) ?? reservation.Id.ToString(CultureInfo.InvariantCulture),
            PrintDate = DateTime.Now.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),

            // Customer
            CustomerName = reservation.CustomerName ?? "Ej angivet",
            CustomerLines = customerLines.AsReadOnly(),

            // Vehicle (from first vehicle item or dummy)
            VehicleDescription = vehicle?.Item?.ItemModel?.Name ?? "Okänd fordon",
            RegNr = vehicle?.RegNr ?? vehicle?.Item?.RegNr ?? "XXX000",
            ModelYear = vehicle?.YearModel ?? vehicle?.Item?.YearModel ?? "0000",
            Category = vehicle?.Item?.ItemCategory?.Name ?? "E",
            OdometerOut = vehicle?.KmOut?.ToString() ?? "0",
            OdometerIn = vehicle?.KmIn?.ToString() ?? "0",
            DrivenKm = ((vehicle?.KmIn ?? 0) - (vehicle?.KmOut ?? 0)).ToString(),

            // Driver / reference
            DriverName = reservation.DriverName ?? "Ej angivet",
            DriverPhone = reservation.DriverMobilePhone ?? "Tel",
            ReferencePerson = reservation.Reference ?? reservation.CustomerMarking ?? "Referens",

            // Booking
            BookedFrom = FormatDateTime(vehicle?.BookedFrom),
            BookedTo = FormatDateTime(vehicle?.BookedTo),
            PickupLocation = "Hämtas i " + (reservation.DeliveryPlace ?? office.City ?? "Luleå"),
            DropoffLocation = "Lämnas i " + (reservation.DeliveryPlace ?? office.City ?? "Luleå"),
            AbroadAllowed = "EJ TILLÅTET",

            // Other
            OtherInfo = reservation.Note ?? "Ingen information angiven.",
            FuelType = "Diesel",

            // Insurance (dummy)
            InsuranceCompany = "",
            InsurancePriceList = "",
            RentalApprovedUntil = "",
            CustomerVatLiable = "",
            PermitIssuer = "",
            DamageNumber = "",
            DamageDate = "",
            OtherPartyRegNr = "",
            OtherPartyPhone = "",
            SelfRiskReduction = "Nej",
            SelfRiskAmount = 2800.00m,

            // Charges
            Charges = charges.AsReadOnly(),
            TotalDue = 219431.87m,
            FreeKmTerms = freeKmTerms.AsReadOnly(),

            // Payment
            PriceListNote = "Prislista: Avtalspris (ex moms)",
            DepositPaid = 0.00m,
            DepositRatePerDay = "X kr/dag",

            Currency = "kr",

            RulesText = "Rökning och djur är förbjuden i hyrbilen. Drivmedel tillkommer på samtliga fordon. " +
                        "Hyresman skall alltid ringa oss när denne är åter med bilen.",

            ApprovalText = "Undertecknad förklarar sig införstådd med och godkänner hyresvillkoren. Böter och avgifter " +
                          "som uppkommer under hyrestiden betalas av hyresmannen.",

            ReceiptText = "Fordonet besiktigat och mottaget. Ovanstående belopp kvitteras samt eventuell deposition återbetalad.",
        };
    }

    private string FormatDateTime(DateTime? value) =>
        value?.ToString("yyyy-MM-dd HH:mm", CultureInfo.GetCultureInfo("sv-SE")) ?? "";
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
            page.MarginLeft(18, Unit.Millimetre);
            page.MarginRight(18, Unit.Millimetre);
            page.MarginTop(12, Unit.Millimetre);
            page.MarginBottom(12, Unit.Millimetre);
            page.DefaultTextStyle(x => x.FontFamily("Helvetica").FontSize(8.5f).FontColor(Dark));

            page.Content().Column(col =>
            {
                col.Item().Element(ComposeHeader);
                col.Item().PaddingTop(5).LineHorizontal(1.2f).LineColor(Accent);
                col.Item().PaddingTop(8).Element(ComposeCustomerVehicle);
                col.Item().PaddingTop(8).Element(ComposeDriverBooking);
                col.Item().PaddingTop(8).Element(ComposeInsurance);
                col.Item().PaddingTop(8).Element(ComposeChargesTable);
                col.Item().PaddingTop(6).Element(ComposeFreeKmTerms);
                col.Item().PaddingTop(8).Element(ComposePaymentSummary);
                col.Item().PaddingTop(8).Element(ComposeRules);
                col.Item().PaddingTop(12).Element(ComposeSignatures);
            });

            page.Footer().PaddingTop(8).AlignCenter().Text(text =>
            {
                text.DefaultTextStyle(x => x.FontSize(7.5f).FontColor(Grey));
                text.Span("Page ");
                text.CurrentPageNumber();
                text.Span(" of ");
                text.TotalPages();
            });
        });
    }

    private void ComposeHeader(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem(1.5f).Column(c =>
            {
                c.Item().Text(_m.CompanyName).FontSize(16).Bold().FontColor(Dark);
                c.Item().PaddingTop(2).Text(
                    $"{_m.CompanyAddress}\n" +
                    $"Tel: {_m.CompanyPhone}  ·  {_m.CompanyEmail}  ·  Org.nr {_m.OrgNr}\n" +
                    $"Bankgiro {_m.Bankgiro}  ·  IBAN {_m.Iban}  ·  Swift/Bic {_m.SwiftBic}")
                    .FontSize(7.5f).FontColor(Grey).LineHeight(1.3f);
            });

            row.RelativeItem(1f).Column(c =>
            {
                c.Item().AlignRight().Text("HYRESKONTRAKT").FontSize(13).Bold().FontColor(Accent);
                c.Item().AlignRight().PaddingTop(2).Text(text =>
                {
                    text.AlignRight();
                    text.DefaultTextStyle(x => x.FontSize(7.5f).FontColor(Grey));
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

    private void ComposeCustomerVehicle(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Border(0.6f).BorderColor(Line).Padding(8).Column(c =>
            {
                c.Item().Text("Hyresman").Bold().FontSize(8.5f);
                c.Item().Text(_m.CustomerName).FontSize(8.5f);
                foreach (var line in _m.CustomerLines)
                    c.Item().Text(line).FontSize(8.5f);
            });

            row.ConstantItem(8);

            row.RelativeItem().Border(0.6f).BorderColor(Line).Padding(8).Column(c =>
            {
                c.Item().Text("Hyresobjekt").Bold().FontSize(8.5f);
                c.Item().Text($"{_m.VehicleDescription}  ({_m.ModelYear})").FontSize(8.5f);
                c.Item().Text($"Regnr: {_m.RegNr}   Kategori: {_m.Category}").FontSize(8.5f);
                c.Item().Text($"Mätarställning ut/in: {_m.OdometerOut} / {_m.OdometerIn}").FontSize(8.5f);
                c.Item().Text($"Körda km: {_m.DrivenKm}").FontSize(8.5f);
                c.Item().Text($"Drivmedel: {_m.FuelType}").FontSize(8.5f);
            });
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
        var hasAny =
            !string.IsNullOrWhiteSpace(_m.InsuranceCompany) ||
            !string.IsNullOrWhiteSpace(_m.DamageNumber) ||
            !string.IsNullOrWhiteSpace(_m.OtherPartyRegNr);

        container.Column(col =>
        {
            col.Item().Background(Dark).Padding(5).Text("FÖRSÄKRING / SKADA")
                .FontSize(8.5f).Bold().FontColor(Colors.White);

            col.Item().Border(0.6f).BorderColor(Line).BorderTop(0).Padding(8).Column(c =>
            {
                if (!hasAny)
                {
                    c.Item().Text("Inga uppgifter registrerade.").FontSize(8.5f).FontColor(Grey);
                    return;
                }

                c.Item().Row(r =>
                {
                    r.RelativeItem().Text($"Försäkringsbolag: {_m.InsuranceCompany}").FontSize(8.5f);
                    r.RelativeItem().Text($"Prislista: {_m.InsurancePriceList}").FontSize(8.5f);
                });
                c.Item().Row(r =>
                {
                    r.RelativeItem().Text($"Förhyrning godkänd t.o.m.: {_m.RentalApprovedUntil}").FontSize(8.5f);
                    r.RelativeItem().Text($"Momsredovisningsskyldig: {_m.CustomerVatLiable}").FontSize(8.5f);
                });
                c.Item().Row(r =>
                {
                    r.RelativeItem().Text($"Skadenummer: {_m.DamageNumber}").FontSize(8.5f);
                    r.RelativeItem().Text($"Skadedatum: {_m.DamageDate}").FontSize(8.5f);
                });
                c.Item().Row(r =>
                {
                    r.RelativeItem().Text($"Motparts regnr: {_m.OtherPartyRegNr}").FontSize(8.5f);
                    r.RelativeItem().Text($"Telefon: {_m.OtherPartyPhone}").FontSize(8.5f);
                });
                c.Item().Text($"Tillståndsgivare: {_m.PermitIssuer}").FontSize(8.5f);
                c.Item().Row(r =>
                {
                    r.RelativeItem().Text($"Självriskreducering: {_m.SelfRiskReduction}").FontSize(8.5f);
                    r.RelativeItem().Text($"Belopp: {_m.SelfRiskAmount:N2} {_m.Currency}").FontSize(8.5f);
                });
            });
        });
    }

    private void ComposeChargesTable(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(3.4f); // Benämning
                    columns.RelativeColumn(1.0f); // Antal
                    columns.RelativeColumn(1.2f); // á-pris
                    columns.RelativeColumn(1.6f); // Belopp Hyresman
                    columns.RelativeColumn(1.6f); // Belopp F-bolag
                    columns.RelativeColumn(1.6f); // Belopp internt
                });

                table.Header(header =>
                {
                    HeaderCell(header.Cell(), "Benämning", true);
                    HeaderCell(header.Cell(), "Antal", false);
                    HeaderCell(header.Cell(), "á-pris", false);
                    HeaderCell(header.Cell(), "Belopp Hyresman", false);
                    HeaderCell(header.Cell(), "Belopp F-bolag", false);
                    HeaderCell(header.Cell(), "Belopp internt", false);
                });

                var i = 0;
                foreach (var line in _m.Charges)
                {
                    var bg = i % 2 == 1 ? LightBg : "#FFFFFF";
                    BodyCell(table.Cell(), line.Description, true, bg);
                    BodyCell(table.Cell(), line.Qty.ToString("N2"), false, bg);
                    BodyCell(table.Cell(), line.UnitPrice.ToString("N2"), false, bg);
                    BodyCell(table.Cell(), $"{line.AmountCustomer:N2}", false, bg);
                    BodyCell(table.Cell(), line.AmountInsurer is { } ai ? $"{ai:N2}" : "", false, bg);
                    BodyCell(table.Cell(), line.AmountInternal is { } aint ? $"{aint:N2}" : "", false, bg);
                    i++;
                }
            });

            col.Item().PaddingTop(2).Background(Accent).Padding(4).Row(r =>
            {
                r.RelativeItem().Text("SUMMA / ATT BETALA").FontSize(10.5f).Bold()
                    .FontColor(Colors.White);
                r.RelativeItem().AlignRight().Text($"{_m.TotalDue:N2} {_m.Currency}").FontSize(10.5f).Bold()
                    .FontColor(Colors.White);
            });
        });
    }

    private void ComposeFreeKmTerms(IContainer container)
    {
        container.Column(c =>
        {
            foreach (var line in _m.FreeKmTerms)
                c.Item().Text(line).FontSize(7.5f).FontColor(Grey);
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
        aligned.Background(Dark).Padding(6).Text(text).FontSize(7.5f).Bold().FontColor(Colors.White);
    }

    private void BodyCell(IContainer container, string text, bool leftAlign, string background)
    {
        var aligned = leftAlign ? container : container.AlignRight();
        aligned.Background(background).BorderBottom(0.4f).BorderColor(Line)
            .Padding(6).Text(text).FontSize(8f);
    }
}

// ---------- Generated PDF DTO ----------

