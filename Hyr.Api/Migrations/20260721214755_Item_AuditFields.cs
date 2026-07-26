using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    /// <inheritdoc />
    public partial class Item_AuditFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Item",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CreatedBy",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Item",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UpdatedBy",
                table: "Item",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Item_CreatedBy",
                table: "Item",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Item_UpdatedBy",
                table: "Item",
                column: "UpdatedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_Item_User_CreatedBy",
                table: "Item",
                column: "CreatedBy",
                principalTable: "User",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Item_User_UpdatedBy",
                table: "Item",
                column: "UpdatedBy",
                principalTable: "User",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Item_User_CreatedBy",
                table: "Item");

            migrationBuilder.DropForeignKey(
                name: "FK_Item_User_UpdatedBy",
                table: "Item");

            migrationBuilder.DropIndex(
                name: "IX_Item_CreatedBy",
                table: "Item");

            migrationBuilder.DropIndex(
                name: "IX_Item_UpdatedBy",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Item");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Item");
        }
    }
}
