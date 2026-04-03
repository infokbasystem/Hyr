using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class Invoice_CreatedAndModifiedInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CreatedByUserId",
                table: "Invoice",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedDate",
                table: "Invoice",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ModifiedByUserId",
                table: "Invoice",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ModifiedDate",
                table: "Invoice",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoice_CreatedByUserId",
                table: "Invoice",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoice_ModifiedByUserId",
                table: "Invoice",
                column: "ModifiedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Invoice_User_CreatedByUserId",
                table: "Invoice",
                column: "CreatedByUserId",
                principalTable: "User",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Invoice_User_ModifiedByUserId",
                table: "Invoice",
                column: "ModifiedByUserId",
                principalTable: "User",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Invoice_User_CreatedByUserId",
                table: "Invoice");

            migrationBuilder.DropForeignKey(
                name: "FK_Invoice_User_ModifiedByUserId",
                table: "Invoice");

            migrationBuilder.DropIndex(
                name: "IX_Invoice_CreatedByUserId",
                table: "Invoice");

            migrationBuilder.DropIndex(
                name: "IX_Invoice_ModifiedByUserId",
                table: "Invoice");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Invoice");

            migrationBuilder.DropColumn(
                name: "CreatedDate",
                table: "Invoice");

            migrationBuilder.DropColumn(
                name: "ModifiedByUserId",
                table: "Invoice");

            migrationBuilder.DropColumn(
                name: "ModifiedDate",
                table: "Invoice");
        }
    }
}
