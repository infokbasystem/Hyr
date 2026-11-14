using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class CategoryArticle_ReservationItemArticle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CategoryArticle",
                columns: table => new
                {
                    ItemCategoryId = table.Column<int>(type: "int", nullable: false),
                    ArticleId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CategoryArticle", x => new { x.ItemCategoryId, x.ArticleId });
                    table.ForeignKey(
                        name: "FK_CategoryArticle_Article_ArticleId",
                        column: x => x.ArticleId,
                        principalTable: "Article",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CategoryArticle_ItemCategory_ItemCategoryId",
                        column: x => x.ItemCategoryId,
                        principalTable: "ItemCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReservationItemArticle",
                columns: table => new
                {
                    ReservationItemId = table.Column<int>(type: "int", nullable: false),
                    ArticleId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReservationItemArticle", x => new { x.ReservationItemId, x.ArticleId });
                    table.ForeignKey(
                        name: "FK_ReservationItemArticle_Article_ArticleId",
                        column: x => x.ArticleId,
                        principalTable: "Article",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReservationItemArticle_ReservationItem_ReservationItemId",
                        column: x => x.ReservationItemId,
                        principalTable: "ReservationItem",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CategoryArticle_ArticleId",
                table: "CategoryArticle",
                column: "ArticleId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationItemArticle_ArticleId",
                table: "ReservationItemArticle",
                column: "ArticleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CategoryArticle");

            migrationBuilder.DropTable(
                name: "ReservationItemArticle");
        }
    }
}
