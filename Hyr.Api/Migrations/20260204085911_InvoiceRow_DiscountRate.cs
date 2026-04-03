using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class InvoiceRow_DiscountRate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DiscountRate",
                table: "InvoiceRow",
                type: "decimal(18,5)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DiscountRate",
                table: "InvoiceRow");
        }
    }
}
