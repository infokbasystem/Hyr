using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class Finance_NewTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InvoiceRow_Item_ItemId",
                table: "InvoiceRow");

            migrationBuilder.CreateTable(
                name: "Account",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: true),
                    AccountNr = table.Column<int>(type: "int", maxLength: 100, nullable: true),
                    Name = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Account", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Account_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Vat",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Rate = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    ExternalCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vat", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Vat_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Article",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OfficeId = table.Column<int>(type: "int", nullable: true),
                    ArticleNr = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,5)", nullable: true),
                    AccountId = table.Column<int>(type: "int", nullable: true),
                    VatRateId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Article", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Article_Account_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Account",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Article_Office_OfficeId",
                        column: x => x.OfficeId,
                        principalTable: "Office",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Article_Vat_VatRateId",
                        column: x => x.VatRateId,
                        principalTable: "Vat",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceRow_ArticleId",
                table: "InvoiceRow",
                column: "ArticleId");

            migrationBuilder.CreateIndex(
                name: "IX_Account_OfficeId",
                table: "Account",
                column: "OfficeId");

            migrationBuilder.CreateIndex(
                name: "IX_Article_AccountId",
                table: "Article",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Article_OfficeId",
                table: "Article",
                column: "OfficeId");

            migrationBuilder.CreateIndex(
                name: "IX_Article_VatRateId",
                table: "Article",
                column: "VatRateId");

            migrationBuilder.CreateIndex(
                name: "IX_Vat_OfficeId",
                table: "Vat",
                column: "OfficeId");

            migrationBuilder.AddForeignKey(
                name: "FK_InvoiceRow_Article_ArticleId",
                table: "InvoiceRow",
                column: "ArticleId",
                principalTable: "Article",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_InvoiceRow_Item_ItemId",
                table: "InvoiceRow",
                column: "ItemId",
                principalTable: "Item",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InvoiceRow_Article_ArticleId",
                table: "InvoiceRow");

            migrationBuilder.DropForeignKey(
                name: "FK_InvoiceRow_Item_ItemId",
                table: "InvoiceRow");

            migrationBuilder.DropTable(
                name: "Article");

            migrationBuilder.DropTable(
                name: "Account");

            migrationBuilder.DropTable(
                name: "Vat");

            migrationBuilder.DropIndex(
                name: "IX_InvoiceRow_ArticleId",
                table: "InvoiceRow");

            migrationBuilder.AddForeignKey(
                name: "FK_InvoiceRow_Item_ItemId",
                table: "InvoiceRow",
                column: "ItemId",
                principalTable: "Item",
                principalColumn: "Id");
        }
    }
}
