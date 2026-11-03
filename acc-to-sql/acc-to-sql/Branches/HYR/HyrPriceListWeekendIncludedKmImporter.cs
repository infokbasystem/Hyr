using System.Data;
using System.Data.OleDb;
using Microsoft.Data.SqlClient;

namespace Branches.HYR;

public static partial class HyrPriceListDayPriceImporter
{
    public static void ImportPriceListWeekendPriceIncludedKm(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "priWeekendInclKm_1")
    {
        if (string.IsNullOrWhiteSpace(accessConnectionString)) throw new ArgumentException("accessConnectionString is required", nameof(accessConnectionString));
        if (string.IsNullOrWhiteSpace(sqlConnectionString)) throw new ArgumentException("sqlConnectionString is required", nameof(sqlConnectionString));

        const string targetTableName = "PriceListWeekendPriceIncludedKm";
        Console.WriteLine($"Starting {targetTableName} import from Access table '{accessTableName}' for OfficeId={officeId}...");

        using var accessConn = new OleDbConnection(accessConnectionString);
        accessConn.Open();

        using var sqlConn = new SqlConnection(sqlConnectionString);
        sqlConn.Open();

        var accessColumns = LoadColumns(accessConn, accessTableName);
        var priceListVersionIdColumn = ResolveFirstExisting(accessColumns, "lngPricelistVersion_ID", "IngPricelistVersion_ID");
        var categoryIdColumn = ResolveFirstExisting(accessColumns, "lngCategory_ID", "IngCategory_ID");
        var fromDayOfWeekColumn = ResolveFirstExisting(accessColumns, "intStartWeekday");
        var fromTimeColumn = ResolveFirstExisting(accessColumns, "dteStartTime");
        var toDayOfWeekColumn = ResolveFirstExisting(accessColumns, "intEndWeekday");
        var toTimeColumn = ResolveFirstExisting(accessColumns, "dteEndTime");
        var weekendPriceColumn = ResolveFirstExisting(accessColumns, "sngWeekendInclKmPrice");
        var includedKmColumn = ResolveFirstExisting(accessColumns, "intInclKm");
        var pricePerExcessKmColumn = ResolveFirstExisting(accessColumns, "sngKmPrice");

        if (string.IsNullOrWhiteSpace(priceListVersionIdColumn)
            || string.IsNullOrWhiteSpace(categoryIdColumn)
            || string.IsNullOrWhiteSpace(fromDayOfWeekColumn)
            || string.IsNullOrWhiteSpace(fromTimeColumn)
            || string.IsNullOrWhiteSpace(toDayOfWeekColumn)
            || string.IsNullOrWhiteSpace(toTimeColumn)
            || string.IsNullOrWhiteSpace(weekendPriceColumn)
            || string.IsNullOrWhiteSpace(includedKmColumn)
            || string.IsNullOrWhiteSpace(pricePerExcessKmColumn))
        {
            Console.WriteLine($"{targetTableName} import skipped. Required columns were not found in Access table.");
            return;
        }

        var selectedColumns = new List<string>
        {
            priceListVersionIdColumn,
            categoryIdColumn,
            fromDayOfWeekColumn,
            fromTimeColumn,
            toDayOfWeekColumn,
            toTimeColumn,
            weekendPriceColumn,
            includedKmColumn,
            pricePerExcessKmColumn
        };

        var priceListNamesByAccessId = LoadAccessLookup(accessConn, "PricelistVersion", new[] { "lngPricelistVersion_ID", "IngPricelistVersion_ID" }, new[] { "strPricelistVersion" });
        var categoryNamesByAccessId = LoadAccessLookup(accessConn, "Kategori", new[] { "KategoriId", "lngCategory_ID", "IngCategory_ID" }, new[] { "KategoriText" });
        var sqlPriceListIdsByName = LoadSqlLookup(sqlConn, officeId, "PriceList");
        var sqlCategoryIdsByName = LoadSqlLookup(sqlConn, officeId, "ItemCategory");

        var selectSql = $"SELECT {string.Join(", ", selectedColumns.Select(c => "[" + c + "]"))} FROM [{accessTableName}]";
        using var selectCmd = new OleDbCommand(selectSql, accessConn);
        using var reader = selectCmd.ExecuteReader();

        if (reader == null)
        {
            Console.WriteLine($"No reader returned for {targetTableName}.");
            return;
        }

        const string checkSql = "SELECT [Id] FROM [dbo].[PriceListWeekendPriceIncludedKm] WHERE [PriceListId] = @PriceListId AND [ItemCategoryId] = @ItemCategoryId";
        const string insertSql = @"INSERT INTO [dbo].[PriceListWeekendPriceIncludedKm]
            ([PriceListId], [ItemCategoryId], [FromDayOfWeek], [FromTime], [ToDayOfWeek], [ToTime], [WeekendPrice], [IncludedKm], [PricePerExcessKm], [CreatedAt])
            VALUES
            (@PriceListId, @ItemCategoryId, @FromDayOfWeek, @FromTime, @ToDayOfWeek, @ToTime, @WeekendPrice, @IncludedKm, @PricePerExcessKm, @CreatedAt);";
        const string updateSql = @"UPDATE [dbo].[PriceListWeekendPriceIncludedKm]
            SET [FromDayOfWeek] = @FromDayOfWeek,
                [FromTime] = @FromTime,
                [ToDayOfWeek] = @ToDayOfWeek,
                [ToTime] = @ToTime,
                [WeekendPrice] = @WeekendPrice,
                [IncludedKm] = @IncludedKm,
                [PricePerExcessKm] = @PricePerExcessKm,
                [UpdatedAt] = @UpdatedAt
            WHERE [Id] = @Id;";

        var processed = 0;
        var inserted = 0;
        var updated = 0;
        var skippedUnmapped = 0;

        while (reader.Read())
        {
            processed++;

            var accessPriceListVersionId = ReadNullableInt(reader, priceListVersionIdColumn);
            var accessCategoryId = ReadNullableInt(reader, categoryIdColumn);
            if (!accessPriceListVersionId.HasValue || !accessCategoryId.HasValue)
            {
                skippedUnmapped++;
                continue;
            }

            if (!priceListNamesByAccessId.TryGetValue(accessPriceListVersionId.Value, out var priceListName)
                || string.IsNullOrWhiteSpace(priceListName)
                || !sqlPriceListIdsByName.TryGetValue(priceListName, out var sqlPriceListId))
            {
                skippedUnmapped++;
                continue;
            }

            if (!categoryNamesByAccessId.TryGetValue(accessCategoryId.Value, out var categoryName)
                || string.IsNullOrWhiteSpace(categoryName)
                || !sqlCategoryIdsByName.TryGetValue(categoryName, out var sqlCategoryId))
            {
                skippedUnmapped++;
                continue;
            }

            var fromDayOfWeek = ReadNullableInt(reader, fromDayOfWeekColumn);
            var fromTime = ReadNullableTime(reader, fromTimeColumn);
            var toDayOfWeek = ReadNullableInt(reader, toDayOfWeekColumn);
            var toTime = ReadNullableTime(reader, toTimeColumn);
            var weekendPrice = ReadNullableDecimal(reader, weekendPriceColumn);
            var includedKm = ReadNullableDecimal(reader, includedKmColumn);
            var pricePerExcessKm = ReadNullableDecimal(reader, pricePerExcessKmColumn);

            int? existingId = null;
            using (var checkCmd = new SqlCommand(checkSql, sqlConn))
            {
                checkCmd.Parameters.Add(new SqlParameter("@PriceListId", SqlDbType.Int) { Value = sqlPriceListId });
                checkCmd.Parameters.Add(new SqlParameter("@ItemCategoryId", SqlDbType.Int) { Value = sqlCategoryId });
                var existingObj = checkCmd.ExecuteScalar();
                if (existingObj != null && existingObj != DBNull.Value)
                {
                    existingId = Convert.ToInt32(existingObj);
                }
            }

            if (existingId.HasValue)
            {
                using var updateCmd = new SqlCommand(updateSql, sqlConn);
                updateCmd.Parameters.Add(new SqlParameter("@Id", SqlDbType.Int) { Value = existingId.Value });
                updateCmd.Parameters.Add(new SqlParameter("@UpdatedAt", SqlDbType.DateTime2) { Value = DateTime.UtcNow });
                updateCmd.Parameters.Add(new SqlParameter("@FromDayOfWeek", SqlDbType.Int) { Value = (object?)fromDayOfWeek ?? DBNull.Value });
                updateCmd.Parameters.Add(new SqlParameter("@FromTime", SqlDbType.Time) { Value = (object?)fromTime ?? DBNull.Value });
                updateCmd.Parameters.Add(new SqlParameter("@ToDayOfWeek", SqlDbType.Int) { Value = (object?)toDayOfWeek ?? DBNull.Value });
                updateCmd.Parameters.Add(new SqlParameter("@ToTime", SqlDbType.Time) { Value = (object?)toTime ?? DBNull.Value });
                updateCmd.Parameters.Add(CreateDecimalParameter("@WeekendPrice", weekendPrice));
                updateCmd.Parameters.Add(CreateDecimalParameter("@IncludedKm", includedKm));
                updateCmd.Parameters.Add(CreateDecimalParameter("@PricePerExcessKm", pricePerExcessKm));
                updated += updateCmd.ExecuteNonQuery();
                continue;
            }

            using (var insertCmd = new SqlCommand(insertSql, sqlConn))
            {
                insertCmd.Parameters.Add(new SqlParameter("@PriceListId", SqlDbType.Int) { Value = sqlPriceListId });
                insertCmd.Parameters.Add(new SqlParameter("@ItemCategoryId", SqlDbType.Int) { Value = sqlCategoryId });
                insertCmd.Parameters.Add(new SqlParameter("@CreatedAt", SqlDbType.DateTime2) { Value = DateTime.UtcNow });
                insertCmd.Parameters.Add(new SqlParameter("@FromDayOfWeek", SqlDbType.Int) { Value = (object?)fromDayOfWeek ?? DBNull.Value });
                insertCmd.Parameters.Add(new SqlParameter("@FromTime", SqlDbType.Time) { Value = (object?)fromTime ?? DBNull.Value });
                insertCmd.Parameters.Add(new SqlParameter("@ToDayOfWeek", SqlDbType.Int) { Value = (object?)toDayOfWeek ?? DBNull.Value });
                insertCmd.Parameters.Add(new SqlParameter("@ToTime", SqlDbType.Time) { Value = (object?)toTime ?? DBNull.Value });
                insertCmd.Parameters.Add(CreateDecimalParameter("@WeekendPrice", weekendPrice));
                insertCmd.Parameters.Add(CreateDecimalParameter("@IncludedKm", includedKm));
                insertCmd.Parameters.Add(CreateDecimalParameter("@PricePerExcessKm", pricePerExcessKm));
                inserted += insertCmd.ExecuteNonQuery();
            }
        }

        Console.WriteLine($"{targetTableName} import finished. Processed={processed}, Inserted={inserted}, Updated={updated}, SkippedUnmapped={skippedUnmapped}");
    }
}
