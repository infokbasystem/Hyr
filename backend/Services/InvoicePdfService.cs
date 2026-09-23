using System.Globalization;

using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

using Backend.Data;
using Backend.Models;

namespace Backend.Services;

public interface IInvoicePdfService
{
    Task<GeneratedPdf?> GenerateInvoicePdfAsync(int officeId, int invoiceId, CancellationToken cancellationToken);
}

public sealed record GeneratedPdf(byte[] Content, string FileName);

public sealed class InvoicePdfService(ApplicationDbContext dbContext) : IInvoicePdfService
{
    public async Task<GeneratedPdf?> GenerateInvoicePdfAsync(int officeId, int invoiceId, CancellationToken cancellationToken)
    {
        var invoice = await dbContext.Invoices
            .AsNoTracking()
            .Include(row => row.Office)
            .Include(row => row.Customer)
            .Include(row => row.InvoiceRows)
            .FirstOrDefaultAsync(row => row.Id == invoiceId && row.OfficeId == officeId, cancellationToken);

        if (invoice?.Office is null)
        {
            return null;
        }

        var content = new InvoiceDocument(InvoicePdfModel.Create(invoice)).GeneratePdf();
        var number = invoice.InvoiceNr?.ToString(CultureInfo.InvariantCulture) ?? invoice.Id.ToString(CultureInfo.InvariantCulture);
        return new GeneratedPdf(content, $"invoice_{number}.pdf");
    }

    private sealed record InvoicePdfModel(
        byte[]? LogoBytes,
        string CompanyName,
        IReadOnlyList<string> CompanyAddressLines,
        string CompanyCountry,
        string CompanyOrgNr,
        string CompanyEmergencyNumber,
        string CompanyTelephone,
        string CompanyEmail,
        string CompanyBgNr,
        string CompanyIban,
        string CompanyVatNr,
        string InvoiceNumber,
        DateTime? InvoiceDate,
        DateTime? DueDate,
        IReadOnlyList<string> CustomerLines,
        string CustomerOrgNr,
        string OurReference,
        string YourReference,
        string Terms,
        string LatePaymentInterest,
        string Marking,
        string Note,
        IReadOnlyList<InvoicePdfRow> Rows,
        decimal Subtotal,
        decimal Vat,
        decimal Rounding,
        decimal Total)
    {
        public static InvoicePdfModel Create(Invoice invoice)
        {
            var office = invoice.Office!;
            var rows = invoice.InvoiceRows
                .Where(row => row.InvoiceRowType?.ToUpperInvariant() is not ("VAT" or "ROUNDING"))
                .OrderBy(row => row.SortNr ?? int.MaxValue)
                .ThenBy(row => row.Id)
                .Select(row => new InvoicePdfRow(First(row.Text1, "") ?? "", row.Text2, row.Qty ?? 0, row.UnitPrice ?? 0, row.VatRate ?? 0, row.Sum ?? 0))
                .ToList();

            var subtotal = invoice.TotExVat ?? rows.Sum(row => row.Amount);
            var vat = invoice.TotVat ?? rows.Sum(row => row.Amount * (row.VatRate / 100m));
            var rounding = invoice.Rounding ?? 0;
            var total = invoice.TotSum ?? subtotal + vat + rounding;

            return new(
                office.LogoData is { Length: > 0 } ? office.LogoData : null,
                First(office.Name, "Hyr")!,
                Lines(office.Street, PostalLine(office.ZipCode, office.City)),
                office.Country,
                office.OrganizationNr,
                office.EmergencyNumber,
                office.Telephone,
                office.Email,
                office.BgNr,
                office.Iban,
                office.VatNr,
                invoice.InvoiceNr?.ToString(CultureInfo.InvariantCulture) ?? invoice.Id.ToString(CultureInfo.InvariantCulture),
                invoice.InvoiceDate,
                invoice.InvoiceDate?.AddDays(invoice.NrOfInvoiceDays ?? office.DefaultPaymentDays ?? 0),
                Lines(invoice.CustomerName, invoice.Street1, invoice.Street2, PostalLine(invoice.ZipCode?.ToString(CultureInfo.InvariantCulture), invoice.City)),
                invoice.OrgNr,
                invoice.OurReference,
                invoice.YourReference,
                First(invoice.TermsOfPayment, invoice.NrOfInvoiceDays is > 0 ? $"{invoice.NrOfInvoiceDays} dagar" : null) ?? string.Empty,
                office.LatePaymentInterest.HasValue ? $"{office.LatePaymentInterest.Value.ToString("0.##", CultureInfo.GetCultureInfo("sv-SE"))} %" : string.Empty,
                invoice.Marking,
                invoice.Note,
                rows, subtotal, vat, rounding, total);
        }
    }

