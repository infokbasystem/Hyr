using Hyr.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hyr.Api.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260805103000_Invoice_AuditFields_Ensure")]
    public class Invoice_AuditFields_Ensure : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('Invoice', 'CreatedByUserId') IS NULL
                    ALTER TABLE [Invoice] ADD [CreatedByUserId] int NULL;

                IF COL_LENGTH('Invoice', 'CreatedDate') IS NULL
                    ALTER TABLE [Invoice] ADD [CreatedDate] datetime2 NULL;

                IF COL_LENGTH('Invoice', 'ModifiedByUserId') IS NULL
                    ALTER TABLE [Invoice] ADD [ModifiedByUserId] int NULL;

                IF COL_LENGTH('Invoice', 'ModifiedDate') IS NULL
                    ALTER TABLE [Invoice] ADD [ModifiedDate] datetime2 NULL;

                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_Invoice_CreatedByUserId'
                      AND object_id = OBJECT_ID('[Invoice]')
                )
                    CREATE INDEX [IX_Invoice_CreatedByUserId] ON [Invoice]([CreatedByUserId]);

                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_Invoice_ModifiedByUserId'
                      AND object_id = OBJECT_ID('[Invoice]')
                )
                    CREATE INDEX [IX_Invoice_ModifiedByUserId] ON [Invoice]([ModifiedByUserId]);

                IF NOT EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = 'FK_Invoice_User_CreatedByUserId'
                )
                    ALTER TABLE [Invoice] ADD CONSTRAINT [FK_Invoice_User_CreatedByUserId]
                    FOREIGN KEY ([CreatedByUserId]) REFERENCES [User]([Id]) ON DELETE NO ACTION;

                IF NOT EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = 'FK_Invoice_User_ModifiedByUserId'
                )
                    ALTER TABLE [Invoice] ADD CONSTRAINT [FK_Invoice_User_ModifiedByUserId]
                    FOREIGN KEY ([ModifiedByUserId]) REFERENCES [User]([Id]) ON DELETE NO ACTION;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = 'FK_Invoice_User_CreatedByUserId'
                )
                    ALTER TABLE [Invoice] DROP CONSTRAINT [FK_Invoice_User_CreatedByUserId];

                IF EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = 'FK_Invoice_User_ModifiedByUserId'
                )
                    ALTER TABLE [Invoice] DROP CONSTRAINT [FK_Invoice_User_ModifiedByUserId];

                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_Invoice_CreatedByUserId'
                      AND object_id = OBJECT_ID('[Invoice]')
                )
                    DROP INDEX [IX_Invoice_CreatedByUserId] ON [Invoice];

                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_Invoice_ModifiedByUserId'
                      AND object_id = OBJECT_ID('[Invoice]')
                )
                    DROP INDEX [IX_Invoice_ModifiedByUserId] ON [Invoice];

                IF COL_LENGTH('Invoice', 'CreatedByUserId') IS NOT NULL
                    ALTER TABLE [Invoice] DROP COLUMN [CreatedByUserId];

                IF COL_LENGTH('Invoice', 'CreatedDate') IS NOT NULL
                    ALTER TABLE [Invoice] DROP COLUMN [CreatedDate];

                IF COL_LENGTH('Invoice', 'ModifiedByUserId') IS NOT NULL
                    ALTER TABLE [Invoice] DROP COLUMN [ModifiedByUserId];

                IF COL_LENGTH('Invoice', 'ModifiedDate') IS NOT NULL
                    ALTER TABLE [Invoice] DROP COLUMN [ModifiedDate];
                """);
        }
    }
}
