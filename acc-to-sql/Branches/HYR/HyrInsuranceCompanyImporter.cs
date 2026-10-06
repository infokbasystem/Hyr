using System.Data;
using System.Data.OleDb;
using Microsoft.Data.SqlClient;

public static class HyrInsuranceCompanyImporter
{
    public static void ImportInsuranceCompanies(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "InsuranceCompany")
    {
        if (string.IsNullOrWhiteSpace(accessConnectionString)) throw new ArgumentException("accessConnectionString is required", nameof(accessConnectionString));
        if (string.IsNullOrWhiteSpace(sqlConnectionString)) throw new ArgumentException("sqlConnectionString is required", nameof(sqlConnectionString));

        Console.WriteLine($"Starting insurance company import from Access table '{accessTableName}' for OfficeId={officeId}...");

        using var accessConn = new OleDbConnection(accessConnectionString);
        accessConn.Open();

        using var sqlConn = new SqlConnection(sqlConnectionString);
        sqlConn.Open();

        EnsureOfficeExists(officeId, accessConn, sqlConn);

        var availableColumns = LoadColumns(accessConn, accessTableName);
        var selectedColumns = new List<string>();

        AddIfExists(availableColumns, selectedColumns, "lngInsuranceCompany_ID");
        AddIfExists(availableColumns, selectedColumns, "strInsuranceCompany");
        AddIfExists(availableColumns, selectedColumns, "strContactPerson");
        AddIfExists(availableColumns, selectedColumns, "strAddress");
        AddIfExists(availableColumns, selectedColumns, "strPostalAddress");
        AddIfExists(availableColumns, selectedColumns, "strPostalNr");
        AddIfExists(availableColumns, selectedColumns, "strTelephone");
        AddIfExists(availableColumns, selectedColumns, "intInvoiceDays");
        AddIfExists(availableColumns, selectedColumns, "strOrganizationNr");
        AddIfExists(availableColumns, selectedColumns, "KeyFortnox");
        AddIfExists(availableColumns, selectedColumns, "Email");
        AddIfExists(availableColumns, selectedColumns, "CoAddress");

        if (!selectedColumns.Contains("strInsuranceCompany", StringComparer.OrdinalIgnoreCase))
        {
            Console.WriteLine("Access table does not contain required column 'strInsuranceCompany'. Insurance company import skipped.");
            return;
        }

        var selectSql = $"SELECT {string.Join(", ", selectedColumns.Select(c => "[" + c + "]"))} FROM [{accessTableName}]";
        using var selectCmd = new OleDbCommand(selectSql, accessConn);
        using var reader = selectCmd.ExecuteReader();

        if (reader == null)
        {
            Console.WriteLine("No reader returned for insurance companies.");
            return;
        }

        const string checkSql = "SELECT [Id] FROM [dbo].[InsuranceCompany] WHERE [OfficeId] = @OfficeId AND [Name] = @Name";
        const string insertSql = @"INSERT INTO [dbo].[InsuranceCompany]
([OfficeId],[Name],[OrganizationNr],[ContactPerson],[Telephone],[Email],[Street],[ZipCode],[City],[Country],[PaymentDays],[KeyFortnox])
VALUES
(@OfficeId,@Name,@OrganizationNr,@ContactPerson,@Telephone,@Email,@Street,@ZipCode,@City,@Country,@PaymentDays,@KeyFortnox);";

        var processed = 0;
        var inserted = 0;

        while (reader.Read())
        {
            processed++;

            var name = ReadString(reader, "strInsuranceCompany");
            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            var organizationNr = ReadString(reader, "strOrganizationNr");
            var contactPerson = ReadString(reader, "strContactPerson");
            var telephone = ReadString(reader, "strTelephone");
            var email = ReadString(reader, "Email");
            var address = ReadString(reader, "strAddress");
            var coAddress = ReadString(reader, "CoAddress");
            var street = string.IsNullOrWhiteSpace(address) ? coAddress : address;
            var zipCode = ReadString(reader, "strPostalNr");
            var city = ReadString(reader, "strPostalAddress");
            var paymentDays = ReadNullableInt(reader, "intInvoiceDays");
            var keyFortnox = ReadString(reader, "KeyFortnox");

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
                insertCmd.Parameters.Add(new SqlParameter("@OrganizationNr", SqlDbType.NVarChar, 200) { Value = organizationNr });
                insertCmd.Parameters.Add(new SqlParameter("@ContactPerson", SqlDbType.NVarChar, 200) { Value = contactPerson });
                insertCmd.Parameters.Add(new SqlParameter("@Telephone", SqlDbType.NVarChar, 200) { Value = telephone });
                insertCmd.Parameters.Add(new SqlParameter("@Email", SqlDbType.NVarChar, 200) { Value = email });
                insertCmd.Parameters.Add(new SqlParameter("@Street", SqlDbType.NVarChar, 200) { Value = street });
                insertCmd.Parameters.Add(new SqlParameter("@ZipCode", SqlDbType.NVarChar, 200) { Value = zipCode });
                insertCmd.Parameters.Add(new SqlParameter("@City", SqlDbType.NVarChar, 200) { Value = city });
                insertCmd.Parameters.Add(new SqlParameter("@Country", SqlDbType.NVarChar, 200) { Value = string.Empty });
                insertCmd.Parameters.Add(new SqlParameter("@PaymentDays", SqlDbType.Int) { Value = (object?)paymentDays ?? DBNull.Value });
                insertCmd.Parameters.Add(new SqlParameter("@KeyFortnox", SqlDbType.NVarChar, 200) { Value = keyFortnox });

                insertCmd.ExecuteNonQuery();
                inserted++;
            }
        }

        Console.WriteLine($"Insurance company import finished. Processed={processed}, Inserted={inserted}");
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

    private static string ReadString(OleDbDataReader reader, string columnName)
    {
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

    private static int? ReadNullableInt(OleDbDataReader reader, string columnName)
    {
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
}
