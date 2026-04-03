using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class ItemModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ItemModel",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemModel", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItemModel_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Item_ItemModelId",
                table: "Item",
                column: "ItemModelId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemModel_OfficeId",
                table: "ItemModel",
                column: "OfficeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Item_ItemModel_ItemModelId",
                table: "Item",
                column: "ItemModelId",
                principalTable: "ItemModel",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Item_ItemModel_ItemModelId",
                table: "Item");

            migrationBuilder.DropTable(
                name: "ItemModel");

            migrationBuilder.DropIndex(
                name: "IX_Item_ItemModelId",
                table: "Item");
        }
    }
}
