using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class Reservation_PlacementLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PlacementCity",
                table: "Reservation",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "PlacementLatitude",
                table: "Reservation",
                type: "decimal(9,6)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PlacementLongitude",
                table: "Reservation",
                type: "decimal(9,6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlacementStreet",
                table: "Reservation",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PlacementZipCode",
                table: "Reservation",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlacementCity",
                table: "Reservation");

            migrationBuilder.DropColumn(
                name: "PlacementLatitude",
                table: "Reservation");

            migrationBuilder.DropColumn(
                name: "PlacementLongitude",
                table: "Reservation");

            migrationBuilder.DropColumn(
                name: "PlacementStreet",
                table: "Reservation");

            migrationBuilder.DropColumn(
                name: "PlacementZipCode",
                table: "Reservation");
        }
    }
}
