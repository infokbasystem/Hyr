using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class ReservationCalcItem_CalcPriceTypeCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CalcPriceTypeCode",
                table: "ReservationCalcItem",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "FREETEXT");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CalcPriceTypeCode",
                table: "ReservationCalcItem");
        }
    }
}
