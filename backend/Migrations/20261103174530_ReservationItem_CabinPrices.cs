using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class ReservationItem_CabinPrices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "BasePrice",
                table: "ReservationItem",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerDay",
                table: "ReservationItem",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerMonth",
                table: "ReservationItem",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerWeek",
                table: "ReservationItem",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE booking
                SET booking.BasePrice = cabin.BasePrice,
                    booking.PricePerDay = cabin.PricePerDay,
                    booking.PricePerWeek = cabin.PricePerWeek,
                    booking.PricePerMonth = cabin.PricePerMonth
                FROM ReservationItem AS booking
                INNER JOIN Item AS cabin ON cabin.Id = booking.ItemId AND cabin.OfficeId = booking.OfficeId
                WHERE booking.ItemTypeCode = 'CABIN' AND cabin.ItemTypeCode = 'CABIN';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BasePrice",
                table: "ReservationItem");

            migrationBuilder.DropColumn(
                name: "PricePerDay",
                table: "ReservationItem");

            migrationBuilder.DropColumn(
                name: "PricePerMonth",
                table: "ReservationItem");

            migrationBuilder.DropColumn(
                name: "PricePerWeek",
                table: "ReservationItem");
        }
    }
}
