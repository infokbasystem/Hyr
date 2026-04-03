using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class Reservation_ReservationCalc_Relationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReservationCalc_Reservation_ReservationId",
                table: "ReservationCalc");

            migrationBuilder.AddForeignKey(
                name: "FK_ReservationCalc_Reservation_ReservationId",
                table: "ReservationCalc",
                column: "ReservationId",
                principalTable: "Reservation",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReservationCalc_Reservation_ReservationId",
                table: "ReservationCalc");

            migrationBuilder.AddForeignKey(
                name: "FK_ReservationCalc_Reservation_ReservationId",
                table: "ReservationCalc",
                column: "ReservationId",
                principalTable: "Reservation",
                principalColumn: "Id");
        }
    }
}
