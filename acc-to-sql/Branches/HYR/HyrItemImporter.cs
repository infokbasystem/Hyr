using System.Data;
using System.Data.OleDb;
using Microsoft.Data.SqlClient;

public static class HyrItemImporter
{
    public static void ImportItems(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "Resurs")
    {
        if (string.IsNullOrWhiteSpace(accessConnectionString)) throw new ArgumentException("accessConnectionString is required", nameof(accessConnectionString));
        if (string.IsNullOrWhiteSpace(sqlConnectionString)) throw new ArgumentException("sqlConnectionString is required", nameof(sqlConnectionString));

        Console.WriteLine($"Starting item import from Access table '{accessTableName}' for OfficeId={officeId}...");

        using var accessConn = new OleDbConnection(accessConnectionString);
        accessConn.Open();

        using var sqlConn = new SqlConnection(sqlConnectionString);
        sqlConn.Open();

        EnsureOfficeExists(officeId, accessConn, sqlConn);

        var schemaColumns = LoadColumns(accessConn, accessTableName);
        var selectedColumns = new List<string>();

        var importIdColumn = ResolveFirstExisting(schemaColumns, "ResursId");
        if (!string.IsNullOrWhiteSpace(importIdColumn)) selectedColumns.Add(importIdColumn);

        AddIfExists(schemaColumns, selectedColumns, "RegNr");
        AddIfExists(schemaColumns, selectedColumns, "ModellId");
        AddIfExists(schemaColumns, selectedColumns, "KategoriId");
        AddIfExists(schemaColumns, selectedColumns, "ArsModell");
        AddIfExists(schemaColumns, selectedColumns, "ResursNot");
        AddIfExists(schemaColumns, selectedColumns, "Kbm");
        AddIfExists(schemaColumns, selectedColumns, "bolActive");
        AddIfExists(schemaColumns, selectedColumns, "Utrustning");
        AddIfExists(schemaColumns, selectedColumns, "strFuel");

        if (!selectedColumns.Contains("RegNr", StringComparer.OrdinalIgnoreCase))
        {
            Console.WriteLine("Access table does not contain required column 'RegNr'. Item import skipped.");
            return;
        }

        var modelNamesByAccessId = LoadAccessLookup(accessConn, "Modell", "ModellId", "ModellText");
        var categoryNamesByAccessId = LoadAccessLookup(accessConn, "Kategori", "KategoriId", "KategoriText");
        var sqlItemModelIdsByName = LoadSqlLookup(sqlConn, officeId, "ItemModel");
        var sqlItemCategoryIdsByName = LoadSqlLookup(sqlConn, officeId, "ItemCategory");

        var selectSql = $"SELECT {string.Join(", ", selectedColumns.Select(c => "[" + c + "]"))} FROM [{accessTableName}]";
        using var selectCmd = new OleDbCommand(selectSql, accessConn);
        using var reader = selectCmd.ExecuteReader();

        if (reader == null)
        {
            Console.WriteLine("No reader returned for items.");
            return;
        }

        const string checkByImportSql = "SELECT [Id] FROM [dbo].[Item] WHERE [OfficeId] = @OfficeId AND [ImportSource] = @ImportSource AND [ImportId] = @ImportId";
        const string checkByRegNrSql = "SELECT [Id] FROM [dbo].[Item] WHERE [OfficeId] = @OfficeId AND [RegNr] = @RegNr";
        const string updateSql = @"UPDATE [dbo].[Item]
            SET [ItemCategoryId] = @ItemCategoryId,
                [ItemModelId] = @ItemModelId
            WHERE [Id] = @Id;";
        const string insertSql = @"INSERT INTO [dbo].[Item]
            ([OfficeId],[ItemTypeCode],[ItemCategoryId],[ItemModelId],[RegNr],[YearModel],[Note],[MachineNr],[ImportId],[ImportSource],[IsActive],[KmReading],[Equipment],[Fuel])
            VALUES
            (@OfficeId,@ItemTypeCode,@ItemCategoryId,@ItemModelId,@RegNr,@YearModel,@Note,@MachineNr,@ImportId,@ImportSource,@IsActive,@KmReading,@Equipment,@Fuel);";

        var processed = 0;
        var inserted = 0;
        var updated = 0;

        while (reader.Read())
        {
            processed++;

            var regNr = ReadString(reader, "RegNr");
            if (string.IsNullOrWhiteSpace(regNr))
            {
                continue;
            }

            var importId = ReadNullableInt(reader, importIdColumn);
            var itemModelAccessId = ReadNullableInt(reader, "ModellId");
            var itemCategoryAccessId = ReadNullableInt(reader, "KategoriId");
            var yearModel = ReadString(reader, "ArsModell");
            var note = ReadString(reader, "ResursNot");
            var kmReading = ReadNullableInt(reader, "Kbm");
            var isActive = ReadNullableBool(reader, "bolActive") ?? true;
            var equipment = ReadString(reader, "Utrustning");
            var fuel = ReadString(reader, "strFuel");
            var machineNr = importId?.ToString() ?? regNr;

            int? itemModelId = null;
            if (itemModelAccessId.HasValue
                && modelNamesByAccessId.TryGetValue(itemModelAccessId.Value, out var modelName)
                && !string.IsNullOrWhiteSpace(modelName)
                && sqlItemModelIdsByName.TryGetValue(modelName, out var resolvedItemModelId))
            {
                itemModelId = resolvedItemModelId;
            }

            int? itemCategoryId = null;
            if (itemCategoryAccessId.HasValue
                && categoryNamesByAccessId.TryGetValue(itemCategoryAccessId.Value, out var categoryName)
                && !string.IsNullOrWhiteSpace(categoryName)
                && sqlItemCategoryIdsByName.TryGetValue(categoryName, out var resolvedItemCategoryId))
            {
                itemCategoryId = resolvedItemCategoryId;
            }

            int? existingItemId = null;
            if (importId.HasValue)
            {
                using var checkImportCmd = new SqlCommand(checkByImportSql, sqlConn);
                checkImportCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
                checkImportCmd.Parameters.Add(new SqlParameter("@ImportSource", SqlDbType.NVarChar, 200) { Value = "HYR" });
                checkImportCmd.Parameters.Add(new SqlParameter("@ImportId", SqlDbType.Int) { Value = importId.Value });
                var result = checkImportCmd.ExecuteScalar();
                if (result != null && result != DBNull.Value)
                {
                    existingItemId = Convert.ToInt32(result);
                }
            }
            else
            {
                using var checkRegNrCmd = new SqlCommand(checkByRegNrSql, sqlConn);
                checkRegNrCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
                checkRegNrCmd.Parameters.Add(new SqlParameter("@RegNr", SqlDbType.NVarChar, 100) { Value = regNr });
                var result = checkRegNrCmd.ExecuteScalar();
                if (result != null && result != DBNull.Value)
                {
                    existingItemId = Convert.ToInt32(result);
                }
            }

            if (existingItemId.HasValue)
            {
                using var updateCmd = new SqlCommand(updateSql, sqlConn);
                updateCmd.Parameters.Add(new SqlParameter("@Id", SqlDbType.Int) { Value = existingItemId.Value });
                updateCmd.Parameters.Add(new SqlParameter("@ItemCategoryId", SqlDbType.Int) { Value = (object?)itemCategoryId ?? DBNull.Value });
                updateCmd.Parameters.Add(new SqlParameter("@ItemModelId", SqlDbType.Int) { Value = (object?)itemModelId ?? DBNull.Value });
                updated += updateCmd.ExecuteNonQuery();
                continue;
            }

            using var insertCmd = new SqlCommand(insertSql, sqlConn);
            insertCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
            insertCmd.Parameters.Add(new SqlParameter("@ItemTypeCode", SqlDbType.NVarChar, 50) { Value = "VEHICLE" });
            insertCmd.Parameters.Add(new SqlParameter("@ItemCategoryId", SqlDbType.Int) { Value = (object?)itemCategoryId ?? DBNull.Value });
            insertCmd.Parameters.Add(new SqlParameter("@ItemModelId", SqlDbType.Int) { Value = (object?)itemModelId ?? DBNull.Value });
            insertCmd.Parameters.Add(new SqlParameter("@RegNr", SqlDbType.NVarChar, 100) { Value = regNr });
            insertCmd.Parameters.Add(new SqlParameter("@YearModel", SqlDbType.NVarChar, 50) { Value = yearModel });
            insertCmd.Parameters.Add(new SqlParameter("@Note", SqlDbType.NVarChar, 500) { Value = note });
            insertCmd.Parameters.Add(new SqlParameter("@MachineNr", SqlDbType.NVarChar, 100) { Value = machineNr });
            insertCmd.Parameters.Add(new SqlParameter("@ImportId", SqlDbType.Int) { Value = (object?)importId ?? DBNull.Value });
            insertCmd.Parameters.Add(new SqlParameter("@ImportSource", SqlDbType.NVarChar, 200) { Value = "HYR" });
            insertCmd.Parameters.Add(new SqlParameter("@IsActive", SqlDbType.Bit) { Value = isActive });
            insertCmd.Parameters.Add(new SqlParameter("@KmReading", SqlDbType.Int) { Value = (object?)kmReading ?? DBNull.Value });
            insertCmd.Parameters.Add(new SqlParameter("@Equipment", SqlDbType.NVarChar, 500) { Value = equipment });
            insertCmd.Parameters.Add(new SqlParameter("@Fuel", SqlDbType.NVarChar, 200) { Value = fuel });

            insertCmd.ExecuteNonQuery();
            inserted++;
        }

        Console.WriteLine($"Item import finished. Processed={processed}, Inserted={inserted}, Updated={updated}");
    }

