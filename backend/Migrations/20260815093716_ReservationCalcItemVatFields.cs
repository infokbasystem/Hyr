using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class ReservationCalcItemVatFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "VatId",
                table: "ReservationCalcItem",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "VatRate",
                table: "ReservationCalcItem",
                type: "decimal(18,5)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReservationCalcItem_VatId",
                table: "ReservationCalcItem",
                column: "VatId");

            migrationBuilder.AddForeignKey(
                name: "FK_ReservationCalcItem_Vat_VatId",
                table: "ReservationCalcItem",
                column: "VatId",
                principalTable: "Vat",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReservationCalcItem_Vat_VatId",
                table: "ReservationCalcItem");

            migrationBuilder.DropIndex(
                name: "IX_ReservationCalcItem_VatId",
                table: "ReservationCalcItem");

            migrationBuilder.DropColumn(
                name: "VatId",
                table: "ReservationCalcItem");

            migrationBuilder.DropColumn(
                name: "VatRate",
                table: "ReservationCalcItem");
        }
    }
}
