using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class TinkPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TinkApiBaseUrl",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TinkClientId",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TinkClientSecret",
                table: "Office",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "TinkEnabled",
                table: "Office",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TinkLocale",
                table: "Office",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TinkMarket",
                table: "Office",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TinkPaymentScheme",
                table: "Office",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TinkRecipientAccountNumber",
                table: "Office",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TinkRecipientAccountType",
                table: "Office",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TinkRecipientName",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TinkRedirectUri",
                table: "Office",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "TinkPaymentRequest",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: false),
                    InvoiceId = table.Column<int>(type: "int", nullable: false),
                    TinkRequestId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,5)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Market = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    LinkUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StatusMessage = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    SentEmail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SentMobile = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SentDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PaymentId = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TinkPaymentRequest", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TinkPaymentRequest_Invoice_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoice",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TinkPaymentRequest_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TinkPaymentRequest_Payment_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "Payment",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TinkPaymentRequest_InvoiceId",
                table: "TinkPaymentRequest",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_TinkPaymentRequest_OfficeId",
                table: "TinkPaymentRequest",
                column: "OfficeId");

            migrationBuilder.CreateIndex(
                name: "IX_TinkPaymentRequest_PaymentId",
                table: "TinkPaymentRequest",
                column: "PaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_TinkPaymentRequest_TinkRequestId",
                table: "TinkPaymentRequest",
                column: "TinkRequestId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TinkPaymentRequest");

            migrationBuilder.DropColumn(
                name: "TinkApiBaseUrl",
                table: "Office");

            migrationBuilder.DropColumn(
                name: "TinkClientId",
                table: "Office");

            migrationBuilder.DropColumn(
                name: "TinkClientSecret",
                table: "Office");

            migrationBuilder.DropColumn(
                name: "TinkEnabled",
                table: "Office");

            migrationBuilder.DropColumn(
                name: "TinkLocale",
                table: "Office");

            migrationBuilder.DropColumn(
                name: "TinkMarket",
                table: "Office");

            migrationBuilder.DropColumn(
                name: "TinkPaymentScheme",
                table: "Office");

            migrationBuilder.DropColumn(
                name: "TinkRecipientAccountNumber",
                table: "Office");

            migrationBuilder.DropColumn(
                name: "TinkRecipientAccountType",
                table: "Office");

            migrationBuilder.DropColumn(
                name: "TinkRecipientName",
                table: "Office");

            migrationBuilder.DropColumn(
                name: "TinkRedirectUri",
                table: "Office");
        }
    }
}
