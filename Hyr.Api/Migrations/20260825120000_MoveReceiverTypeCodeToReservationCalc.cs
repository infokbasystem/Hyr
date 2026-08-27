using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    [DbContext(typeof(Hyr.Api.Data.ApplicationDbContext))]
    [Migration("20260825120000_MoveReceiverTypeCodeToReservationCalc")]
    public partial class MoveReceiverTypeCodeToReservationCalc : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReceiverTypeCode",
                table: "ReservationCalc",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE calc
                SET ReceiverTypeCode = COALESCE(NULLIF(LTRIM(RTRIM((
                    SELECT TOP (1) item.ReceiverTypeCode
                    FROM ReservationCalcItem item
                    WHERE item.ReservationCalcId = calc.Id
                    ORDER BY CASE item.ReceiverTypeCode
                        WHEN 'CUSTOMER' THEN 0
                        WHEN 'INSURANCECOMPANY' THEN 1
                        WHEN 'INTERNAL' THEN 2
                        ELSE 3
                    END, item.Id
                ))), ''), 'CUSTOMER')
                FROM ReservationCalc calc;

                DECLARE @CalcId int;
                DECLARE @ReceiverTypeCode nvarchar(30);
                DECLARE @NewCalcId int;
                DECLARE calc_cursor CURSOR LOCAL FAST_FORWARD FOR
                    SELECT DISTINCT item.ReservationCalcId, item.ReceiverTypeCode
                    FROM ReservationCalcItem item
                    INNER JOIN ReservationCalc calc ON calc.Id = item.ReservationCalcId
                    WHERE item.ReservationCalcId IS NOT NULL
                      AND item.ReceiverTypeCode <> calc.ReceiverTypeCode;

                OPEN calc_cursor;
                FETCH NEXT FROM calc_cursor INTO @CalcId, @ReceiverTypeCode;
                WHILE @@FETCH_STATUS = 0
                BEGIN
                    INSERT INTO ReservationCalc (OfficeId, ReservationId, DateTimeFrom, DateTimeTo, ReceiverTypeCode)
                    SELECT OfficeId, ReservationId, DateTimeFrom, DateTimeTo, @ReceiverTypeCode
                    FROM ReservationCalc
                    WHERE Id = @CalcId;

                    SET @NewCalcId = SCOPE_IDENTITY();

                    UPDATE ReservationCalcItem
                    SET ReservationCalcId = @NewCalcId
                    WHERE ReservationCalcId = @CalcId
                      AND ReceiverTypeCode = @ReceiverTypeCode;

                    FETCH NEXT FROM calc_cursor INTO @CalcId, @ReceiverTypeCode;
                END;
                CLOSE calc_cursor;
                DEALLOCATE calc_cursor;");

            migrationBuilder.AlterColumn<string>(
                name: "ReceiverTypeCode",
                table: "ReservationCalc",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "CUSTOMER",
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "ReceiverTypeCode",
                table: "ReservationCalcItem");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReceiverTypeCode",
                table: "ReservationCalcItem",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "CUSTOMER");

            migrationBuilder.Sql(@"
                UPDATE item
                SET ReceiverTypeCode = calc.ReceiverTypeCode
                FROM ReservationCalcItem item
                INNER JOIN ReservationCalc calc ON calc.Id = item.ReservationCalcId;");

            migrationBuilder.DropColumn(
                name: "ReceiverTypeCode",
                table: "ReservationCalc");
        }
    }
}