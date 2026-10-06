using System;
using System.Data;
using System.Data.OleDb;
using Microsoft.Data.SqlClient;

namespace Branches.HYR;

public static class HyrItemModelImporter
{
    public static void ImportItemModels(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "Modell")
    {
        if (string.IsNullOrWhiteSpace(accessConnectionString)) throw new ArgumentException("accessConnectionString is required", nameof(accessConnectionString));
        if (string.IsNullOrWhiteSpace(sqlConnectionString)) throw new ArgumentException("sqlConnectionString is required", nameof(sqlConnectionString));

        Console.WriteLine($"Starting item model import from Access table '{accessTableName}' for OfficeId={officeId}...");

        using var accessConn = new OleDbConnection(accessConnectionString);
        accessConn.Open();

        using var sqlConn = new SqlConnection(sqlConnectionString);
        sqlConn.Open();

        var selectSql = $"SELECT [ModellId], [ModellText] FROM [{accessTableName}]";
        using var selectCmd = new OleDbCommand(selectSql, accessConn);
        using var reader = selectCmd.ExecuteReader();

        if (reader == null)
        {
            Console.WriteLine("No reader returned for item models.");
            return;
        }

        const string checkSql = "SELECT [Id] FROM [dbo].[ItemModel] WHERE [OfficeId] = @OfficeId AND [Name] = @Name";
        const string insertSql = "INSERT INTO [dbo].[ItemModel] ([OfficeId], [Name]) VALUES (@OfficeId, @Name);";

        var processed = 0;
        var inserted = 0;

        while (reader.Read())
        {
            processed++;

            var name = reader["ModellText"] == DBNull.Value ? string.Empty : reader["ModellText"]?.ToString()?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            using (var checkCmd = new SqlCommand(checkSql, sqlConn))
            {
                checkCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
                checkCmd.Parameters.Add(new SqlParameter("@Name", SqlDbType.NVarChar, 200) { Value = name });

                var exists = checkCmd.ExecuteScalar();
                if (exists != null && exists != DBNull.Value)
                {
                    continue;
                }
            }

            using (var insertCmd = new SqlCommand(insertSql, sqlConn))
            {
                insertCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
                insertCmd.Parameters.Add(new SqlParameter("@Name", SqlDbType.NVarChar, 200) { Value = name });
                insertCmd.ExecuteNonQuery();
                inserted++;
            }
        }

        Console.WriteLine($"Item model import finished. Processed={processed}, Inserted={inserted}");
    }
}
