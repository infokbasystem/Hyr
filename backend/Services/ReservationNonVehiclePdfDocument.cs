using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using static Backend.Services.ReservationPdfLayout;

namespace Backend.Services;

public record ReservationNonVehiclePdfModel
{
    public required ReservationPdfIssuer Issuer { get; init; }

    public required string CustomerName { get; init; }
    public required string CustomerNr { get; init; }
    public required IReadOnlyList<string> AddressLines { get; init; }
    public required string Telephone { get; init; }
    public required string TelephoneWorkplace { get; init; }
    public required IReadOnlyList<string> DeliveryAddressLines { get; init; }
    public required string Marking { get; init; }

    public required string BookingDate { get; init; }
    public required string ReservationNr { get; init; }
    public required string BookedBy { get; init; }
    public required string Calendar { get; init; }
    public required string Note { get; init; }
    public required string Orderer { get; init; }
    public required string PickUpBy { get; init; }

    public required IReadOnlyList<NonVehicleItemLine> Items { get; init; }

    public required bool HasPriceCalculation { get; init; }
    public required IReadOnlyList<NonVehiclePriceLine> PriceLines { get; init; }
    public required decimal NetTotal { get; init; }
    public required decimal VatTotal { get; init; }
    public required decimal Rounding { get; init; }
    public required decimal Subtotal { get; init; }
    public required decimal DepositPaid { get; init; }
    public required decimal AmountToPay { get; init; }
}

public record NonVehicleItemLine
{
    public required string ItemTypeCode { get; init; }
    public required string Name { get; init; }
    public required string MachineNr { get; init; }
    public required string Category { get; init; }
    public required string RegNr { get; init; }
    public required string MeterOut { get; init; }
    public required string MeterIn { get; init; }
    public required string CabinType { get; init; }
    public required string CabinSize { get; init; }
    public required string RentFrom { get; init; }
    public required string RentTo { get; init; }
    public required string HandedOut { get; init; }
    public required string Returned { get; init; }
    public required string RentDays { get; init; }
    public required string DayRate { get; init; }
    public required string DeliveryPlace { get; init; }
    public required string PickupPlace { get; init; }
}

public record NonVehiclePriceLine(
    string Specification,
    string Text,
    string RentDays,
    string Qty,
    string BasePrice,
    decimal? UnitPrice,
    decimal Sum);

public class ReservationNonVehicleDocument(ReservationNonVehiclePdfModel model) : IDocument
{
    private static readonly (string Code, string Title, bool AsTable)[] Sections =
    [
        ("LIFT", "LIFT", false),
        ("CABIN", "BODAR", false),
        ("TOOL", "VERKTYG", true),
        ("ALU", "ALU", true),
        ("HAKI", "HAKI", true),
        ("ACCESSORY", "TILLBEHÖR", true),
    ];

    private const float LabelSize = 6.5f;
    private const float ValueSize = 7.5f;