    private static void EnsureOfficeExists(int officeId, OleDbConnection accessConn, SqlConnection sqlConn)
    {
        using var officeCheckCmd = new SqlCommand("SELECT 1 FROM [dbo].[Office] WHERE [Id] = @OfficeId", sqlConn);
        officeCheckCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
        var exists = officeCheckCmd.ExecuteScalar();
        if (exists != null && exists != DBNull.Value)
        {
            return;
        }

        string officeName;
        try
        {
            using var parmCmd = new OleDbCommand("SELECT TOP 1 Foretag FROM Parm", accessConn);
            var parmObj = parmCmd.ExecuteScalar();
            officeName = parmObj == null || parmObj == DBNull.Value ? string.Empty : parmObj.ToString()?.Trim() ?? string.Empty;
        }
        catch
        {
            officeName = string.Empty;
        }

        if (string.IsNullOrWhiteSpace(officeName)) officeName = $"Office {officeId}";

        const string insertOfficeSql = @"SET IDENTITY_INSERT [dbo].[Office] ON;
            INSERT INTO [dbo].[Office] ([Id],[Name],[FortnoxAccessToken],[FortnoxRefreshToken])
            VALUES (@Id,@Name,@AccessToken,@RefreshToken);
            SET IDENTITY_INSERT [dbo].[Office] OFF;";

        using var insertOfficeCmd = new SqlCommand(insertOfficeSql, sqlConn);
        insertOfficeCmd.Parameters.Add(new SqlParameter("@Id", SqlDbType.Int) { Value = officeId });
        insertOfficeCmd.Parameters.Add(new SqlParameter("@Name", SqlDbType.NVarChar, 200) { Value = officeName });
        insertOfficeCmd.Parameters.Add(new SqlParameter("@AccessToken", SqlDbType.NVarChar, -1) { Value = string.Empty });
        insertOfficeCmd.Parameters.Add(new SqlParameter("@RefreshToken", SqlDbType.NVarChar, 500) { Value = string.Empty });
        insertOfficeCmd.ExecuteNonQuery();
    }

