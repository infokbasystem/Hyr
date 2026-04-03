using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Office",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    FortnoxAccessToken = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FortnoxRefreshToken = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    FortnoxTokenCreated = table.Column<DateTime>(type: "datetime2", nullable: true),
                    FortnoxTokenExpiresInSeconds = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Office", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PriceList",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceList", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "User",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastLogin = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_User", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Customer",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: true),
                    CustomerNr = table.Column<int>(type: "int", nullable: true),
                    CustomerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    OrgNr = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    VatNr = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Street1 = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Street2 = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ZipCode = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    City = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Telephone = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    MobilePhone = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NrOfInvoiceDays = table.Column<int>(type: "int", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    CreditLimit = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    ImportId = table.Column<int>(type: "int", nullable: true),
                    ImportSource = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    KeySpcs = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    KeyFortnox = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    KeyWinassist = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    RegNr = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsCompany = table.Column<bool>(type: "bit", nullable: false),
                    VatRegisterd = table.Column<bool>(type: "bit", nullable: false),
                    PgNr = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    BgNr = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EfakturaAddresseeIntermediator = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EfakturaAddresseeID = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EfakturaAddresseeIDType = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EfakturaBankCode = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EfakturaBankId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EfakturaBankName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EfakturaVatHomeTown = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EfakturaVatRegistration = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CrediflowPartyId = table.Column<int>(type: "int", nullable: true),
                    GLNnr = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customer", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Customer_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Item",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: false),
                    ItemTypeCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ItemCategoryId = table.Column<int>(type: "int", nullable: true),
                    ItemModelId = table.Column<int>(type: "int", nullable: true),
                    RegNr = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    YearModel = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Item", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Item_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Invoice",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: true),
                    InvoiceNr = table.Column<int>(type: "int", nullable: true),
                    InvoiceDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AccountedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    InvoiceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    InvoicePayMethod = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NrOfInvoiceDays = table.Column<int>(type: "int", nullable: true),
                    CreditingInvoiceId = table.Column<int>(type: "int", nullable: true),
                    CustomerId = table.Column<int>(type: "int", nullable: true),
                    CustomerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CustomerReference = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    VatNr = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    OrgNr = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Street1 = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Street2 = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ZipCode = table.Column<int>(type: "int", maxLength: 50, nullable: true),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    OurReference = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    YourReference = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AccountNr = table.Column<int>(type: "int", nullable: true),
                    AccountNrVat = table.Column<int>(type: "int", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsCancelled = table.Column<bool>(type: "bit", nullable: false),
                    IsSettled = table.Column<bool>(type: "bit", nullable: false),
                    IsOkForAccounting = table.Column<bool>(type: "bit", nullable: false),
                    IsPrinted = table.Column<bool>(type: "bit", nullable: false),
                    IsEmailed = table.Column<bool>(type: "bit", nullable: false),
                    IsEInvoiced = table.Column<bool>(type: "bit", nullable: false),
                    TermsOfPayment = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Marking = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    InvoiceFee = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    CurrencyRate = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    CurrencyId = table.Column<int>(type: "int", nullable: true),
                    PdfName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TotExVat = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    TotVat = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    TotSum = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    Rounding = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    ExportResult = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CrediflowSessionId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invoice", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Invoice_Customer_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Invoice_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Reservation",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: true),
                    ReservationNr = table.Column<int>(type: "int", nullable: true),
                    CustomerId = table.Column<int>(type: "int", nullable: true),
                    StatusCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DriverMobilePhone = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DriverNote = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    DriverLicenceNr = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DriverLicenceExpireDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Orderer = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ZipCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    MobilePhone = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Reference = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Deposition = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    DeliveryPlaceNote = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    PickupPlaceNote = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    IsOngoingInvoicing = table.Column<bool>(type: "bit", nullable: false),
                    OngoingInvoicingInterval = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reservation", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reservation_Customer_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Reservation_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReservationCalc",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: true),
                    ReservationId = table.Column<int>(type: "int", nullable: true),
                    DateTimeFrom = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateTimeTo = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReservationCalc", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReservationCalc_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReservationCalc_Reservation_ReservationId",
                        column: x => x.ReservationId,
                        principalTable: "Reservation",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ReservationItem",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: true),
                    ReservationId = table.Column<int>(type: "int", nullable: true),
                    SortNr = table.Column<int>(type: "int", nullable: true),
                    ItemTypeCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: true),
                    BookedFrom = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BookedTo = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualFrom = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualTo = table.Column<DateTime>(type: "datetime2", nullable: true),
                    KmOut = table.Column<int>(type: "int", nullable: true),
                    KmIn = table.Column<int>(type: "int", nullable: true),
                    FuelLitres = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    FuelUnitPrice = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    DebitCategoryId = table.Column<int>(type: "int", nullable: true),
                    IsCheckedIn = table.Column<bool>(type: "bit", nullable: false),
                    EvProlonging = table.Column<bool>(type: "bit", nullable: false),
                    AbroadOk = table.Column<bool>(type: "bit", nullable: false),
                    NotRebookable = table.Column<bool>(type: "bit", nullable: false),
                    DeliveryPlaceNote = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    PickupPlaceNote = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    IsInsurance = table.Column<bool>(type: "bit", nullable: false),
                    InsuranceCompanyId = table.Column<int>(type: "int", nullable: true),
                    InsuranceCustomerIsCause = table.Column<bool>(type: "bit", nullable: false),
                    InsuranceDamageNr = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    InsuranceDamageDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    InsuranceMaxAllowedCompensationCost = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    InsuranceMaxAllowedCompensationDays = table.Column<int>(type: "int", nullable: true),
                    InsuranceCustomerRegNr = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    InsuranceCounterpartRegNr = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    InsuranceIsSjalvriskReduction = table.Column<bool>(type: "bit", nullable: false),
                    InsuranceSjalvriskDayCost = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    InsuranceIsManualCalc = table.Column<bool>(type: "bit", nullable: false),
                    InsuranceManualCalcPercentSek = table.Column<int>(type: "int", nullable: true),
                    InsuranceManulaMaxCompensationCost = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    InsuranceManualMaxCompensationDays = table.Column<int>(type: "int", nullable: true),
                    InsuranceManualShareRent = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    InsuranceManualShareKm = table.Column<int>(type: "int", nullable: true),
                    InsuranceManualShareVat = table.Column<decimal>(type: "decimal(18,5)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReservationItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReservationItem_Item_ItemId",
                        column: x => x.ItemId,
                        principalTable: "Item",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReservationItem_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReservationItem_Reservation_ReservationId",
                        column: x => x.ReservationId,
                        principalTable: "Reservation",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReservationCalcItem",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: true),
                    ReservationCalcId = table.Column<int>(type: "int", nullable: true),
                    ItemId = table.Column<int>(type: "int", nullable: true),
                    PriceListId = table.Column<int>(type: "int", nullable: true),
                    Text = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Qty = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    Sum = table.Column<decimal>(type: "decimal(18,5)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReservationCalcItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReservationCalcItem_Item_ItemId",
                        column: x => x.ItemId,
                        principalTable: "Item",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ReservationCalcItem_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReservationCalcItem_PriceList_PriceListId",
                        column: x => x.PriceListId,
                        principalTable: "PriceList",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ReservationCalcItem_ReservationCalc_ReservationCalcId",
                        column: x => x.ReservationCalcId,
                        principalTable: "ReservationCalc",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InvoiceRow",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: true),
                    InvoiceId = table.Column<int>(type: "int", nullable: true),
                    ItemId = table.Column<int>(type: "int", nullable: true),
                    ReservationCalcItemId = table.Column<int>(type: "int", nullable: true),
                    SortNr = table.Column<int>(type: "int", nullable: true),
                    ArticleId = table.Column<int>(type: "int", nullable: true),
                    ArticleNr = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    InvoiceRowType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Text1 = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Text2 = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Qty = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    Sum = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    VatRate = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    AccountNr = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvoiceRow", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InvoiceRow_Invoice_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoice",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InvoiceRow_Item_ItemId",
                        column: x => x.ItemId,
                        principalTable: "Item",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InvoiceRow_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InvoiceRow_ReservationCalcItem_ReservationCalcItemId",
                        column: x => x.ReservationCalcItemId,
                        principalTable: "ReservationCalcItem",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Customer_OfficeId",
                table: "Customer",
                column: "OfficeId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoice_CustomerId",
                table: "Invoice",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoice_OfficeId",
                table: "Invoice",
                column: "OfficeId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceRow_InvoiceId",
                table: "InvoiceRow",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceRow_ItemId",
                table: "InvoiceRow",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceRow_OfficeId",
                table: "InvoiceRow",
                column: "OfficeId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceRow_ReservationCalcItemId",
                table: "InvoiceRow",
                column: "ReservationCalcItemId");

            migrationBuilder.CreateIndex(
                name: "IX_Item_OfficeId",
                table: "Item",
                column: "OfficeId");

            migrationBuilder.CreateIndex(
                name: "IX_Reservation_CustomerId",
                table: "Reservation",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Reservation_OfficeId",
                table: "Reservation",
                column: "OfficeId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationCalc_OfficeId",
                table: "ReservationCalc",
                column: "OfficeId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationCalc_ReservationId",
                table: "ReservationCalc",
                column: "ReservationId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationCalcItem_ItemId",
                table: "ReservationCalcItem",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationCalcItem_OfficeId",
                table: "ReservationCalcItem",
                column: "OfficeId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationCalcItem_PriceListId",
                table: "ReservationCalcItem",
                column: "PriceListId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationCalcItem_ReservationCalcId",
                table: "ReservationCalcItem",
                column: "ReservationCalcId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationItem_ItemId",
                table: "ReservationItem",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationItem_OfficeId",
                table: "ReservationItem",
                column: "OfficeId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationItem_ReservationId",
                table: "ReservationItem",
                column: "ReservationId");

            migrationBuilder.CreateIndex(
                name: "IX_User_Email",
                table: "User",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InvoiceRow");

            migrationBuilder.DropTable(
                name: "ReservationItem");

            migrationBuilder.DropTable(
                name: "User");

            migrationBuilder.DropTable(
                name: "Invoice");

            migrationBuilder.DropTable(
                name: "ReservationCalcItem");

            migrationBuilder.DropTable(
                name: "Item");

            migrationBuilder.DropTable(
                name: "PriceList");

            migrationBuilder.DropTable(
                name: "ReservationCalc");

            migrationBuilder.DropTable(
                name: "Reservation");

            migrationBuilder.DropTable(
                name: "Customer");

            migrationBuilder.DropTable(
                name: "Office");
        }
    }
}
