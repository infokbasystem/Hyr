using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class Reservation_AddDriverPickupDeliveryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomerMarking",
                table: "Reservation",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DeliveryPlace",
                table: "Reservation",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DriverName",
                table: "Reservation",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PickUpBy",
                table: "Reservation",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TelephoneWorkplace",
                table: "Reservation",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomerMarking",
                table: "Reservation");

            migrationBuilder.DropColumn(
                name: "DeliveryPlace",
                table: "Reservation");

            migrationBuilder.DropColumn(
                name: "DriverName",
                table: "Reservation");

            migrationBuilder.DropColumn(
                name: "PickUpBy",
                table: "Reservation");

            migrationBuilder.DropColumn(
                name: "TelephoneWorkplace",
                table: "Reservation");
        }
    }
}
