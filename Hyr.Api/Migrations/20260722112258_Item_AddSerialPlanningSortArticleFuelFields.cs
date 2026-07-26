using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class Item_AddSerialPlanningSortArticleFuelFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ArticleNr",
                table: "Item",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "FuelConsumptionLitresPerHour",
                table: "Item",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FuelConsumptionLitresPerKm",
                table: "Item",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SerialNr",
                table: "Item",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "ShowInPlanning",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "SortNr",
                table: "Item",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArticleNr",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "FuelConsumptionLitresPerHour",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "FuelConsumptionLitresPerKm",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "SerialNr",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "ShowInPlanning",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "SortNr",
                table: "Item");
        }
    }
}
