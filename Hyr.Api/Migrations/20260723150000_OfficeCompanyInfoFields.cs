using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(Hyr.Api.Data.ApplicationDbContext))]
    [Migration("20260723150000_OfficeCompanyInfoFields")]
    public partial class OfficeCompanyInfoFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Bank",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BankAccountNr",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BgNr",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CrediflowId",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DeductibleReductionText",
                table: "Office",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "DefaultPaymentDays",
                table: "Office",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EmergencyNumber",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FaxNr",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "GeneralContractText",
                table: "Office",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "GlnNr",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Iban",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "InvoiceFee",
                table: "Office",
                type: "decimal(18,5)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MobilePhone",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "OrganizationNr",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PgNr",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Street",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SwiftBic",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Telephone",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "LatePaymentInterest",
                table: "Office",
                type: "decimal(18,5)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VatNr",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VatRegCity",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VatRegText",
                table: "Office",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "ViewContractPricesOnPrint",
                table: "Office",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Web",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ZipCode",
                table: "Office",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Bank", table: "Office");
            migrationBuilder.DropColumn(name: "BankAccountNr", table: "Office");
            migrationBuilder.DropColumn(name: "BgNr", table: "Office");
            migrationBuilder.DropColumn(name: "City", table: "Office");
            migrationBuilder.DropColumn(name: "Country", table: "Office");
            migrationBuilder.DropColumn(name: "CrediflowId", table: "Office");
            migrationBuilder.DropColumn(name: "DeductibleReductionText", table: "Office");
            migrationBuilder.DropColumn(name: "DefaultPaymentDays", table: "Office");
            migrationBuilder.DropColumn(name: "Email", table: "Office");
            migrationBuilder.DropColumn(name: "EmergencyNumber", table: "Office");
            migrationBuilder.DropColumn(name: "FaxNr", table: "Office");
            migrationBuilder.DropColumn(name: "GeneralContractText", table: "Office");
            migrationBuilder.DropColumn(name: "GlnNr", table: "Office");
            migrationBuilder.DropColumn(name: "Iban", table: "Office");
            migrationBuilder.DropColumn(name: "InvoiceFee", table: "Office");
            migrationBuilder.DropColumn(name: "MobilePhone", table: "Office");
            migrationBuilder.DropColumn(name: "OrganizationNr", table: "Office");
            migrationBuilder.DropColumn(name: "PgNr", table: "Office");
            migrationBuilder.DropColumn(name: "Street", table: "Office");
            migrationBuilder.DropColumn(name: "SwiftBic", table: "Office");
            migrationBuilder.DropColumn(name: "Telephone", table: "Office");
            migrationBuilder.DropColumn(name: "LatePaymentInterest", table: "Office");
            migrationBuilder.DropColumn(name: "VatNr", table: "Office");
            migrationBuilder.DropColumn(name: "VatRegCity", table: "Office");
            migrationBuilder.DropColumn(name: "VatRegText", table: "Office");
            migrationBuilder.DropColumn(name: "ViewContractPricesOnPrint", table: "Office");
            migrationBuilder.DropColumn(name: "Web", table: "Office");
            migrationBuilder.DropColumn(name: "ZipCode", table: "Office");
        }
    }
}