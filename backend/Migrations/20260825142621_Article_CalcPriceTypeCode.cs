using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class Article_CalcPriceTypeCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Article_OfficeId",
                table: "Article");

            migrationBuilder.AddColumn<string>(
                name: "CalcPriceTypeCode",
                table: "Article",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Article_OfficeId_CalcPriceTypeCode",
                table: "Article",
                columns: new[] { "OfficeId", "CalcPriceTypeCode" },
                unique: true,
                filter: "[CalcPriceTypeCode] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Article_OfficeId_CalcPriceTypeCode",
                table: "Article");

            migrationBuilder.DropColumn(
                name: "CalcPriceTypeCode",
                table: "Article");

            migrationBuilder.CreateIndex(
                name: "IX_Article_OfficeId",
                table: "Article",
                column: "OfficeId");
        }
    }
}
