using System.Data;
using System.Data.OleDb;
using Microsoft.Data.SqlClient;

namespace Branches.HYR;

public static partial class HyrPriceListDayPriceImporter
{
    public static void ImportPriceListDayPrices(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "priDay_1")
    {
        ImportPriceListCategoryPrices(
            officeId,
            accessConnectionString,
            sqlConnectionString,
            accessTableName,
            targetTableName: "PriceListDayPrice",
            includePricePerKm: true);
    }

    public static void ImportPriceListDayPriceFreeKm(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "priDayFreeKm_1")
    {
        ImportPriceListCategoryPrices(
            officeId,
            accessConnectionString,
            sqlConnectionString,
            accessTableName,
            targetTableName: "PriceListDayPriceFreeKm",
            includePricePerKm: false);
    }

    public static void ImportPriceListThirtyDayPriceIncludedKm(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "priMonthInclKm_1")
    {
        if (string.IsNullOrWhiteSpace(accessConnectionString)) throw new ArgumentException("accessConnectionString is required", nameof(accessConnectionString));
        if (string.IsNullOrWhiteSpace(sqlConnectionString)) throw new ArgumentException("sqlConnectionString is required", nameof(sqlConnectionString));

        const string targetTableName = "PriceListThirtyDayPriceIncludedKm";
        Console.WriteLine($"Starting {targetTableName} import from Access table '{accessTableName}' for OfficeId={officeId}...");

        using var accessConn = new OleDbConnection(accessConnectionString);
        accessConn.Open();

        using var sqlConn = new SqlConnection(sqlConnectionString);
        sqlConn.Open();

        var accessColumns = LoadColumns(accessConn, accessTableName);
        var priceListVersionIdColumn = ResolveFirstExisting(accessColumns, "lngPricelistVersion_ID", "IngPricelistVersion_ID");
        var categoryIdColumn = ResolveFirstExisting(accessColumns, "lngCategory_ID", "IngCategory_ID");
        var pricePer30DaysColumn = ResolveFirstExisting(accessColumns, "sngMonthPrice");
        var includedKmPer30DaysColumn = ResolveFirstExisting(accessColumns, "intInclKmPerMonth");
        var pricePerExtraDayColumn = ResolveFirstExisting(accessColumns, "sngOverDayPrice");
        var includedKmPerExtraDayColumn = ResolveFirstExisting(accessColumns, "intOverDayInclKm");
        var pricePerExcessKmColumn = ResolveFirstExisting(accessColumns, "sngOverKmPrice");

        if (string.IsNullOrWhiteSpace(priceListVersionIdColumn)
            || string.IsNullOrWhiteSpace(categoryIdColumn)
            || string.IsNullOrWhiteSpace(pricePer30DaysColumn)
            || string.IsNullOrWhiteSpace(includedKmPer30DaysColumn)
            || string.IsNullOrWhiteSpace(pricePerExtraDayColumn)
            || string.IsNullOrWhiteSpace(includedKmPerExtraDayColumn)
            || string.IsNullOrWhiteSpace(pricePerExcessKmColumn))
        {
            Console.WriteLine($"{targetTableName} import skipped. Required columns were not found in Access table.");
            return;
        }

        var selectedColumns = new List<string>
        {
            priceListVersionIdColumn,
            categoryIdColumn,
            pricePer30DaysColumn,
            includedKmPer30DaysColumn,
            pricePerExtraDayColumn,
            includedKmPerExtraDayColumn,
            pricePerExcessKmColumn
        };

        var priceListNamesByAccessId = LoadAccessLookup(
            accessConn,
            "PricelistVersion",
            new[] { "lngPricelistVersion_ID", "IngPricelistVersion_ID" },
            new[] { "strPricelistVersion" });

        var categoryNamesByAccessId = LoadAccessLookup(
            accessConn,
            "Kategori",
            new[] { "KategoriId", "lngCategory_ID", "IngCategory_ID" },
            new[] { "KategoriText" });

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

        const string checkSql = "SELECT [Id] FROM [dbo].[PriceListThirtyDayPriceIncludedKm] WHERE [PriceListId] = @PriceListId AND [ItemCategoryId] = @ItemCategoryId";
        const string insertSql = @"INSERT INTO [dbo].[PriceListThirtyDayPriceIncludedKm]
            ([PriceListId], [ItemCategoryId], [PricePer30Days], [IncludedKmPer30Days], [PricePerExtraDay], [IncludedKmPerExtraDay], [PricePerExcessKm], [CreatedAt])
            VALUES
            (@PriceListId, @ItemCategoryId, @PricePer30Days, @IncludedKmPer30Days, @PricePerExtraDay, @IncludedKmPerExtraDay, @PricePerExcessKm, @CreatedAt);";
        const string updateSql = @"UPDATE [dbo].[PriceListThirtyDayPriceIncludedKm]
            SET [PricePer30Days] = @PricePer30Days,
                [IncludedKmPer30Days] = @IncludedKmPer30Days,
                [PricePerExtraDay] = @PricePerExtraDay,
                [IncludedKmPerExtraDay] = @IncludedKmPerExtraDay,
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

            var pricePer30Days = ReadNullableDecimal(reader, pricePer30DaysColumn);
            var includedKmPer30Days = ReadNullableDecimal(reader, includedKmPer30DaysColumn);
            var pricePerExtraDay = ReadNullableDecimal(reader, pricePerExtraDayColumn);
            var includedKmPerExtraDay = ReadNullableDecimal(reader, includedKmPerExtraDayColumn);
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
                updateCmd.Parameters.Add(CreateDecimalParameter("@PricePer30Days", pricePer30Days));
                updateCmd.Parameters.Add(CreateDecimalParameter("@IncludedKmPer30Days", includedKmPer30Days));
                updateCmd.Parameters.Add(CreateDecimalParameter("@PricePerExtraDay", pricePerExtraDay));
                updateCmd.Parameters.Add(CreateDecimalParameter("@IncludedKmPerExtraDay", includedKmPerExtraDay));
                updateCmd.Parameters.Add(CreateDecimalParameter("@PricePerExcessKm", pricePerExcessKm));
                updated += updateCmd.ExecuteNonQuery();
                continue;
            }

