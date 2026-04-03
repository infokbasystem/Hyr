using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class User_OfficeId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OfficeId",
                table: "User",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_User_OfficeId",
                table: "User",
                column: "OfficeId");

            migrationBuilder.AddForeignKey(
                name: "FK_User_Office_OfficeId",
                table: "User",
                column: "OfficeId",
                principalTable: "Office",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_User_Office_OfficeId",
                table: "User");

            migrationBuilder.DropIndex(
                name: "IX_User_OfficeId",
                table: "User");

            migrationBuilder.DropColumn(
                name: "OfficeId",
                table: "User");
        }
    }
}