    private static Dictionary<int, string> LoadAccessLookup(OleDbConnection accessConn, string tableName, string idColumn, string nameColumn)
    {
        var result = new Dictionary<int, string>();

        try
        {
            using var cmd = new OleDbCommand($"SELECT [{idColumn}], [{nameColumn}] FROM [{tableName}]", accessConn);
            using var reader = cmd.ExecuteReader();
            if (reader == null)
            {
                return result;
            }

            while (reader.Read())
            {
                if (reader.IsDBNull(0))
                {
                    continue;
                }

                var accessId = Convert.ToInt32(reader.GetValue(0));
                var name = reader.IsDBNull(1) ? string.Empty : reader.GetValue(1)?.ToString()?.Trim() ?? string.Empty;
                if (!string.IsNullOrWhiteSpace(name))
                {
                    result[accessId] = name;
                }
            }
        }
        catch
        {
            return result;
        }

        return result;
    }

    private static Dictionary<string, int> LoadSqlLookup(SqlConnection sqlConn, int officeId, string tableName)
    {
        var result = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        using var cmd = new SqlCommand($"SELECT [Id], [Name] FROM [dbo].[{tableName}] WHERE [OfficeId] = @OfficeId", sqlConn);
        cmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
        using var reader = cmd.ExecuteReader();

        while (reader.Read())
        {
            if (reader.IsDBNull(0) || reader.IsDBNull(1))
            {
                continue;
            }

            var id = reader.GetInt32(0);
            var name = reader.GetString(1).Trim();
            if (!string.IsNullOrWhiteSpace(name))
            {
                result[name] = id;
            }
        }

        return result;
    }

