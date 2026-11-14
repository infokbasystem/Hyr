using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class ReservationItemArticle_UnitPrice_Id : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ReservationItemArticle",
                table: "ReservationItemArticle");

            migrationBuilder.AddColumn<int>(
                name: "Id",
                table: "ReservationItemArticle",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "ReservationItemArticle",
                type: "decimal(18,5)",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE link
                SET link.UnitPrice = article.Price
                FROM ReservationItemArticle AS link
                INNER JOIN Article AS article ON article.Id = link.ArticleId;
                """);

            migrationBuilder.AddColumn<int>(
                name: "ReservationItemArticleId",
                table: "ReservationCalcItem",
                type: "int",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_ReservationItemArticle",
                table: "ReservationItemArticle",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationItemArticle_ReservationItemId_ArticleId",
                table: "ReservationItemArticle",
                columns: new[] { "ReservationItemId", "ArticleId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReservationCalcItem_ReservationItemArticleId",
                table: "ReservationCalcItem",
                column: "ReservationItemArticleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ReservationItemArticle",
                table: "ReservationItemArticle");

            migrationBuilder.DropIndex(
                name: "IX_ReservationItemArticle_ReservationItemId_ArticleId",
                table: "ReservationItemArticle");

            migrationBuilder.DropIndex(
                name: "IX_ReservationCalcItem_ReservationItemArticleId",
                table: "ReservationCalcItem");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "ReservationItemArticle");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                table: "ReservationItemArticle");

            migrationBuilder.DropColumn(
                name: "ReservationItemArticleId",
                table: "ReservationCalcItem");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ReservationItemArticle",
                table: "ReservationItemArticle",
                columns: new[] { "ReservationItemId", "ArticleId" });
        }
    }
}
