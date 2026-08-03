using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class Reservation_PricingCalendarCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PricingCalendarCode",
                table: "Reservation",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "ALLDAYS");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PricingCalendarCode",
                table: "Reservation");
        }
    }
}
