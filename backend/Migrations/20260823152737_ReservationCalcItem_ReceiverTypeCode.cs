using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class ReservationCalcItem_ReceiverTypeCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReceiverTypeCode",
                table: "ReservationCalcItem",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "CUSTOMER");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReceiverTypeCode",
                table: "ReservationCalcItem");
        }
    }
}
