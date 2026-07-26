using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class ItemType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ItemTypeId",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ItemType",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemType", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "ItemType",
                columns: new[] { "Id", "Code", "Name" },
                values: new object[,]
                {
                    { 1, "VEHICLE", "Bil" },
                    { 2, "LIFT", "Lift" },
                    { 3, "ALU", "Alu" },
                    { 4, "HAKI", "Haki" },
                    { 5, "TOOL", "Verktyg" },
                    { 6, "ACCESSORY", "Tillbehör" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Item_ItemTypeId",
                table: "Item",
                column: "ItemTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Customer_CreatedBy",
                table: "Customer",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Customer_UpdatedBy",
                table: "Customer",
                column: "UpdatedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_Customer_User_CreatedBy",
                table: "Customer",
                column: "CreatedBy",
                principalTable: "User",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Customer_User_UpdatedBy",
                table: "Customer",
                column: "UpdatedBy",
                principalTable: "User",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Item_ItemType_ItemTypeId",
                table: "Item",
                column: "ItemTypeId",
                principalTable: "ItemType",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Customer_User_CreatedBy",
                table: "Customer");

            migrationBuilder.DropForeignKey(
                name: "FK_Customer_User_UpdatedBy",
                table: "Customer");

            migrationBuilder.DropForeignKey(
                name: "FK_Item_ItemType_ItemTypeId",
                table: "Item");

            migrationBuilder.DropTable(
                name: "ItemType");

            migrationBuilder.DropIndex(
                name: "IX_Item_ItemTypeId",
                table: "Item");

            migrationBuilder.DropIndex(
                name: "IX_Customer_CreatedBy",
                table: "Customer");

            migrationBuilder.DropIndex(
                name: "IX_Customer_UpdatedBy",
                table: "Customer");

            migrationBuilder.DropColumn(
                name: "ItemTypeId",
                table: "Item");
        }
    }
}
