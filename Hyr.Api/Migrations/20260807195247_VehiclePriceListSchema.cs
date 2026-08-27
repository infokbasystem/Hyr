using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class VehiclePriceListSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReservationCalcItem_Item_ItemId",
                table: "ReservationCalcItem");

            migrationBuilder.DropForeignKey(
                name: "FK_ReservationCalcItem_PriceList_PriceListId",
                table: "ReservationCalcItem");

            migrationBuilder.AddColumn<int>(
                name: "PriceListId",
                table: "Reservation",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "PriceList",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "PriceList",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CreatedBy",
                table: "PriceList",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "PriceList",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "PriceList",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "OfficeId",
                table: "PriceList",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Priority",
                table: "PriceList",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "PriceList",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UpdatedBy",
                table: "PriceList",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ValidFrom",
                table: "PriceList",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ValidTo",
                table: "PriceList",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DefaultPriceListId",
                table: "Customer",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PriceListDayPrice",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PriceListId = table.Column<int>(type: "int", nullable: true),
                    ItemCategoryId = table.Column<int>(type: "int", nullable: true),
                    PricePerDay = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    PricePerKm = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceListDayPrice", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceListDayPrice_ItemCategory_ItemCategoryId",
                        column: x => x.ItemCategoryId,
                        principalTable: "ItemCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PriceListDayPrice_PriceList_PriceListId",
                        column: x => x.PriceListId,
                        principalTable: "PriceList",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PriceListDayPriceFreeKm",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PriceListId = table.Column<int>(type: "int", nullable: true),
                    ItemCategoryId = table.Column<int>(type: "int", nullable: true),
                    PricePerDay = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceListDayPriceFreeKm", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceListDayPriceFreeKm_ItemCategory_ItemCategoryId",
                        column: x => x.ItemCategoryId,
                        principalTable: "ItemCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PriceListDayPriceFreeKm_PriceList_PriceListId",
                        column: x => x.PriceListId,
                        principalTable: "PriceList",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PriceListGuaranteePrice",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PriceListId = table.Column<int>(type: "int", nullable: true),
                    ItemCategoryId = table.Column<int>(type: "int", nullable: true),
                    PricePerGuaranteeDay = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceListGuaranteePrice", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceListGuaranteePrice_ItemCategory_ItemCategoryId",
                        column: x => x.ItemCategoryId,
                        principalTable: "ItemCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PriceListGuaranteePrice_PriceList_PriceListId",
                        column: x => x.PriceListId,
                        principalTable: "PriceList",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PriceListHourPriceIncludedKm",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PriceListId = table.Column<int>(type: "int", nullable: true),
                    ItemCategoryId = table.Column<int>(type: "int", nullable: true),
                    PricePerHour = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    IncludedKmPerHour = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    PricePerExcessKm = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceListHourPriceIncludedKm", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceListHourPriceIncludedKm_ItemCategory_ItemCategoryId",
                        column: x => x.ItemCategoryId,
                        principalTable: "ItemCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PriceListHourPriceIncludedKm_PriceList_PriceListId",
                        column: x => x.PriceListId,
                        principalTable: "PriceList",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PriceListServicePrice",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PriceListId = table.Column<int>(type: "int", nullable: true),
                    ItemCategoryId = table.Column<int>(type: "int", nullable: true),
                    PricePerServiceDay = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    IncludedKmPerDay = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    PricePerExcessKm = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceListServicePrice", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceListServicePrice_ItemCategory_ItemCategoryId",
                        column: x => x.ItemCategoryId,
                        principalTable: "ItemCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PriceListServicePrice_PriceList_PriceListId",
                        column: x => x.PriceListId,
                        principalTable: "PriceList",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PriceListThirtyDayPriceIncludedKm",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PriceListId = table.Column<int>(type: "int", nullable: true),
                    ItemCategoryId = table.Column<int>(type: "int", nullable: true),
                    PricePer30Days = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    IncludedKmPer30Days = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    PricePerExtraDay = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    IncludedKmPerExtraDay = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    PricePerExcessKm = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceListThirtyDayPriceIncludedKm", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceListThirtyDayPriceIncludedKm_ItemCategory_ItemCategoryId",
                        column: x => x.ItemCategoryId,
                        principalTable: "ItemCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PriceListThirtyDayPriceIncludedKm_PriceList_PriceListId",
                        column: x => x.PriceListId,
                        principalTable: "PriceList",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PriceListWeekendPrice",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PriceListId = table.Column<int>(type: "int", nullable: true),
                    ItemCategoryId = table.Column<int>(type: "int", nullable: true),
                    FromDayOfWeek = table.Column<int>(type: "int", nullable: true),
                    FromTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    ToDayOfWeek = table.Column<int>(type: "int", nullable: true),
                    ToTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    WeekendPrice = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    PricePerKm = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceListWeekendPrice", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceListWeekendPrice_ItemCategory_ItemCategoryId",
                        column: x => x.ItemCategoryId,
                        principalTable: "ItemCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PriceListWeekendPrice_PriceList_PriceListId",
                        column: x => x.PriceListId,
                        principalTable: "PriceList",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PriceListWeekendPriceFreeKm",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PriceListId = table.Column<int>(type: "int", nullable: true),
                    ItemCategoryId = table.Column<int>(type: "int", nullable: true),
                    FromDayOfWeek = table.Column<int>(type: "int", nullable: true),
                    FromTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    ToDayOfWeek = table.Column<int>(type: "int", nullable: true),
                    ToTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    WeekendPrice = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceListWeekendPriceFreeKm", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceListWeekendPriceFreeKm_ItemCategory_ItemCategoryId",
                        column: x => x.ItemCategoryId,
                        principalTable: "ItemCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PriceListWeekendPriceFreeKm_PriceList_PriceListId",
                        column: x => x.PriceListId,
                        principalTable: "PriceList",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PriceListWeekendPriceIncludedKm",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PriceListId = table.Column<int>(type: "int", nullable: true),
                    ItemCategoryId = table.Column<int>(type: "int", nullable: true),
                    FromDayOfWeek = table.Column<int>(type: "int", nullable: true),
                    FromTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    ToDayOfWeek = table.Column<int>(type: "int", nullable: true),
                    ToTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    WeekendPrice = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    IncludedKm = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    PricePerExcessKm = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceListWeekendPriceIncludedKm", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceListWeekendPriceIncludedKm_ItemCategory_ItemCategoryId",
                        column: x => x.ItemCategoryId,
                        principalTable: "ItemCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PriceListWeekendPriceIncludedKm_PriceList_PriceListId",
                        column: x => x.PriceListId,
                        principalTable: "PriceList",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PriceListWeekPriceFreeKm",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PriceListId = table.Column<int>(type: "int", nullable: true),
                    ItemCategoryId = table.Column<int>(type: "int", nullable: true),
                    PricePerWeek = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    PricePerExtraDay = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceListWeekPriceFreeKm", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceListWeekPriceFreeKm_ItemCategory_ItemCategoryId",
                        column: x => x.ItemCategoryId,
                        principalTable: "ItemCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PriceListWeekPriceFreeKm_PriceList_PriceListId",
                        column: x => x.PriceListId,
                        principalTable: "PriceList",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PriceListWeekPriceIncludedKm",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PriceListId = table.Column<int>(type: "int", nullable: true),
                    ItemCategoryId = table.Column<int>(type: "int", nullable: true),
                    PricePerWeek = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    IncludedKmPerWeek = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    PricePerExtraDay = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    IncludedKmPerExtraDay = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    PricePerExcessKm = table.Column<decimal>(type: "decimal(10,5)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceListWeekPriceIncludedKm", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceListWeekPriceIncludedKm_ItemCategory_ItemCategoryId",
                        column: x => x.ItemCategoryId,
                        principalTable: "ItemCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PriceListWeekPriceIncludedKm_PriceList_PriceListId",
                        column: x => x.PriceListId,
                        principalTable: "PriceList",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Reservation_PriceListId",
                table: "Reservation",
                column: "PriceListId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceList_OfficeId_IsActive_ValidFrom_ValidTo",
                table: "PriceList",
                columns: new[] { "OfficeId", "IsActive", "ValidFrom", "ValidTo" });

            migrationBuilder.CreateIndex(
                name: "IX_PriceList_OfficeId_Name",
                table: "PriceList",
                columns: new[] { "OfficeId", "Name" },
                unique: true,
                filter: "[OfficeId] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PriceList_ValidDateRange",
                table: "PriceList",
                sql: "[ValidTo] IS NULL OR [ValidTo] >= [ValidFrom]");

            migrationBuilder.CreateIndex(
                name: "IX_Customer_DefaultPriceListId",
                table: "Customer",
                column: "DefaultPriceListId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListDayPrice_ItemCategoryId",
                table: "PriceListDayPrice",
                column: "ItemCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListDayPrice_PriceListId_ItemCategoryId",
                table: "PriceListDayPrice",
                columns: new[] { "PriceListId", "ItemCategoryId" },
                unique: true,
                filter: "[PriceListId] IS NOT NULL AND [ItemCategoryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListDayPriceFreeKm_ItemCategoryId",
                table: "PriceListDayPriceFreeKm",
                column: "ItemCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListDayPriceFreeKm_PriceListId_ItemCategoryId",
                table: "PriceListDayPriceFreeKm",
                columns: new[] { "PriceListId", "ItemCategoryId" },
                unique: true,
                filter: "[PriceListId] IS NOT NULL AND [ItemCategoryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListGuaranteePrice_ItemCategoryId",
                table: "PriceListGuaranteePrice",
                column: "ItemCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListGuaranteePrice_PriceListId_ItemCategoryId",
                table: "PriceListGuaranteePrice",
                columns: new[] { "PriceListId", "ItemCategoryId" },
                unique: true,
                filter: "[PriceListId] IS NOT NULL AND [ItemCategoryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListHourPriceIncludedKm_ItemCategoryId",
                table: "PriceListHourPriceIncludedKm",
                column: "ItemCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListHourPriceIncludedKm_PriceListId_ItemCategoryId",
                table: "PriceListHourPriceIncludedKm",
                columns: new[] { "PriceListId", "ItemCategoryId" },
                unique: true,
                filter: "[PriceListId] IS NOT NULL AND [ItemCategoryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListServicePrice_ItemCategoryId",
                table: "PriceListServicePrice",
                column: "ItemCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListServicePrice_PriceListId_ItemCategoryId",
                table: "PriceListServicePrice",
                columns: new[] { "PriceListId", "ItemCategoryId" },
                unique: true,
                filter: "[PriceListId] IS NOT NULL AND [ItemCategoryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListThirtyDayPriceIncludedKm_ItemCategoryId",
                table: "PriceListThirtyDayPriceIncludedKm",
                column: "ItemCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListThirtyDayPriceIncludedKm_PriceListId_ItemCategoryId",
                table: "PriceListThirtyDayPriceIncludedKm",
                columns: new[] { "PriceListId", "ItemCategoryId" },
                unique: true,
                filter: "[PriceListId] IS NOT NULL AND [ItemCategoryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListWeekendPrice_ItemCategoryId",
                table: "PriceListWeekendPrice",
                column: "ItemCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListWeekendPrice_PriceListId_ItemCategoryId",
                table: "PriceListWeekendPrice",
                columns: new[] { "PriceListId", "ItemCategoryId" },
                unique: true,
                filter: "[PriceListId] IS NOT NULL AND [ItemCategoryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListWeekendPriceFreeKm_ItemCategoryId",
                table: "PriceListWeekendPriceFreeKm",
                column: "ItemCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListWeekendPriceFreeKm_PriceListId_ItemCategoryId",
                table: "PriceListWeekendPriceFreeKm",
                columns: new[] { "PriceListId", "ItemCategoryId" },
                unique: true,
                filter: "[PriceListId] IS NOT NULL AND [ItemCategoryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListWeekendPriceIncludedKm_ItemCategoryId",
                table: "PriceListWeekendPriceIncludedKm",
                column: "ItemCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListWeekendPriceIncludedKm_PriceListId_ItemCategoryId",
                table: "PriceListWeekendPriceIncludedKm",
                columns: new[] { "PriceListId", "ItemCategoryId" },
                unique: true,
                filter: "[PriceListId] IS NOT NULL AND [ItemCategoryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListWeekPriceFreeKm_ItemCategoryId",
                table: "PriceListWeekPriceFreeKm",
                column: "ItemCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListWeekPriceFreeKm_PriceListId_ItemCategoryId",
                table: "PriceListWeekPriceFreeKm",
                columns: new[] { "PriceListId", "ItemCategoryId" },
                unique: true,
                filter: "[PriceListId] IS NOT NULL AND [ItemCategoryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListWeekPriceIncludedKm_ItemCategoryId",
                table: "PriceListWeekPriceIncludedKm",
                column: "ItemCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceListWeekPriceIncludedKm_PriceListId_ItemCategoryId",
                table: "PriceListWeekPriceIncludedKm",
                columns: new[] { "PriceListId", "ItemCategoryId" },
                unique: true,
                filter: "[PriceListId] IS NOT NULL AND [ItemCategoryId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Customer_PriceList_DefaultPriceListId",
                table: "Customer",
                column: "DefaultPriceListId",
                principalTable: "PriceList",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PriceList_Office_OfficeId",
                table: "PriceList",
                column: "OfficeId",
                principalTable: "Office",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reservation_PriceList_PriceListId",
                table: "Reservation",
                column: "PriceListId",
                principalTable: "PriceList",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ReservationCalcItem_Item_ItemId",
                table: "ReservationCalcItem",
                column: "ItemId",
                principalTable: "Item",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ReservationCalcItem_PriceList_PriceListId",
                table: "ReservationCalcItem",
                column: "PriceListId",
                principalTable: "PriceList",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Customer_PriceList_DefaultPriceListId",
                table: "Customer");

            migrationBuilder.DropForeignKey(
                name: "FK_PriceList_Office_OfficeId",
                table: "PriceList");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservation_PriceList_PriceListId",
                table: "Reservation");

            migrationBuilder.DropForeignKey(
                name: "FK_ReservationCalcItem_Item_ItemId",
                table: "ReservationCalcItem");

            migrationBuilder.DropForeignKey(
                name: "FK_ReservationCalcItem_PriceList_PriceListId",
                table: "ReservationCalcItem");

            migrationBuilder.DropTable(
                name: "PriceListDayPrice");

            migrationBuilder.DropTable(
                name: "PriceListDayPriceFreeKm");

            migrationBuilder.DropTable(
                name: "PriceListGuaranteePrice");

            migrationBuilder.DropTable(
                name: "PriceListHourPriceIncludedKm");

            migrationBuilder.DropTable(
                name: "PriceListServicePrice");

            migrationBuilder.DropTable(
                name: "PriceListThirtyDayPriceIncludedKm");

            migrationBuilder.DropTable(
                name: "PriceListWeekendPrice");

            migrationBuilder.DropTable(
                name: "PriceListWeekendPriceFreeKm");

            migrationBuilder.DropTable(
                name: "PriceListWeekendPriceIncludedKm");

            migrationBuilder.DropTable(
                name: "PriceListWeekPriceFreeKm");

            migrationBuilder.DropTable(
                name: "PriceListWeekPriceIncludedKm");

            migrationBuilder.DropIndex(
                name: "IX_Reservation_PriceListId",
                table: "Reservation");

            migrationBuilder.DropIndex(
                name: "IX_PriceList_OfficeId_IsActive_ValidFrom_ValidTo",
                table: "PriceList");

            migrationBuilder.DropIndex(
                name: "IX_PriceList_OfficeId_Name",
                table: "PriceList");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PriceList_ValidDateRange",
                table: "PriceList");

            migrationBuilder.DropIndex(
                name: "IX_Customer_DefaultPriceListId",
                table: "Customer");

            migrationBuilder.DropColumn(
                name: "PriceListId",
                table: "Reservation");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "PriceList");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "PriceList");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "PriceList");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "PriceList");

            migrationBuilder.DropColumn(
                name: "OfficeId",
                table: "PriceList");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "PriceList");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "PriceList");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "PriceList");

            migrationBuilder.DropColumn(
                name: "ValidFrom",
                table: "PriceList");

            migrationBuilder.DropColumn(
                name: "ValidTo",
                table: "PriceList");

            migrationBuilder.DropColumn(
                name: "DefaultPriceListId",
                table: "Customer");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "PriceList",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AddForeignKey(
                name: "FK_ReservationCalcItem_Item_ItemId",
                table: "ReservationCalcItem",
                column: "ItemId",
                principalTable: "Item",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ReservationCalcItem_PriceList_PriceListId",
                table: "ReservationCalcItem",
                column: "PriceListId",
                principalTable: "PriceList",
                principalColumn: "Id");
        }
    }
}