    private sealed record InvoicePdfRow(string Description, string? SecondLine, decimal Quantity, decimal UnitPrice, decimal VatRate, decimal Amount);

    private sealed class InvoiceDocument(InvoicePdfModel model) : IDocument
    {
        private static readonly string Dark = "##343941";
        private static readonly string DarkLight = "#333333";
        private static readonly string Accent = "#EA580C";
        private static readonly string StripAccent = "#59C6C3";
        private static readonly string StripHighlight = "#F97316";
        private static readonly string Grey = "#6B7280";
        private static readonly string Line = "#D1D5DB";

        public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

        public void Compose(IDocumentContainer container)
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(0, Unit.Millimetre);
                page.DefaultTextStyle(style => style.FontFamily("Helvetica").FontSize(9).FontColor(Dark));
                page.Header().PaddingHorizontal(30).PaddingVertical(25).Element(ComposeHeader);
                page.Content().PaddingVertical(12).Column(column =>
                {
                    column.Item().PaddingHorizontal(50).Element(ComposeCustomerAndReference);
                    column.Item().PaddingHorizontal(30).PaddingTop(24).Element(ComposeMetadataStrip);
                    column.Item().PaddingLeft(37).PaddingTop(12).Element(ComposeInvoiceDetails);
                    column.Item().PaddingHorizontal(30).PaddingTop(18).Element(ComposeTable);
                    if (!string.IsNullOrWhiteSpace(model.Note))
                    {
                        column.Item().PaddingHorizontal(30).PaddingTop(20).Text(model.Note).LineHeight(1.4f);
                    }
                    column.Item().ExtendVertical().AlignBottom().Element(ComposeTotals);
                });
                page.Footer().Element(ComposeFooter);
            });
        }

        private void ComposeHeader(IContainer container)
        {
            container.Row(row =>
            {
                row.RelativeItem().Column(column =>
                {
                    if (model.LogoBytes is { Length: > 0 } logoBytes)
                    {
                        column.Item().PaddingBottom(6).Width(120).Image(logoBytes).FitWidth();
                    }
                    else
                    {
                        column.Item().Text(model.CompanyName).FontSize(16).Bold();
                    }
                    foreach (var line in model.CompanyAddressLines)
                    {
                        column.Item().PaddingTop(2).Width(120).AlignCenter().Text(line).FontSize(8).FontColor(Grey);
                    }
                });
                row.ConstantItem(220).PaddingTop(20).PaddingRight(20).Column(column =>
                {
                    column.Item().AlignRight().Row(title =>
                    {
                        title.AutoItem().Text("Faktura").FontFamily("Arial Narrow").FontSize(15).SemiBold();
                        title.AutoItem().PaddingLeft(10).Text(model.InvoiceNumber).FontFamily("Arial Narrow").FontSize(15).SemiBold();

                    });
                    LabelValue(column, "Fakturadatum", FormatDate(model.InvoiceDate), true);
                });
            });
        }

        private void ComposeCustomerAndReference(IContainer container)
        {
            container.Row(row =>
            {
                row.RelativeItem(1f).Column(column =>
                {
                    column.Item().PaddingBottom(2).Text("FAKTURAMOTTAGARE").FontSize(8).Bold();
                    foreach (var line in model.CustomerLines)
                    {
                        column.Item().PaddingTop(3).Text(line).FontSize(8).FontColor(Grey);
                    }
                    if (!string.IsNullOrWhiteSpace(model.CustomerOrgNr))
                    {
                        column.Item().PaddingTop(3).Text($"Org.nr: {model.CustomerOrgNr}").FontSize(8).FontColor(Grey);
                    }
                });
                row.RelativeItem(1.6f).Column(column =>
                {
                    column.Item().Text("Er referens").FontSize(7).FontColor(Grey);
                    column.Item().PaddingTop(2).Text(string.IsNullOrWhiteSpace(model.YourReference) ? "-" : model.YourReference).FontSize(9).LineHeight(1.4f).Bold();
                    // column.Item().PaddingTop(6).Text("Märkning").FontSize(7).FontColor(Grey);
                    // column.Item().PaddingTop(2).Text(string.IsNullOrWhiteSpace(model.Marking) ? "-" : model.Marking).FontSize(9).Bold();
                });
            });
        }

        private void ComposeMetadataStrip(IContainer container)
        {
            var cells = new[]
            {
                ("Fakturanr", model.InvoiceNumber),
                ("Fakturadatum", FormatDate(model.InvoiceDate)),
                ("Märkning", string.IsNullOrWhiteSpace(model.Marking) ? "-" : model.Marking),
                ("Vår referens", string.IsNullOrWhiteSpace(model.OurReference) ? "-" : model.OurReference),
                ("Förfallodatum", FormatDate(model.DueDate)),
            };

            container.Row(row =>
            {
                for (var index = 0; index < cells.Length; index++)
                {
                    var cell = cells[index];
                    row.RelativeItem()
                        .Background(index == cells.Length - 1 ? StripHighlight : StripAccent)
                        .Padding(7)
                        .Column(column =>
                        {
                            column.Item().Text(cell.Item1).FontSize(7).FontColor(Colors.White);
                            column.Item().PaddingTop(2).Text(cell.Item2).FontSize(9).Bold().FontColor(Colors.White);
                        });

                    if (index < cells.Length - 1)
                    {
                        row.ConstantItem(1).Background(Colors.White);
                    }
                }
            });
        }

        private void ComposeInvoiceDetails(IContainer container)
        {
            container.Row(row =>
            {
                row.RelativeItem().Column(column =>
                {
                    LabelValue(column, "Betalvillkor", model.Terms);
                    LabelValue(column, "Dröjsmålsränta", model.LatePaymentInterest);
                });
                // row.RelativeItem().Column(column =>
                // {
                //     LabelValue(column, "Er referens", model.YourReference);
                // });
            });
        }

        private void ComposeTable(IContainer container)
        {
            container.Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn();
                    columns.ConstantColumn(60);
                    columns.ConstantColumn(65);
                    columns.ConstantColumn(55);
                    columns.ConstantColumn(75);
                });
                Header(table.Cell(), "Artikel");
                Header(table.Cell(), "Antal", true);
                Header(table.Cell(), "Á-pris", true);
                Header(table.Cell(), "Moms", true);
                Header(table.Cell(), "Summa", true);
                foreach (var item in model.Rows)
                {
                    DescriptionCell(table.Cell(), item.Description, item.SecondLine);
                    Cell(table.Cell(), FormatNumber(item.Quantity), true);
                    Cell(table.Cell(), FormatMoney(item.UnitPrice), true);
                    Cell(table.Cell(), FormatNumber(item.VatRate), true);
                    Cell(table.Cell(), FormatMoney(item.Amount), true);
                }
            });
        }

        private void ComposeTotals(IContainer container)
        {
            container.Background(DarkLight).Padding(22).Row(row =>
            {
                TotalCell(row, "Subtotal", model.Subtotal);
                TotalCell(row, "Moms", model.Vat);
                TotalCell(row, "Öresutj.", model.Rounding);
                TotalCell(row, "Att betala", model.Total, true);
            });
        }

        private void ComposeFooter(IContainer container)
        {
            container.PaddingHorizontal(30).PaddingTop(20).PaddingBottom(10).DefaultTextStyle(style => style.LineHeight(1.4f)).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text(model.CompanyName).Bold();
                    foreach (var line in model.CompanyAddressLines) c.Item().Text(line);
                    if (!string.IsNullOrWhiteSpace(model.CompanyCountry)) c.Item().Text(model.CompanyCountry);
                });
                row.RelativeItem().Column(c =>
                {
                    if (!string.IsNullOrWhiteSpace(model.CompanyEmergencyNumber)) c.Item().Text($"Jour {model.CompanyEmergencyNumber}").FontColor(Accent);
                    if (!string.IsNullOrWhiteSpace(model.CompanyTelephone)) c.Item().Text($"Tel {model.CompanyTelephone}");
                    if (!string.IsNullOrWhiteSpace(model.CompanyEmail)) c.Item().Text($"Mail {model.CompanyEmail}");
                });
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Betalningsinformation").Bold();
                    if (!string.IsNullOrWhiteSpace(model.CompanyBgNr)) c.Item().Text($"Bankgiro {model.CompanyBgNr}");
                    if (!string.IsNullOrWhiteSpace(model.CompanyIban)) c.Item().Text($"IBAN {model.CompanyIban}");
                });
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Godkänd för F-skatt");
                    if (!string.IsNullOrWhiteSpace(model.CompanyOrgNr)) c.Item().Text($"Org.nr {model.CompanyOrgNr}");
                    if (!string.IsNullOrWhiteSpace(model.CompanyVatNr)) c.Item().Text($"VAT {model.CompanyVatNr}");
                });
            });
        }

        private static void Header(IContainer container, string text, bool right = false) => container.BorderBottom(0.5f).BorderColor(DarkLight).Padding(3).Text(t => { if (right) t.AlignRight(); t.Span(text).FontColor(Grey); });

        private static void Cell(IContainer container, string text, bool right = false) => container.BorderBottom(0.25f).BorderColor(Colors.Grey.Lighten1).PaddingTop(7).PaddingBottom(5).PaddingHorizontal(6).Text(t => { if (right) t.AlignRight(); t.Span(text); });

        private static void DescriptionCell(IContainer container, string text, string? secondLine) =>
        container.BorderBottom(0.25f).BorderColor(Colors.Grey.Lighten1).PaddingTop(7).PaddingBottom(5).PaddingHorizontal(6).Column(column =>
        {
            if (!string.IsNullOrWhiteSpace(text))
            {
                column.Item().Text(text);
            }
            if (!string.IsNullOrWhiteSpace(secondLine))
            {
                column.Item().PaddingTop(3).Text(secondLine).FontColor(Grey);
            }
        }); 

        private static void LabelValue(ColumnDescriptor column, string label, string? value, bool right = false) =>
        (right ? column.Item().AlignRight() : column.Item()).PaddingTop(4).Text(text =>
        {
            if (right) text.AlignRight();
            text.Span($"{label}: ").FontSize(7).FontColor(Grey);
            text.Span(string.IsNullOrWhiteSpace(value) ? "-" : value).FontSize(9).Bold();
        });

        private static void TotalCell(RowDescriptor row, string label, decimal amount, bool emphasized = false) => row.RelativeItem().AlignCenter().Column(column =>
        {
            column.Item().PaddingTop(emphasized ? 0 : 2).AlignCenter().Text(label).FontColor(Colors.White).FontSize(emphasized ? 10 : 9);
            column.Item().PaddingTop(2).AlignCenter().Text(FormatMoney(amount)).FontColor(Colors.White).FontFamily("Arial Narrow").FontSize(emphasized ? 14 : 10).Bold();
        });
    }

    private static IReadOnlyList<string> Lines(params string?[] values) => values.Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value!.Trim()).ToList();
    private static string? First(params string?[] values) => values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
    private static string? PostalLine(string? zip, string? city) => First(zip, city) is null ? null : string.Join(" ", Lines(zip, city));
    private static string FormatDate(DateTime? date) => date?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty;
    private static string FormatMoney(decimal amount) => amount.ToString("N2", CultureInfo.GetCultureInfo("sv-SE"));
    private static string FormatNumber(decimal amount) => amount.ToString("0.##", CultureInfo.GetCultureInfo("sv-SE"));
}
