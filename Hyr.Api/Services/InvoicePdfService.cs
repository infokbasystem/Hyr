using System.Globalization;

using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

using Hyr.Api.Data;
using Hyr.Api.Models;

namespace Hyr.Api.Services;

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
        string CompanyName,
        IReadOnlyList<string> CompanyLines,
        string InvoiceNumber,
        DateTime? InvoiceDate,
        DateTime? DueDate,
        IReadOnlyList<string> CustomerLines,
        string OurReference,
        string YourReference,
        string Marking,
        string Terms,
        string Note,
        IReadOnlyList<InvoicePdfRow> Rows,
        decimal Subtotal,
        decimal Vat,
        decimal Total)
    {
        public static InvoicePdfModel Create(Invoice invoice)
        {
            var office = invoice.Office!;
            var rows = invoice.InvoiceRows
                .OrderBy(row => row.SortNr ?? int.MaxValue)
                .ThenBy(row => row.Id)
                .Select(row => new InvoicePdfRow(row.ArticleNr, First(row.Text1, row.Text2, "-") ?? "-", row.Qty ?? 0, row.UnitPrice ?? 0, row.VatRate ?? 0, row.Sum ?? 0))
                .ToList();

            var subtotal = invoice.TotExVat ?? rows.Sum(row => row.Amount);
            var vat = invoice.TotVat ?? rows.Sum(row => row.Amount * (row.VatRate / 100m));
            var total = invoice.TotSum ?? subtotal + vat + (invoice.Rounding ?? 0);

            return new(
                First(office.Name, "Hyr")!,
                Lines(office.Street, PostalLine(office.ZipCode, office.City), office.Telephone, office.Email, office.OrganizationNr),
                invoice.InvoiceNr?.ToString(CultureInfo.InvariantCulture) ?? invoice.Id.ToString(CultureInfo.InvariantCulture),
                invoice.InvoiceDate,
                invoice.InvoiceDate?.AddDays(invoice.NrOfInvoiceDays ?? office.DefaultPaymentDays ?? 0),
                Lines(invoice.CustomerName, invoice.Street1, invoice.Street2, PostalLine(invoice.ZipCode?.ToString(CultureInfo.InvariantCulture), invoice.City), invoice.OrgNr),
                invoice.OurReference,
                invoice.YourReference,
                invoice.Marking,
                First(invoice.TermsOfPayment, invoice.NrOfInvoiceDays is > 0 ? $"{invoice.NrOfInvoiceDays} dagar" : null) ?? string.Empty,
                invoice.Note,
                rows, subtotal, vat, total);
        }
    }

    private sealed record InvoicePdfRow(string ArticleNumber, string Description, decimal Quantity, decimal UnitPrice, decimal VatRate, decimal Amount);

    private sealed class InvoiceDocument(InvoicePdfModel model) : IDocument
    {
        public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

        public void Compose(IDocumentContainer container)
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(15, Unit.Millimetre);
                page.DefaultTextStyle(style => style.FontFamily("Helvetica").FontSize(9));
                page.Header().Row(row =>
                {
                    row.RelativeItem().Column(column =>
                    {
                        column.Item().Text(model.CompanyName).FontSize(18).Bold();
                        foreach (var line in model.CompanyLines) column.Item().Text(line);
                    });
                    row.RelativeItem().AlignRight().Column(column =>
                    {
                        column.Item().Text("FAKTURA").FontSize(16).Bold().FontColor(Colors.Blue.Darken2);
                        column.Item().Text($"Fakturanr: {model.InvoiceNumber}");
                        column.Item().Text($"Datum: {FormatDate(model.InvoiceDate)}");
                        column.Item().Text($"Förfallodatum: {FormatDate(model.DueDate)}");
                    });
                });
                page.Content().PaddingVertical(15).Column(column =>
                {
                    column.Item().Row(row =>
                    {
                        row.RelativeItem().Border(0.5f).Padding(7).Column(customer =>
                        {
                            customer.Item().Text("KUND").Bold();
                            foreach (var line in model.CustomerLines) customer.Item().Text(line);
                        });
                        row.ConstantItem(15);
                        row.RelativeItem().Border(0.5f).Padding(7).Column(reference =>
                        {
                            Detail(reference, "Vår referens", model.OurReference);
                            Detail(reference, "Er referens", model.YourReference);
                            Detail(reference, "Märkning", model.Marking);
                            Detail(reference, "Villkor", model.Terms);
                        });
                    });
                    column.Item().PaddingTop(15).Table(table =>
                    {
                        table.ColumnsDefinition(columns => { columns.ConstantColumn(55); columns.RelativeColumn(); columns.ConstantColumn(45); columns.ConstantColumn(65); columns.ConstantColumn(70); });
                        Header(table.Cell(), "Art.nr"); Header(table.Cell(), "Beskrivning"); Header(table.Cell(), "Antal", true); Header(table.Cell(), "Á-pris", true); Header(table.Cell(), "Summa", true);
                        foreach (var item in model.Rows)
                        {
                            Cell(table.Cell(), item.ArticleNumber); Cell(table.Cell(), item.Description); Cell(table.Cell(), FormatNumber(item.Quantity), true); Cell(table.Cell(), FormatMoney(item.UnitPrice), true); Cell(table.Cell(), FormatMoney(item.Amount), true);
                        }
                    });
                    column.Item().PaddingTop(10).AlignRight().Width(180).Column(totals =>
                    {
                        Total(totals, "Exkl. moms", model.Subtotal);
                        Total(totals, "Moms", model.Vat);
                        Total(totals, "Att betala", model.Total, true);
                    });
                    if (!string.IsNullOrWhiteSpace(model.Note)) column.Item().PaddingTop(12).Text(model.Note);
                });
                page.Footer().AlignCenter().Text(text => { text.Span(model.CompanyName); text.Span("  |  Sida "); text.CurrentPageNumber(); text.Span(" av "); text.TotalPages(); });
            });
        }

        private static void Header(IContainer container, string text, bool right = false) => (right ? container.AlignRight() : container).Background(Colors.Grey.Lighten2).Padding(4).Text(text).Bold();
        private static void Cell(IContainer container, string text, bool right = false) => (right ? container.AlignRight() : container).BorderBottom(0.25f).BorderColor(Colors.Grey.Lighten1).Padding(4).Text(text);
        private static void Detail(ColumnDescriptor column, string label, string value) { if (!string.IsNullOrWhiteSpace(value)) column.Item().Text($"{label}: {value}"); }
        private static void Total(ColumnDescriptor column, string label, decimal amount, bool bold = false) => column.Item().AlignRight().Text(text =>
        {
            text.Span($"{label}: ");
            var amountSpan = text.Span(FormatMoney(amount));
            if (bold)
            {
                amountSpan.Bold();
            }
        });
    }

    private static IReadOnlyList<string> Lines(params string?[] values) => values.Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value!.Trim()).ToList();
    private static string? First(params string?[] values) => values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
    private static string? PostalLine(string? zip, string? city) => First(zip, city) is null ? null : string.Join(" ", Lines(zip, city));
    private static string FormatDate(DateTime? date) => date?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty;
    private static string FormatMoney(decimal amount) => amount.ToString("N2", CultureInfo.GetCultureInfo("sv-SE"));
    private static string FormatNumber(decimal amount) => amount.ToString("0.##", CultureInfo.GetCultureInfo("sv-SE"));
}
