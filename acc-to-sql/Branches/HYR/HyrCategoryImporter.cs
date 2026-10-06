using System;
using System.Data;
using System.Data.OleDb;
using Microsoft.Data.SqlClient;

namespace Branches.HYR;

public static class HyrCategoryImporter
{
    public static void ImportCategories(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "Kategori")
    {
        if (string.IsNullOrWhiteSpace(accessConnectionString)) throw new ArgumentException("accessConnectionString is required", nameof(accessConnectionString));
        if (string.IsNullOrWhiteSpace(sqlConnectionString)) throw new ArgumentException("sqlConnectionString is required", nameof(sqlConnectionString));

        Console.WriteLine($"Starting category import from Access table '{accessTableName}' for OfficeId={officeId}...");

        using var accessConn = new OleDbConnection(accessConnectionString);
        accessConn.Open();

        using var sqlConn = new SqlConnection(sqlConnectionString);
        sqlConn.Open();

        var selectSql = $"SELECT [KategoriId], [KategoriText] FROM [{accessTableName}]";
        using var selectCmd = new OleDbCommand(selectSql, accessConn);
        using var reader = selectCmd.ExecuteReader();

        if (reader == null)
        {
            Console.WriteLine("No reader returned for categories.");
            return;
        }

        const string checkSql = "SELECT [Id] FROM [dbo].[ItemCategory] WHERE [OfficeId] = @OfficeId AND [Name] = @Name";
        const string insertSql = "INSERT INTO [dbo].[ItemCategory] ([OfficeId], [Name]) VALUES (@OfficeId, @Name);";

        var processed = 0;
        var inserted = 0;

        while (reader.Read())
        {
            processed++;

            var name = reader["KategoriText"] == DBNull.Value ? string.Empty : reader["KategoriText"]?.ToString()?.Trim() ?? string.Empty;
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

        Console.WriteLine($"Category import finished. Processed={processed}, Inserted={inserted}");
    }
}
