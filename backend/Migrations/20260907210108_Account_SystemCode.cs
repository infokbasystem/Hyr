using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class Account_SystemCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SystemCode",
                table: "Account",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Account_OfficeId_SystemCode",
                table: "Account",
                columns: new[] { "OfficeId", "SystemCode" },
                unique: true,
                filter: "[SystemCode] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Account_OfficeId_SystemCode",
                table: "Account");

            migrationBuilder.DropColumn(
                name: "SystemCode",
                table: "Account");
        }
    }
}