            using (var insertCmd = new SqlCommand(insertSql, sqlConn))
            {
                insertCmd.Parameters.Add(new SqlParameter("@PriceListId", SqlDbType.Int) { Value = sqlPriceListId });
                insertCmd.Parameters.Add(new SqlParameter("@ItemCategoryId", SqlDbType.Int) { Value = sqlCategoryId });
                insertCmd.Parameters.Add(new SqlParameter("@CreatedAt", SqlDbType.DateTime2) { Value = DateTime.UtcNow });
                insertCmd.Parameters.Add(CreateDecimalParameter("@PricePer30Days", pricePer30Days));
                insertCmd.Parameters.Add(CreateDecimalParameter("@IncludedKmPer30Days", includedKmPer30Days));
                insertCmd.Parameters.Add(CreateDecimalParameter("@PricePerExtraDay", pricePerExtraDay));
                insertCmd.Parameters.Add(CreateDecimalParameter("@IncludedKmPerExtraDay", includedKmPerExtraDay));
                insertCmd.Parameters.Add(CreateDecimalParameter("@PricePerExcessKm", pricePerExcessKm));
                inserted += insertCmd.ExecuteNonQuery();
            }
        }

        Console.WriteLine($"{targetTableName} import finished. Processed={processed}, Inserted={inserted}, Updated={updated}, SkippedUnmapped={skippedUnmapped}");
    }

    public static void ImportPriceListWeekendPrices(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "priWeekend_1")
    {
        if (string.IsNullOrWhiteSpace(accessConnectionString)) throw new ArgumentException("accessConnectionString is required", nameof(accessConnectionString));
        if (string.IsNullOrWhiteSpace(sqlConnectionString)) throw new ArgumentException("sqlConnectionString is required", nameof(sqlConnectionString));

        const string targetTableName = "PriceListWeekendPrice";
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
        var weekendPriceColumn = ResolveFirstExisting(accessColumns, "sngWeekendNoKmPrice");
        var pricePerKmColumn = ResolveFirstExisting(accessColumns, "sngKmPrice");

        if (string.IsNullOrWhiteSpace(priceListVersionIdColumn)
            || string.IsNullOrWhiteSpace(categoryIdColumn)
            || string.IsNullOrWhiteSpace(fromDayOfWeekColumn)
            || string.IsNullOrWhiteSpace(fromTimeColumn)
            || string.IsNullOrWhiteSpace(toDayOfWeekColumn)
            || string.IsNullOrWhiteSpace(toTimeColumn)
            || string.IsNullOrWhiteSpace(weekendPriceColumn)
            || string.IsNullOrWhiteSpace(pricePerKmColumn))
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
            pricePerKmColumn
        };

        var priceListNamesByAccessId = LoadAccessLookup(
            accessConn,
            "PricelistVersion",
            new[] { "lngPricelistVersion_ID", "IngPricelistVersion_ID" },
            new[] { "strPricelistVersion" });

        var categoryNamesByAccessId = LoadAccessLookup(
            accessConn,
            "Kategori",
            new[] { "KategoriId", "lngCategory_ID", "IngCategory_ID" },
            new[] { "KategoriText" });

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

        const string checkSql = "SELECT [Id] FROM [dbo].[PriceListWeekendPrice] WHERE [PriceListId] = @PriceListId AND [ItemCategoryId] = @ItemCategoryId";
        const string insertSql = @"INSERT INTO [dbo].[PriceListWeekendPrice]
            ([PriceListId], [ItemCategoryId], [FromDayOfWeek], [FromTime], [ToDayOfWeek], [ToTime], [WeekendPrice], [PricePerKm], [CreatedAt])
            VALUES
            (@PriceListId, @ItemCategoryId, @FromDayOfWeek, @FromTime, @ToDayOfWeek, @ToTime, @WeekendPrice, @PricePerKm, @CreatedAt);";
        const string updateSql = @"UPDATE [dbo].[PriceListWeekendPrice]
            SET [FromDayOfWeek] = @FromDayOfWeek,
                [FromTime] = @FromTime,
                [ToDayOfWeek] = @ToDayOfWeek,
                [ToTime] = @ToTime,
                [WeekendPrice] = @WeekendPrice,
                [PricePerKm] = @PricePerKm,
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
            var pricePerKm = ReadNullableDecimal(reader, pricePerKmColumn);

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
                updateCmd.Parameters.Add(CreateDecimalParameter("@PricePerKm", pricePerKm));
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
                insertCmd.Parameters.Add(CreateDecimalParameter("@PricePerKm", pricePerKm));
                inserted += insertCmd.ExecuteNonQuery();
            }
        }

        Console.WriteLine($"{targetTableName} import finished. Processed={processed}, Inserted={inserted}, Updated={updated}, SkippedUnmapped={skippedUnmapped}");
    }

    public static void ImportPriceListWeekendPriceFreeKm(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "priWeekendFreeKm_1")
    {
        if (string.IsNullOrWhiteSpace(accessConnectionString)) throw new ArgumentException("accessConnectionString is required", nameof(accessConnectionString));
        if (string.IsNullOrWhiteSpace(sqlConnectionString)) throw new ArgumentException("sqlConnectionString is required", nameof(sqlConnectionString));

        const string targetTableName = "PriceListWeekendPriceFreeKm";
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
        var weekendPriceColumn = ResolveFirstExisting(accessColumns, "sngWeekendPrice", "sngWeekendNoKmPrice");

        if (string.IsNullOrWhiteSpace(priceListVersionIdColumn)
            || string.IsNullOrWhiteSpace(categoryIdColumn)
            || string.IsNullOrWhiteSpace(fromDayOfWeekColumn)
            || string.IsNullOrWhiteSpace(fromTimeColumn)
            || string.IsNullOrWhiteSpace(toDayOfWeekColumn)
            || string.IsNullOrWhiteSpace(toTimeColumn)
            || string.IsNullOrWhiteSpace(weekendPriceColumn))
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
            weekendPriceColumn
        };

        var priceListNamesByAccessId = LoadAccessLookup(
            accessConn,
            "PricelistVersion",
            new[] { "lngPricelistVersion_ID", "IngPricelistVersion_ID" },
            new[] { "strPricelistVersion" });

        var categoryNamesByAccessId = LoadAccessLookup(
            accessConn,
            "Kategori",
            new[] { "KategoriId", "lngCategory_ID", "IngCategory_ID" },
            new[] { "KategoriText" });

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

        const string checkSql = "SELECT [Id] FROM [dbo].[PriceListWeekendPriceFreeKm] WHERE [PriceListId] = @PriceListId AND [ItemCategoryId] = @ItemCategoryId";
        const string insertSql = @"INSERT INTO [dbo].[PriceListWeekendPriceFreeKm]
            ([PriceListId], [ItemCategoryId], [FromDayOfWeek], [FromTime], [ToDayOfWeek], [ToTime], [WeekendPrice], [CreatedAt])
            VALUES
            (@PriceListId, @ItemCategoryId, @FromDayOfWeek, @FromTime, @ToDayOfWeek, @ToTime, @WeekendPrice, @CreatedAt);";
        const string updateSql = @"UPDATE [dbo].[PriceListWeekendPriceFreeKm]
            SET [FromDayOfWeek] = @FromDayOfWeek,
                [FromTime] = @FromTime,
                [ToDayOfWeek] = @ToDayOfWeek,
                [ToTime] = @ToTime,
                [WeekendPrice] = @WeekendPrice,
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
                inserted += insertCmd.ExecuteNonQuery();
            }
        }

        Console.WriteLine($"{targetTableName} import finished. Processed={processed}, Inserted={inserted}, Updated={updated}, SkippedUnmapped={skippedUnmapped}");
    }

    public static void ImportPriceListWeekPriceFreeKm(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "priWeekFreeKm_1")
    {
        if (string.IsNullOrWhiteSpace(accessConnectionString)) throw new ArgumentException("accessConnectionString is required", nameof(accessConnectionString));
        if (string.IsNullOrWhiteSpace(sqlConnectionString)) throw new ArgumentException("sqlConnectionString is required", nameof(sqlConnectionString));

        const string targetTableName = "PriceListWeekPriceFreeKm";
        Console.WriteLine($"Starting {targetTableName} import from Access table '{accessTableName}' for OfficeId={officeId}...");

        using var accessConn = new OleDbConnection(accessConnectionString);
        accessConn.Open();

        using var sqlConn = new SqlConnection(sqlConnectionString);
        sqlConn.Open();

        var accessColumns = LoadColumns(accessConn, accessTableName);
        var priceListVersionIdColumn = ResolveFirstExisting(accessColumns, "lngPricelistVersion_ID", "IngPricelistVersion_ID");
        var categoryIdColumn = ResolveFirstExisting(accessColumns, "lngCategory_ID", "IngCategory_ID");
        var pricePerWeekColumn = ResolveFirstExisting(accessColumns, "sngWeekPrice");
        var pricePerExtraDayColumn = ResolveFirstExisting(accessColumns, "sngOverDayPrice");

        if (string.IsNullOrWhiteSpace(priceListVersionIdColumn)
            || string.IsNullOrWhiteSpace(categoryIdColumn)
            || string.IsNullOrWhiteSpace(pricePerWeekColumn)
            || string.IsNullOrWhiteSpace(pricePerExtraDayColumn))
        {
            Console.WriteLine($"{targetTableName} import skipped. Required columns were not found in Access table.");
            return;
        }

        var selectedColumns = new List<string>
        {
            priceListVersionIdColumn,
            categoryIdColumn,
            pricePerWeekColumn,
            pricePerExtraDayColumn
        };

        var priceListNamesByAccessId = LoadAccessLookup(
            accessConn,
            "PricelistVersion",
            new[] { "lngPricelistVersion_ID", "IngPricelistVersion_ID" },
            new[] { "strPricelistVersion" });

        var categoryNamesByAccessId = LoadAccessLookup(
            accessConn,
            "Kategori",
            new[] { "KategoriId", "lngCategory_ID", "IngCategory_ID" },
            new[] { "KategoriText" });

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

        const string checkSql = "SELECT [Id] FROM [dbo].[PriceListWeekPriceFreeKm] WHERE [PriceListId] = @PriceListId AND [ItemCategoryId] = @ItemCategoryId";
        const string insertSql = @"INSERT INTO [dbo].[PriceListWeekPriceFreeKm]
            ([PriceListId], [ItemCategoryId], [PricePerWeek], [PricePerExtraDay], [CreatedAt])
            VALUES
            (@PriceListId, @ItemCategoryId, @PricePerWeek, @PricePerExtraDay, @CreatedAt);";
        const string updateSql = @"UPDATE [dbo].[PriceListWeekPriceFreeKm]
            SET [PricePerWeek] = @PricePerWeek,
                [PricePerExtraDay] = @PricePerExtraDay,
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

            var pricePerWeek = ReadNullableDecimal(reader, pricePerWeekColumn);
            var pricePerExtraDay = ReadNullableDecimal(reader, pricePerExtraDayColumn);

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
                updateCmd.Parameters.Add(CreateDecimalParameter("@PricePerWeek", pricePerWeek));
                updateCmd.Parameters.Add(CreateDecimalParameter("@PricePerExtraDay", pricePerExtraDay));
                updated += updateCmd.ExecuteNonQuery();
                continue;
            }

            using (var insertCmd = new SqlCommand(insertSql, sqlConn))
            {
                insertCmd.Parameters.Add(new SqlParameter("@PriceListId", SqlDbType.Int) { Value = sqlPriceListId });
                insertCmd.Parameters.Add(new SqlParameter("@ItemCategoryId", SqlDbType.Int) { Value = sqlCategoryId });
                insertCmd.Parameters.Add(new SqlParameter("@CreatedAt", SqlDbType.DateTime2) { Value = DateTime.UtcNow });
                insertCmd.Parameters.Add(CreateDecimalParameter("@PricePerWeek", pricePerWeek));
                insertCmd.Parameters.Add(CreateDecimalParameter("@PricePerExtraDay", pricePerExtraDay));
                inserted += insertCmd.ExecuteNonQuery();
            }
        }

        Console.WriteLine($"{targetTableName} import finished. Processed={processed}, Inserted={inserted}, Updated={updated}, SkippedUnmapped={skippedUnmapped}");
    }

    public static void ImportPriceListWeekPriceIncludedKm(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "priWeekInclKm_1")
    {
        if (string.IsNullOrWhiteSpace(accessConnectionString)) throw new ArgumentException("accessConnectionString is required", nameof(accessConnectionString));
        if (string.IsNullOrWhiteSpace(sqlConnectionString)) throw new ArgumentException("sqlConnectionString is required", nameof(sqlConnectionString));

        const string targetTableName = "PriceListWeekPriceIncludedKm";
        Console.WriteLine($"Starting {targetTableName} import from Access table '{accessTableName}' for OfficeId={officeId}...");

        using var accessConn = new OleDbConnection(accessConnectionString);
        accessConn.Open();

        using var sqlConn = new SqlConnection(sqlConnectionString);
        sqlConn.Open();

        var accessColumns = LoadColumns(accessConn, accessTableName);
        var priceListVersionIdColumn = ResolveFirstExisting(accessColumns, "lngPricelistVersion_ID", "IngPricelistVersion_ID");
        var categoryIdColumn = ResolveFirstExisting(accessColumns, "lngCategory_ID", "IngCategory_ID");
        var pricePerWeekColumn = ResolveFirstExisting(accessColumns, "sngWeekPrice");
        var includedKmPerWeekColumn = ResolveFirstExisting(accessColumns, "intInclKmPerWeek");
        var pricePerExtraDayColumn = ResolveFirstExisting(accessColumns, "sngOverDayPrice");
        var includedKmPerExtraDayColumn = ResolveFirstExisting(accessColumns, "intOverDayInclKm");
        var pricePerExcessKmColumn = ResolveFirstExisting(accessColumns, "sngOverKmPrice");

        if (string.IsNullOrWhiteSpace(priceListVersionIdColumn)
            || string.IsNullOrWhiteSpace(categoryIdColumn)
            || string.IsNullOrWhiteSpace(pricePerWeekColumn)
            || string.IsNullOrWhiteSpace(includedKmPerWeekColumn)
            || string.IsNullOrWhiteSpace(pricePerExtraDayColumn)
            || string.IsNullOrWhiteSpace(includedKmPerExtraDayColumn)
            || string.IsNullOrWhiteSpace(pricePerExcessKmColumn))
        {
            Console.WriteLine($"{targetTableName} import skipped. Required columns were not found in Access table.");
            return;
        }

        var selectedColumns = new List<string>
        {
            priceListVersionIdColumn,
            categoryIdColumn,
            pricePerWeekColumn,
            includedKmPerWeekColumn,
            pricePerExtraDayColumn,
            includedKmPerExtraDayColumn,
            pricePerExcessKmColumn
        };

        var priceListNamesByAccessId = LoadAccessLookup(
            accessConn,
            "PricelistVersion",
            new[] { "lngPricelistVersion_ID", "IngPricelistVersion_ID" },
            new[] { "strPricelistVersion" });

        var categoryNamesByAccessId = LoadAccessLookup(
            accessConn,
            "Kategori",
            new[] { "KategoriId", "lngCategory_ID", "IngCategory_ID" },
            new[] { "KategoriText" });

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

        const string checkSql = "SELECT [Id] FROM [dbo].[PriceListWeekPriceIncludedKm] WHERE [PriceListId] = @PriceListId AND [ItemCategoryId] = @ItemCategoryId";
        const string insertSql = @"INSERT INTO [dbo].[PriceListWeekPriceIncludedKm] ([PriceListId], [ItemCategoryId], [PricePerWeek], [IncludedKmPerWeek], [PricePerExtraDay], [IncludedKmPerExtraDay], [PricePerExcessKm], [CreatedAt]) VALUES (@PriceListId, @ItemCategoryId, @PricePerWeek, @IncludedKmPerWeek, @PricePerExtraDay, @IncludedKmPerExtraDay, @PricePerExcessKm, @CreatedAt);";
        const string updateSql = @"UPDATE [dbo].[PriceListWeekPriceIncludedKm] SET [PricePerWeek] = @PricePerWeek, [IncludedKmPerWeek] = @IncludedKmPerWeek, [PricePerExtraDay] = @PricePerExtraDay, [IncludedKmPerExtraDay] = @IncludedKmPerExtraDay, [PricePerExcessKm] = @PricePerExcessKm, [UpdatedAt] = @UpdatedAt WHERE [Id] = @Id;";

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

            var pricePerWeek = ReadNullableDecimal(reader, pricePerWeekColumn);
            var includedKmPerWeek = ReadNullableDecimal(reader, includedKmPerWeekColumn);
            var pricePerExtraDay = ReadNullableDecimal(reader, pricePerExtraDayColumn);
            var includedKmPerExtraDay = ReadNullableDecimal(reader, includedKmPerExtraDayColumn);
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
                updateCmd.Parameters.Add(CreateDecimalParameter("@PricePerWeek", pricePerWeek));
                updateCmd.Parameters.Add(CreateDecimalParameter("@IncludedKmPerWeek", includedKmPerWeek));
                updateCmd.Parameters.Add(CreateDecimalParameter("@PricePerExtraDay", pricePerExtraDay));
                updateCmd.Parameters.Add(CreateDecimalParameter("@IncludedKmPerExtraDay", includedKmPerExtraDay));
                updateCmd.Parameters.Add(CreateDecimalParameter("@PricePerExcessKm", pricePerExcessKm));
                updated += updateCmd.ExecuteNonQuery();
                continue;
            }

            using (var insertCmd = new SqlCommand(insertSql, sqlConn))
            {
                insertCmd.Parameters.Add(new SqlParameter("@PriceListId", SqlDbType.Int) { Value = sqlPriceListId });
                insertCmd.Parameters.Add(new SqlParameter("@ItemCategoryId", SqlDbType.Int) { Value = sqlCategoryId });
                insertCmd.Parameters.Add(new SqlParameter("@CreatedAt", SqlDbType.DateTime2) { Value = DateTime.UtcNow });
                insertCmd.Parameters.Add(CreateDecimalParameter("@PricePerWeek", pricePerWeek));
                insertCmd.Parameters.Add(CreateDecimalParameter("@IncludedKmPerWeek", includedKmPerWeek));
                insertCmd.Parameters.Add(CreateDecimalParameter("@PricePerExtraDay", pricePerExtraDay));
                insertCmd.Parameters.Add(CreateDecimalParameter("@IncludedKmPerExtraDay", includedKmPerExtraDay));
                insertCmd.Parameters.Add(CreateDecimalParameter("@PricePerExcessKm", pricePerExcessKm));
                inserted += insertCmd.ExecuteNonQuery();
            }
        }

        Console.WriteLine($"{targetTableName} import finished. Processed={processed}, Inserted={inserted}, Updated={updated}, SkippedUnmapped={skippedUnmapped}");
    }

    private static void ImportPriceListCategoryPrices(
        int officeId,
        string accessConnectionString,
        string sqlConnectionString,
        string accessTableName,
        string targetTableName,
        bool includePricePerKm)
    {
        if (string.IsNullOrWhiteSpace(accessConnectionString)) throw new ArgumentException("accessConnectionString is required", nameof(accessConnectionString));
        if (string.IsNullOrWhiteSpace(sqlConnectionString)) throw new ArgumentException("sqlConnectionString is required", nameof(sqlConnectionString));

        Console.WriteLine($"Starting {targetTableName} import from Access table '{accessTableName}' for OfficeId={officeId}...");

        using var accessConn = new OleDbConnection(accessConnectionString);
        accessConn.Open();

        using var sqlConn = new SqlConnection(sqlConnectionString);
        sqlConn.Open();

        var accessColumns = LoadColumns(accessConn, accessTableName);
        var priceListVersionIdColumn = ResolveFirstExisting(accessColumns, "lngPricelistVersion_ID", "IngPricelistVersion_ID");
        var categoryIdColumn = ResolveFirstExisting(accessColumns, "lngCategory_ID", "IngCategory_ID");
        var pricePerDayColumn = ResolveFirstExisting(accessColumns, "sngPrice");
        var pricePerKmColumn = includePricePerKm ? ResolveFirstExisting(accessColumns, "sngKm") : null;

        if (string.IsNullOrWhiteSpace(priceListVersionIdColumn)
            || string.IsNullOrWhiteSpace(categoryIdColumn)
            || string.IsNullOrWhiteSpace(pricePerDayColumn)
            || (includePricePerKm && string.IsNullOrWhiteSpace(pricePerKmColumn)))
        {
            Console.WriteLine($"{targetTableName} import skipped. Required columns were not found in Access table.");
            return;
        }

        var selectedColumns = new List<string> { priceListVersionIdColumn, categoryIdColumn, pricePerDayColumn };
        if (!string.IsNullOrWhiteSpace(pricePerKmColumn))
        {
            selectedColumns.Add(pricePerKmColumn);
        }

        var priceListNamesByAccessId = LoadAccessLookup(
            accessConn,
            "PricelistVersion",
            new[] { "lngPricelistVersion_ID", "IngPricelistVersion_ID" },
            new[] { "strPricelistVersion" });

        var categoryNamesByAccessId = LoadAccessLookup(
            accessConn,
            "Kategori",
            new[] { "KategoriId", "lngCategory_ID", "IngCategory_ID" },
            new[] { "KategoriText" });

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

        var checkSql = $"SELECT [Id] FROM [dbo].[{targetTableName}] WHERE [PriceListId] = @PriceListId AND [ItemCategoryId] = @ItemCategoryId";
        var insertSql = includePricePerKm
            ? $@"INSERT INTO [dbo].[{targetTableName}] ([PriceListId], [ItemCategoryId], [PricePerDay], [PricePerKm], [CreatedAt])
                VALUES (@PriceListId, @ItemCategoryId, @PricePerDay, @PricePerKm, @CreatedAt);"
            : $@"INSERT INTO [dbo].[{targetTableName}] ([PriceListId], [ItemCategoryId], [PricePerDay], [CreatedAt])
                VALUES (@PriceListId, @ItemCategoryId, @PricePerDay, @CreatedAt);";

        var updateSql = includePricePerKm
            ? $@"UPDATE [dbo].[{targetTableName}]
                SET [PricePerDay] = @PricePerDay,
                    [PricePerKm] = @PricePerKm,
                    [UpdatedAt] = @UpdatedAt
                WHERE [Id] = @Id;"
            : $@"UPDATE [dbo].[{targetTableName}]
                SET [PricePerDay] = @PricePerDay,
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

            var pricePerDay = ReadNullableDecimal(reader, pricePerDayColumn);
            var pricePerKm = includePricePerKm ? ReadNullableDecimal(reader, pricePerKmColumn) : null;

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
                updateCmd.Parameters.Add(CreateDecimalParameter("@PricePerDay", pricePerDay));
                if (includePricePerKm)
                {
                    updateCmd.Parameters.Add(CreateDecimalParameter("@PricePerKm", pricePerKm));
                }

                updated += updateCmd.ExecuteNonQuery();
                continue;
            }

            using (var insertCmd = new SqlCommand(insertSql, sqlConn))
            {
                insertCmd.Parameters.Add(new SqlParameter("@PriceListId", SqlDbType.Int) { Value = sqlPriceListId });
                insertCmd.Parameters.Add(new SqlParameter("@ItemCategoryId", SqlDbType.Int) { Value = sqlCategoryId });
                insertCmd.Parameters.Add(new SqlParameter("@CreatedAt", SqlDbType.DateTime2) { Value = DateTime.UtcNow });
                insertCmd.Parameters.Add(CreateDecimalParameter("@PricePerDay", pricePerDay));
                if (includePricePerKm)
                {
                    insertCmd.Parameters.Add(CreateDecimalParameter("@PricePerKm", pricePerKm));
                }

                inserted += insertCmd.ExecuteNonQuery();
            }
        }

        Console.WriteLine($"{targetTableName} import finished. Processed={processed}, Inserted={inserted}, Updated={updated}, SkippedUnmapped={skippedUnmapped}");
    }

    private static SqlParameter CreateDecimalParameter(string name, decimal? value)
    {
        return new SqlParameter(name, SqlDbType.Decimal)
        {
            Precision = 10,
            Scale = 5,
            Value = (object?)value ?? DBNull.Value
        };
    }

    private static Dictionary<int, string> LoadAccessLookup(OleDbConnection accessConn, string tableName, string[] idCandidates, string[] nameCandidates)
    {
        var result = new Dictionary<int, string>();
        try
        {
            var accessColumns = LoadColumns(accessConn, tableName);
            var idColumn = ResolveFirstExisting(accessColumns, idCandidates);
            var nameColumn = ResolveFirstExisting(accessColumns, nameCandidates);

            if (string.IsNullOrWhiteSpace(idColumn) || string.IsNullOrWhiteSpace(nameColumn))
            {
                return result;
            }

            using var cmd = new OleDbCommand($"SELECT [{idColumn}], [{nameColumn}] FROM [{tableName}]", accessConn);
            using var reader = cmd.ExecuteReader();
            if (reader == null)
            {
                return result;
            }

            while (reader.Read())
            {
                if (reader.IsDBNull(0) || reader.IsDBNull(1))
                {
                    continue;
                }

                var id = Convert.ToInt32(reader.GetValue(0));
                var name = reader.GetValue(1)?.ToString()?.Trim() ?? string.Empty;
                if (!string.IsNullOrWhiteSpace(name))
                {
                    result[id] = name;
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

    private static string? ResolveFirstExisting(HashSet<string> availableCols, params string[] candidates)
    {
        foreach (var candidate in candidates)
        {
            if (availableCols.Contains(candidate))
            {
                return candidate;
            }
        }

        return null;
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

    private static decimal? ReadNullableDecimal(OleDbDataReader reader, string? columnName)
    {
        if (string.IsNullOrWhiteSpace(columnName)) return null;

        try
        {
            var value = reader[columnName];
            if (value == null || value == DBNull.Value) return null;
            return Convert.ToDecimal(value);
        }
        catch
        {
            return null;
        }
    }

    private static TimeSpan? ReadNullableTime(OleDbDataReader reader, string? columnName)
    {
        if (string.IsNullOrWhiteSpace(columnName)) return null;

        try
        {
            var value = reader[columnName];
            if (value == null || value == DBNull.Value) return null;

            if (value is TimeSpan ts) return ts;
            if (value is DateTime dt) return dt.TimeOfDay;

            var str = value.ToString();
            if (TimeSpan.TryParse(str, out var parsedTime)) return parsedTime;
            if (DateTime.TryParse(str, out var parsedDateTime)) return parsedDateTime.TimeOfDay;

            return null;
        }
        catch
        {
            return null;
        }
    }
}