    private static HashSet<string> LoadColumns(OleDbConnection accessConn, string accessTableName)
    {
        using var schemaCmd = new OleDbCommand($"SELECT * FROM [{accessTableName}] WHERE 1=0", accessConn);
        using var schemaReader = schemaCmd.ExecuteReader();
        var schemaTable = schemaReader?.GetSchemaTable();

        var cols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (schemaTable == null)
        {
            return cols;
        }

        foreach (DataRow row in schemaTable.Rows)
        {
            var colName = row["ColumnName"]?.ToString();
            if (!string.IsNullOrWhiteSpace(colName))
            {
                cols.Add(colName);
            }
        }

        return cols;
    }

    private static void AddIfExists(HashSet<string> availableCols, List<string> selectedCols, string column)
    {
        if (availableCols.Contains(column) && !selectedCols.Contains(column, StringComparer.OrdinalIgnoreCase))
        {
            selectedCols.Add(column);
        }
    }

    private static string? ResolveFirstExisting(HashSet<string> availableCols, params string[] candidates)
    {
        foreach (var candidate in candidates)
        {
            if (availableCols.Contains(candidate)) return candidate;
        }

        return null;
    }

    private static string ReadString(OleDbDataReader reader, string? columnName)
    {
        if (string.IsNullOrWhiteSpace(columnName)) return string.Empty;

        try
        {
            var value = reader[columnName];
            return value == DBNull.Value ? string.Empty : value?.ToString()?.Trim() ?? string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }

    private static int? ReadNullableInt(OleDbDataReader reader, string? columnName)
    {
        if (string.IsNullOrWhiteSpace(columnName)) return null;

        try
        {
            var value = reader[columnName];
            if (value == null || value == DBNull.Value) return null;
            return Convert.ToInt32(value);
        }
        catch
        {
            return null;
        }
    }

    private static bool? ReadNullableBool(OleDbDataReader reader, string? columnName)
    {
        if (string.IsNullOrWhiteSpace(columnName)) return null;

        try
        {
            var value = reader[columnName];
            if (value == null || value == DBNull.Value) return null;
            return Convert.ToBoolean(value);
        }
        catch
        {
            return null;
        }
    }
}
