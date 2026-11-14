using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class ItemType_CabinName_Bod : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE [ItemType] SET [Name] = N'Bod' WHERE [Code] = 'CABIN';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE [ItemType] SET [Name] = N'Cabin' WHERE [Code] = 'CABIN';");
        }
    }
}
