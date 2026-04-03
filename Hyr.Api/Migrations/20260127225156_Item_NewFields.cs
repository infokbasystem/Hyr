using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class Item_NewFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "MachineNr",
                table: "Item",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "AccountNr",
                table: "Item",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "BasePrice",
                table: "Item",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CostCenterNr",
                table: "Item",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "HourMeter",
                table: "Item",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ImportId",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImportSource",
                table: "Item",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsStorageItem",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ItemNr",
                table: "Item",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "KmReading",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Manufacturer",
                table: "Item",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "NrOfItemsTotal",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PlatformHeightMm",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PlatformLengthMm",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PopupText",
                table: "Item",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerDay",
                table: "Item",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerHour",
                table: "Item",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerKm",
                table: "Item",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerMonth",
                table: "Item",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerWeek",
                table: "Item",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ReplacementCost",
                table: "Item",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "UnavailableForReservation",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UnavailableFrom",
                table: "Item",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UnavailableReason",
                table: "Item",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UnavailableTo",
                table: "Item",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "WeightKg",
                table: "Item",
                type: "decimal(10,5)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccountNr",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "BasePrice",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "CostCenterNr",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HourMeter",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "ImportId",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "ImportSource",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "IsStorageItem",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "ItemNr",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "KmReading",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "Manufacturer",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "NrOfItemsTotal",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "PlatformHeightMm",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "PlatformLengthMm",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "PopupText",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "PricePerDay",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "PricePerHour",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "PricePerKm",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "PricePerMonth",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "PricePerWeek",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "ReplacementCost",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "UnavailableForReservation",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "UnavailableFrom",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "UnavailableReason",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "UnavailableTo",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "WeightKg",
                table: "Item");

            migrationBuilder.AlterColumn<string>(
                name: "MachineNr",
                table: "Item",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);
        }
    }
}
