using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class Item_Cabin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "BookValue",
                table: "Item",
                type: "decimal(18,5)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CabinTypeCode",
                table: "Item",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DepreciationPeriodMonths",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DoorType",
                table: "Item",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ElectricalPhase",
                table: "Item",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "HasAirConditioning",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasCoffeeMaker",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasDistributionBoard",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasDryingCabinet",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasElectricRadiator",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasForkliftPockets",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasFridge",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasHeatPump",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasKitchenSink",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasLiftingEyes",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasLighting",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasLoadBearingRoof",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasMicrowave",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasResidualCurrentDevice",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasSink",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasUnderfloorHeating",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasVentilation",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasWaterHeater",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasWaterTank",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "HeightMm",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "InternalFloorAreaM2",
                table: "Item",
                type: "decimal(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "InternalHeightMm",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsInsulated",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsRentedIn",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsStackable",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsWinterRated",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "LengthMm",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LockType",
                table: "Item",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "MaxLoadKg",
                table: "Item",
                type: "decimal(10,5)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NrOfBenches",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NrOfChairs",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NrOfLockers",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NrOfModules",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NrOfSeats",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NrOfSockets",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NrOfTables",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NrOfWindows",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OwnerName",
                table: "Item",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PlacementRequirements",
                table: "Item",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PowerConnectionType",
                table: "Item",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "PurchaseDate",
                table: "Item",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PurchasePrice",
                table: "Item",
                type: "decimal(18,5)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RentedInAgreementRef",
                table: "Item",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "RentedInCostPerMonth",
                table: "Item",
                type: "decimal(18,5)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresSupportLegs",
                table: "Item",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ToiletType",
                table: "Item",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "WidthMm",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CabinType",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SortNr = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CabinType", x => x.Id);
                    table.UniqueConstraint("AK_CabinType_Code", x => x.Code);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Item_CabinTypeCode",
                table: "Item",
                column: "CabinTypeCode");

            migrationBuilder.AddForeignKey(
                name: "FK_Item_CabinType_CabinTypeCode",
                table: "Item",
                column: "CabinTypeCode",
                principalTable: "CabinType",
                principalColumn: "Code",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.InsertData(
                table: "CabinType",
                columns: new[] { "Code", "Name", "SortNr" },
                values: new object[,]
                {
                    { "OFFICE", "Kontorsbod", 1 },
                    { "DRYING", "Tork-/omklädningsbod", 2 },
                    { "SCAFFOLD", "Ställningsbod", 3 },
                    { "TOILET", "Toalettbod", 4 },
                    { "CANTEEN", "Matbod", 5 },
                    { "SANITARY", "Sanitetsbod", 6 },
                    { "COMBINATION", "Kombinationsbod", 7 }
                });

            // ItemType rows may have been added outside migrations, so avoid fixed Ids.
            migrationBuilder.Sql("IF NOT EXISTS (SELECT 1 FROM [ItemType] WHERE [Code] = 'CABIN') INSERT INTO [ItemType] ([Code], [Name]) VALUES ('CABIN', 'Cabin');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM [OfficeItemType] WHERE [ItemTypeId] IN (SELECT [Id] FROM [ItemType] WHERE [Code] = 'CABIN'); IF NOT EXISTS (SELECT 1 FROM [Item] WHERE [ItemTypeCode] = 'CABIN') DELETE FROM [ItemType] WHERE [Code] = 'CABIN';");

            migrationBuilder.DropForeignKey(
                name: "FK_Item_CabinType_CabinTypeCode",
                table: "Item");

            migrationBuilder.DropTable(
                name: "CabinType");

            migrationBuilder.DropIndex(
                name: "IX_Item_CabinTypeCode",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "BookValue",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "CabinTypeCode",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "DepreciationPeriodMonths",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "DoorType",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "ElectricalPhase",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasAirConditioning",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasCoffeeMaker",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasDistributionBoard",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasDryingCabinet",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasElectricRadiator",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasForkliftPockets",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasFridge",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasHeatPump",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasKitchenSink",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasLiftingEyes",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasLighting",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasLoadBearingRoof",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasMicrowave",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasResidualCurrentDevice",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasSink",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasUnderfloorHeating",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasVentilation",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasWaterHeater",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HasWaterTank",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "HeightMm",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "InternalFloorAreaM2",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "InternalHeightMm",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "IsInsulated",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "IsRentedIn",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "IsStackable",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "IsWinterRated",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "LengthMm",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "LockType",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "MaxLoadKg",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "NrOfBenches",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "NrOfChairs",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "NrOfLockers",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "NrOfModules",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "NrOfSeats",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "NrOfSockets",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "NrOfTables",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "NrOfWindows",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "OwnerName",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "PlacementRequirements",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "PowerConnectionType",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "PurchaseDate",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "PurchasePrice",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "RentedInAgreementRef",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "RentedInCostPerMonth",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "RequiresSupportLegs",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "ToiletType",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "WidthMm",
                table: "Item");
        }
    }
}
