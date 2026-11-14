using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class Office_DefaultPricingCalendarCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultPricingCalendarCode",
                table: "Office",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "ALLDAYS");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultPricingCalendarCode",
                table: "Office");
        }
    }
}
