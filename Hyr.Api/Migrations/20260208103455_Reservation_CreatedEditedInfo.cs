using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class Reservation_CreatedEditedInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CreatedByUserId",
                table: "Reservation",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedDate",
                table: "Reservation",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ModifiedByUserId",
                table: "Reservation",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ModifiedDate",
                table: "Reservation",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reservation_CreatedByUserId",
                table: "Reservation",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Reservation_ModifiedByUserId",
                table: "Reservation",
                column: "ModifiedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reservation_User_CreatedByUserId",
                table: "Reservation",
                column: "CreatedByUserId",
                principalTable: "User",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reservation_User_ModifiedByUserId",
                table: "Reservation",
                column: "ModifiedByUserId",
                principalTable: "User",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reservation_User_CreatedByUserId",
                table: "Reservation");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservation_User_ModifiedByUserId",
                table: "Reservation");

            migrationBuilder.DropIndex(
                name: "IX_Reservation_CreatedByUserId",
                table: "Reservation");

            migrationBuilder.DropIndex(
                name: "IX_Reservation_ModifiedByUserId",
                table: "Reservation");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Reservation");

            migrationBuilder.DropColumn(
                name: "CreatedDate",
                table: "Reservation");

            migrationBuilder.DropColumn(
                name: "ModifiedByUserId",
                table: "Reservation");

            migrationBuilder.DropColumn(
                name: "ModifiedDate",
                table: "Reservation");
        }
    }
}
