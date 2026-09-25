using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class FortnoxPaymentSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AmountCurrency",
                table: "Payment",
                type: "decimal(18,5)",
                precision: 18,
                scale: 5,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Booked",
                table: "Payment",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Payment",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CurrencyRate",
                table: "Payment",
                type: "decimal(18,6)",
                precision: 18,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CurrencyUnit",
                table: "Payment",
                type: "decimal(18,6)",
                precision: 18,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FortnoxInvoiceNumber",
                table: "Payment",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FortnoxPaymentNumber",
                table: "Payment",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FortnoxSource",
                table: "Payment",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SyncedAtUtc",
                table: "Payment",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "IntegrationSchedule",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: false),
                    Integration = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Variable = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntegrationSchedule", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IntegrationSchedule_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Payment_OfficeId_FortnoxInvoiceNumber",
                table: "Payment",
                columns: new[] { "OfficeId", "FortnoxInvoiceNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_Payment_OfficeId_FortnoxPaymentNumber",
                table: "Payment",
                columns: new[] { "OfficeId", "FortnoxPaymentNumber" },
                unique: true,
                filter: "[FortnoxPaymentNumber] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Payment_OfficeId_InvoiceId",
                table: "Payment",
                columns: new[] { "OfficeId", "InvoiceId" });

            migrationBuilder.CreateIndex(
                name: "IX_IntegrationSchedule_OfficeId_Integration_Variable",
                table: "IntegrationSchedule",
                columns: new[] { "OfficeId", "Integration", "Variable" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IntegrationSchedule");

            migrationBuilder.DropIndex(
                name: "IX_Payment_OfficeId_FortnoxInvoiceNumber",
                table: "Payment");

            migrationBuilder.DropIndex(
                name: "IX_Payment_OfficeId_FortnoxPaymentNumber",
                table: "Payment");

            migrationBuilder.DropIndex(
                name: "IX_Payment_OfficeId_InvoiceId",
                table: "Payment");

            migrationBuilder.DropColumn(
                name: "AmountCurrency",
                table: "Payment");

            migrationBuilder.DropColumn(
                name: "Booked",
                table: "Payment");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Payment");

            migrationBuilder.DropColumn(
                name: "CurrencyRate",
                table: "Payment");

            migrationBuilder.DropColumn(
                name: "CurrencyUnit",
                table: "Payment");

            migrationBuilder.DropColumn(
                name: "FortnoxInvoiceNumber",
                table: "Payment");

            migrationBuilder.DropColumn(
                name: "FortnoxPaymentNumber",
                table: "Payment");

            migrationBuilder.DropColumn(
                name: "FortnoxSource",
                table: "Payment");

            migrationBuilder.DropColumn(
                name: "SyncedAtUtc",
                table: "Payment");
        }
    }
}
