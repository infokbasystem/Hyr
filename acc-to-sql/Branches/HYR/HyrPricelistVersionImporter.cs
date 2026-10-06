using System;
using System.Data;
using System.Data.OleDb;
using Microsoft.Data.SqlClient;

namespace Branches.HYR
{
    public static class HyrPricelistVersionImporter
    {
        /// <summary>
        /// Imports pricelists from an Access database table into the SQL Server dbo.PriceList table.
        /// - Expects an Access table named "Pricelist" with columns "lngPricelist_ID" and "strPricelist".
        /// - Skips rows that already exist in SQL Server (based on OfficeId + Name).
        /// </summary>
        /// <param name="officeId">Office id to set on imported price lists</param>
        /// <param name="accessConnectionString">Complete Access connection string (OLE DB)</param>
        /// <param name="sqlConnectionString">SQL Server connection string</param>
        /// <param name="accessTableName">Access table name to read from (defaults to "Pricelist")</param>
        public static void ImportPriceListVersions(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "PricelistVersion")
        {
            if (string.IsNullOrWhiteSpace(accessConnectionString)) throw new ArgumentException("accessConnectionString is required", nameof(accessConnectionString));
            if (string.IsNullOrWhiteSpace(sqlConnectionString)) throw new ArgumentException("sqlConnectionString is required", nameof(sqlConnectionString));

            Console.WriteLine($"Starting price list version import from Access table '{accessTableName}' for OfficeId={officeId}...");

            using var accessConn = new OleDbConnection(accessConnectionString);
            accessConn.Open();

            // Read from Access
            var selectSql = $"SELECT lngPricelistVersion_ID, strPricelistVersion FROM [{accessTableName}]";
            using var selectCmd = new OleDbCommand(selectSql, accessConn);
            using var reader = selectCmd.ExecuteReader();

            if (reader == null)
            {
                Console.WriteLine("No data reader returned from Access query.");
                return;
            }

            using var sqlConn = new SqlConnection(sqlConnectionString);
            sqlConn.Open();

            // Ensure the Office row exists. If not, create it using the Foretag value from the Access Parm table.
            var officeExistsSql = "SELECT 1 FROM [dbo].[Office] WHERE [Id] = @OfficeId";
            using (var officeCheckCmd = new SqlCommand(officeExistsSql, sqlConn))
            {
                officeCheckCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
                var exists = officeCheckCmd.ExecuteScalar();
                if (exists == null || exists == DBNull.Value)
                {
                    // Read Foretag from Access Parm table
                    string officeName = null;
                    try
                    {
                        using var parmCmd = new OleDbCommand("SELECT TOP 1 Foretag FROM Parm", accessConn);
                        var parmObj = parmCmd.ExecuteScalar();
                        officeName = parmObj == null || parmObj == DBNull.Value ? null : parmObj.ToString()?.Trim();
                    }
                    catch
                    {
                        // If Parm doesn't exist or query fails, continue with default name
                        officeName = null;
                    }

                    if (string.IsNullOrEmpty(officeName)) officeName = $"Office {officeId}";

                    var insertOfficeSql = @"SET IDENTITY_INSERT [dbo].[Office] ON;
                        INSERT INTO [dbo].[Office] ([Id],[Name],[FortnoxAccessToken],[FortnoxRefreshToken])
                        VALUES (@Id,@Name,@AccessToken,@RefreshToken);
                        SET IDENTITY_INSERT [dbo].[Office] OFF;";

                    using var insertOfficeCmd = new SqlCommand(insertOfficeSql, sqlConn);
                    insertOfficeCmd.Parameters.Add(new SqlParameter("@Id", SqlDbType.Int) { Value = officeId });
                    insertOfficeCmd.Parameters.Add(new SqlParameter("@Name", SqlDbType.NVarChar, 200) { Value = officeName });
                    insertOfficeCmd.Parameters.Add(new SqlParameter("@AccessToken", SqlDbType.NVarChar, -1) { Value = string.Empty });
                    insertOfficeCmd.Parameters.Add(new SqlParameter("@RefreshToken", SqlDbType.NVarChar, 500) { Value = string.Empty });
                    insertOfficeCmd.ExecuteNonQuery();

                    Console.WriteLine($"Inserted Office Id={officeId}, Name='{officeName}'");
                }
            }

            var checkSql = "SELECT [Id] FROM [dbo].[PriceList] WHERE [OfficeId] = @OfficeId AND [Name] = @Name";
            var insertSql = @"INSERT INTO [dbo].[PriceList] ([Name], [CreatedAt], [IsActive], [OfficeId], [Description])
                               VALUES (@Name, @CreatedAt, @IsActive, @OfficeId, @Description);";

            var rowsProcessed = 0;
            var rowsInserted = 0;
            while (reader.Read())
            {
                rowsProcessed++;

                var nameObj = reader["strPricelistVersion"];
                var name = nameObj == DBNull.Value ? string.Empty : nameObj.ToString()?.Trim();
                if (string.IsNullOrEmpty(name))
                {
                    // Skip empty names
                    continue;
                }

                // Check existing
                using (var checkCmd = new SqlCommand(checkSql, sqlConn))
                {
                    checkCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
                    checkCmd.Parameters.Add(new SqlParameter("@Name", SqlDbType.NVarChar, 200) { Value = name });

                    var existing = checkCmd.ExecuteScalar();
                    if (existing != null && existing != DBNull.Value)
                    {
                        // Exists - skip
                        continue;
                    }
                }

                // Insert
                using (var insertCmd = new SqlCommand(insertSql, sqlConn))
                {
                    insertCmd.Parameters.Add(new SqlParameter("@Name", SqlDbType.NVarChar, 200) { Value = name });
                    insertCmd.Parameters.Add(new SqlParameter("@CreatedAt", SqlDbType.DateTime2) { Value = DateTime.UtcNow });
                    insertCmd.Parameters.Add(new SqlParameter("@IsActive", SqlDbType.Bit) { Value = true });
                    insertCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
                    insertCmd.Parameters.Add(new SqlParameter("@Description", SqlDbType.NVarChar, 500) { Value = string.Empty });

                    rowsInserted += insertCmd.ExecuteNonQuery();
                }
            }

            Console.WriteLine($"Price list import finished. Processed={rowsProcessed}, Inserted={rowsInserted}");
        }
    }
}