    private readonly ReservationNonVehiclePdfModel _m = model;

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.MarginHorizontal(0, Unit.Millimetre);
            page.MarginTop(10, Unit.Millimetre);
            page.MarginBottom(0, Unit.Millimetre);
            page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(ValueSize).FontColor(Dark));

            page.Content().PaddingHorizontal(14, Unit.Millimetre).Column(col =>
            {
                col.Item().PaddingBottom(0).Element(c => ComposeHeader(c, _m.Issuer));
                col.Item().Element(ComposeGeneral);

                foreach (var section in Sections)
                {
                    var items = _m.Items.Where(i => i.ItemTypeCode == section.Code).ToList();
                    if (items.Count == 0)
                        continue;

                    col.Item().Element(c => ComposeItemSection(c, section.Title, items, section.AsTable));
                }

                col.Item().Element(ComposePricing);
                col.Item().ShowEntire().Element(ComposeClosing);
            });

            page.Footer().PaddingTop(5, Unit.Millimetre).Element(c => ComposeFooter(c, _m.Issuer));
        });
    }

    private static void LabelValue(IContainer container, string label, IEnumerable<string> lines)
    {
        container.Column(c =>
        {
            c.Item().PaddingBottom(2).Text(label).FontSize(LabelSize).FontColor(Grey);
            foreach (var line in lines)
                c.Item().Text(line).FontSize(ValueSize).Bold();
        });
    }

    private static void LabelValue(IContainer container, string label, string value) =>
        LabelValue(container, label, string.IsNullOrWhiteSpace(value) ? [] : [value]);

    private void ComposeGeneral(IContainer container)
    {
        container.Border(0.6f).BorderColor(Line).Row(row =>
        {
            row.RelativeItem().Padding(10).Column(c =>
            {
                c.Spacing(8);
                c.Item().Row(r =>
                {
                    r.RelativeItem().Element(x => LabelValue(x, "Hyresman", _m.CustomerName));
                    r.RelativeItem().Element(x => LabelValue(x, "Kundnr", _m.CustomerNr));
                });
                c.Item().Row(r =>
                {
                    r.RelativeItem().Element(x => LabelValue(x, "Adress", _m.AddressLines));
                    r.RelativeItem().Column(phones =>
                    {
                        phones.Spacing(8);
                        phones.Item().Element(x => LabelValue(x, "Telefon", _m.Telephone));
                        phones.Item().Element(x => LabelValue(x, "Telefon arbetsplats", _m.TelephoneWorkplace));
                    });
                });
                c.Item().Row(r =>
                {
                    r.RelativeItem().Element(x => LabelValue(x, "Leveransadress", _m.DeliveryAddressLines));
                    r.RelativeItem().Element(x => LabelValue(x, "Märkning", _m.Marking));
                });
            });

            row.ConstantItem(1).LineVertical(0.6f).LineColor(Line);

            row.RelativeItem().Padding(10).Column(c =>
            {
                c.Spacing(8);
                c.Item().Row(r =>
                {
                    r.RelativeItem().Element(x => LabelValue(x, "Bokningsdatum", _m.BookingDate));
                    r.RelativeItem().Element(x => LabelValue(x, "Bokningsnr", _m.ReservationNr));
                    r.RelativeItem().Element(x => LabelValue(x, "Bokad av", _m.BookedBy));
                });
                c.Item().Element(x => LabelValue(x, "Kalender", _m.Calendar));
                c.Item().MinHeight(30).Element(x => LabelValue(x, "Notering", _m.Note));
                c.Item().Row(r =>
                {
                    r.RelativeItem().Element(x => LabelValue(x, "Beställare", _m.Orderer));
                    r.RelativeItem().Element(x => LabelValue(x, "Hämtare", _m.PickUpBy));
                });
            });
        });
    }

    private static void ComposeSectionTitle(IContainer container, string title)
    {
        container.BorderBottom(0.6f).BorderColor(Line).PaddingTop(4).PaddingBottom(2).PaddingHorizontal(10)
            .Text(title).FontSize(8).Bold().LetterSpacing(0.12f).FontColor(Grey);
    }

    private void ComposeItemSection(IContainer container, string title, IReadOnlyList<NonVehicleItemLine> items, bool asTable)
    {
        container.Border(0.6f).BorderColor(Line).Column(c =>
        {
            c.Item().Element(x => ComposeSectionTitle(x, title));

            if (asTable)
            {
                c.Item().Element(x => ComposeItemTable(x, items));
                return;
            }

            for (var i = 0; i < items.Count; i++)
            {
                var item = items[i];
                var block = c.Item().ShowEntire();
                if (i > 0)
                    block = block.BorderTop(0.6f).BorderColor(Line);
                block.Element(x => ComposeItemBlock(x, item));
            }
        });
    }

    private static void InlinePair(ColumnDescriptor column, string label, string value, float labelWidth)
    {
        column.Item().Row(r =>
        {
            r.ConstantItem(labelWidth).Text(label).FontSize(ValueSize).FontColor(Grey);
            r.RelativeItem().Text(value).FontSize(ValueSize);
        });
    }

    private static void ComposeItemBlock(IContainer container, NonVehicleItemLine item)
    {
        var isCabin = item.ItemTypeCode == "CABIN";

        container.PaddingHorizontal(10).PaddingVertical(6).Column(outer =>
        {
            outer.Item().Row(row =>
            {
                row.RelativeItem(2.0f).Column(c =>
                {
                    c.Spacing(3);
                    InlinePair(c, "Benämn.", item.Name, 52);
                    InlinePair(c, "Maskinnr", item.MachineNr, 52);
                    InlinePair(c, "Kategori", item.Category, 52);
                    if (!string.IsNullOrWhiteSpace(item.RegNr))
                        InlinePair(c, "Regnr", item.RegNr, 52);
                });

                row.RelativeItem(1.9f).Column(c =>
                {
                    c.Spacing(3);
                    if (isCabin)
                    {
                        if (!string.IsNullOrWhiteSpace(item.CabinType))
                            InlinePair(c, "Bodtyp", item.CabinType, 50);
                        if (!string.IsNullOrWhiteSpace(item.CabinSize))
                            InlinePair(c, "Storlek", item.CabinSize, 50);
                    }
                    else
                    {
                        InlinePair(c, "Mätarst. ut", item.MeterOut, 50);
                        InlinePair(c, "Mätarst. in", item.MeterIn, 50);
                    }
                });

                row.RelativeItem(1.8f).Column(c =>
                {
                    c.Spacing(3);
                    InlinePair(c, "Hyra fom", item.RentFrom, 50);
                    InlinePair(c, "Hyra tom", item.RentTo, 50);
                    InlinePair(c, "Utlämn.", item.HandedOut, 50);
                    InlinePair(c, "Återl.", item.Returned, 50);
                });

                row.RelativeItem(1.3f).Column(c =>
                {
                    c.Spacing(3);
                    InlinePair(c, "Hyrdagar", item.RentDays, 48);
                    InlinePair(c, "Dagshyra", item.DayRate, 48);
                });
            });

            if (!string.IsNullOrWhiteSpace(item.DeliveryPlace) || !string.IsNullOrWhiteSpace(item.PickupPlace))
            {
                outer.Item().PaddingTop(3).Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        if (!string.IsNullOrWhiteSpace(item.DeliveryPlace))
                            InlinePair(c, "Lämningsplats", item.DeliveryPlace, 70);
                    });
                    row.RelativeItem().Column(c =>
                    {
                        if (!string.IsNullOrWhiteSpace(item.PickupPlace))
                            InlinePair(c, "Hämtningsplats", item.PickupPlace, 70);
                    });
                });
            }
        });
    }

    private static void ComposeItemTable(IContainer container, IReadOnlyList<NonVehicleItemLine> items)
    {
        container.PaddingHorizontal(10).PaddingVertical(6).Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.RelativeColumn(2.6f);
                columns.RelativeColumn(1.2f);
                columns.RelativeColumn(1.4f);
                columns.RelativeColumn(1.2f);
                columns.RelativeColumn(1.2f);
                columns.RelativeColumn(0.9f);
                columns.RelativeColumn(0.9f);
            });

            table.Header(header =>
            {
                static IContainer HeaderCell(IContainer c) => c.BorderBottom(0.6f).BorderColor(Line).PaddingBottom(3);

                header.Cell().Element(HeaderCell).Text("Specifikation").FontColor(Grey);
                header.Cell().Element(HeaderCell).Text("Maskinnr").FontColor(Grey);
                header.Cell().Element(HeaderCell).Text("Kategori").FontColor(Grey);
                header.Cell().Element(HeaderCell).Text("Från").FontColor(Grey);
                header.Cell().Element(HeaderCell).Text("Till").FontColor(Grey);
                header.Cell().Element(HeaderCell).AlignRight().Text("Hyrdagar").FontColor(Grey);
                header.Cell().Element(HeaderCell).AlignRight().Text("Hyra").FontColor(Grey);
            });

            foreach (var item in items)
            {
                table.Cell().PaddingTop(4).Text(item.Name);
                table.Cell().PaddingTop(4).Text(item.MachineNr);
                table.Cell().PaddingTop(4).Text(item.Category);
                table.Cell().PaddingTop(4).Text(item.RentFrom);
                table.Cell().PaddingTop(4).Text(item.RentTo);
                table.Cell().PaddingTop(4).AlignRight().Text(item.RentDays);
                table.Cell().PaddingTop(4).AlignRight().Text(item.DayRate);
            }
        });
    }

    private void ComposePricing(IContainer container)
    {
        container.Border(0.6f).BorderColor(Line).Column(c =>
        {
            c.Item().Element(x => ComposeSectionTitle(x, "PRISBERÄKNING"));

            if (!_m.HasPriceCalculation)
            {
                c.Item().Padding(10).Text("Prisberäkning ej gjord");
                return;
            }

            c.Item().PaddingHorizontal(10).PaddingVertical(6).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(2.2f);
                    columns.RelativeColumn(2.8f);
                    columns.RelativeColumn(0.9f);
                    columns.RelativeColumn(0.7f);
                    columns.RelativeColumn(1.0f);
                    columns.RelativeColumn(1.1f);
                    columns.RelativeColumn(1.2f);
                });

                static IContainer HeaderCell(IContainer c) => c.BorderBottom(0.6f).BorderColor(Line).PaddingBottom(3);
                static IContainer BodyCell(IContainer c) => c.BorderBottom(0.4f).BorderColor(Line).PaddingVertical(4);

                table.Header(header =>
                {
                    header.Cell().Element(HeaderCell).Text("Specifikation").FontColor(Grey);
                    header.Cell().Element(HeaderCell).Text("");
                    header.Cell().Element(HeaderCell).AlignRight().Text("Hyrdagar").FontColor(Grey);
                    header.Cell().Element(HeaderCell).AlignRight().Text("Antal").FontColor(Grey);
                    header.Cell().Element(HeaderCell).AlignRight().Text("Grundpris").FontColor(Grey);
                    header.Cell().Element(HeaderCell).AlignRight().Text("á-pris").FontColor(Grey);
                    header.Cell().Element(HeaderCell).AlignRight().Text("Summa").FontColor(Grey);
                });

                foreach (var line in _m.PriceLines)
                {
                    table.Cell().Element(BodyCell).Text(line.Specification);
                    table.Cell().Element(BodyCell).Text(line.Text);
                    table.Cell().Element(BodyCell).AlignRight().Text(line.RentDays);
                    table.Cell().Element(BodyCell).AlignRight().Text(line.Qty);
                    table.Cell().Element(BodyCell).AlignRight().Text(line.BasePrice);
                    table.Cell().Element(BodyCell).AlignRight().Text(line.UnitPrice is { } unitPrice ? $"{unitPrice:N2}" : "");
                    table.Cell().Element(BodyCell).AlignRight().Text($"{line.Sum:N2}");
                }
            });
        });
    }

    private static void AmountRow(ColumnDescriptor column, string label, decimal amount, bool bold = false)
    {
        column.Item().Row(r =>
        {
            var labelText = r.RelativeItem().Text(label);
            var amountText = r.ConstantItem(90).AlignRight().Text($"{amount:N2}");
            if (bold)
            {
                labelText.Bold();
                amountText.Bold();
            }
        });
    }

    private void ComposeClosing(IContainer container)
    {
        container.Border(0.6f).BorderColor(Line).Row(row =>
        {
            row.RelativeItem().Padding(10).Column(c =>
            {
                c.Spacing(4);
                AmountRow(c, "Kostnad på kontrakt", _m.NetTotal);
                AmountRow(c, "Moms", _m.VatTotal);
                AmountRow(c, "Öresutjämning", _m.Rounding);
                c.Item().PaddingVertical(4).LineHorizontal(0.6f).LineColor(Line);
                AmountRow(c, "Delsumma", _m.Subtotal, bold: true);
                c.Item().Row(r =>
                {
                    r.RelativeItem().Text("Deponerat belopp");
                    r.ConstantItem(90).AlignRight().Text($"{_m.DepositPaid:N2}");
                    r.ConstantItem(30).AlignRight().Text("sign.");
                });
                c.Item().PaddingVertical(4).LineHorizontal(0.6f).LineColor(Line);
                AmountRow(c, "Att betala / återfå", _m.AmountToPay, bold: true);
                c.Item().PaddingTop(12).Text("Ovanstående belopp kvitteras");
                c.Item().PaddingTop(22).LineHorizontal(0.6f).LineColor(Grey);
                c.Item().Row(r =>
                {
                    r.RelativeItem().Text("Namn");
                    r.RelativeItem().Text("Datum");
                });
            });

            row.ConstantItem(1).LineVertical(0.6f).LineColor(Line);

            row.RelativeItem().Column(c =>
            {
                c.Item().Padding(10).Column(sign =>
                {
                    sign.Item().Text("Ovanstående mottaget och undertecknad förklarar sig införstådd med och godkänner de ALLMÄNNA HYRESVILLKOREN på omstående sida.")
                        .LineHeight(1.3f);
                    sign.Item().PaddingTop(40).Row(r =>
                    {
                        r.RelativeItem(3).LineHorizontal(0.6f).LineColor(Grey);
                        r.ConstantItem(8);
                        r.RelativeItem(2).LineHorizontal(0.6f).LineColor(Grey);
                    });
                    sign.Item().PaddingTop(2).DefaultTextStyle(x => x.FontSize(LabelSize)).Row(r =>
                    {
                        r.RelativeItem().Text("Kundens underskrift");
                        r.RelativeItem().Text("Datum");
                        r.AutoItem().Text("Legitimation");
                        r.AutoItem().PaddingLeft(6).Text("KK");
                        r.AutoItem().PaddingLeft(2).Width(9).Height(9).Border(0.6f).BorderColor(Dark);
                        r.AutoItem().PaddingLeft(6).Text("Känd");
                        r.AutoItem().PaddingLeft(2).Width(9).Height(9).Border(0.6f).BorderColor(Dark);
                    });
                });

                c.Item().BorderTop(0.6f).BorderColor(Line).Padding(10).Column(returned =>
                {
                    returned.Item().Text("Följande delar saknas eller var skadade när vi fick materielen i retur.");
                    returned.Item().PaddingTop(40).Row(r =>
                    {
                        r.AutoItem().Text("Utlämnad av");
                        r.RelativeItem().PaddingHorizontal(4).AlignBottom().LineHorizontal(0.6f).LineColor(Grey);
                        r.AutoItem().Text("sign");
                        r.ConstantItem(16);
                        r.AutoItem().Text("Mottagen av");
                        r.RelativeItem().PaddingHorizontal(4).AlignBottom().LineHorizontal(0.6f).LineColor(Grey);
                        r.AutoItem().Text("sign");
                    });
                });
            });
        });
    }
}
