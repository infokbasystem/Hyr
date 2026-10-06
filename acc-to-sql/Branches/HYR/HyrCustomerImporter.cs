using System;
using System.Data;
using System.Data.OleDb;
using Microsoft.Data.SqlClient;

namespace Branches.HYR
{
    public static class HyrCustomerImporter
    {
        public static void ImportCustomers(int officeId, string accessConnectionString, string sqlConnectionString, string accessTableName = "Kunder")
        {
            if (string.IsNullOrWhiteSpace(accessConnectionString)) throw new ArgumentException("accessConnectionString is required", nameof(accessConnectionString));
            if (string.IsNullOrWhiteSpace(sqlConnectionString)) throw new ArgumentException("sqlConnectionString is required", nameof(sqlConnectionString));

            Console.WriteLine($"Starting customer import from Access table '{accessTableName}' for OfficeId={officeId}...");

            static int? SafeToInt32(object? value, string fieldName, string customerRef)
            {
                if (value == null || value == DBNull.Value) return null;

                try
                {
                    var int64Value = Convert.ToInt64(value);
                    if (int64Value < int.MinValue || int64Value > int.MaxValue)
                    {
                        Console.WriteLine($"Customer {customerRef}: field '{fieldName}' value '{value}' is outside Int32 range and will be ignored.");
                        return null;
                    }

                    return (int)int64Value;
                }
                catch
                {
                    Console.WriteLine($"Customer {customerRef}: field '{fieldName}' value '{value}' is not a valid Int32 and will be ignored.");
                    return null;
                }
            }

            static long? SafeToInt64(object? value, string fieldName, string customerRef)
            {
                if (value == null || value == DBNull.Value) return null;

                try
                {
                    return Convert.ToInt64(value);
                }
                catch
                {
                    Console.WriteLine($"Customer {customerRef}: field '{fieldName}' value '{value}' is not a valid Int64 and will be ignored.");
                    return null;
                }
            }

            using var accessConn = new OleDbConnection(accessConnectionString);
            accessConn.Open();

            using var sqlConn = new SqlConnection(sqlConnectionString);
            sqlConn.Open();

            // Ensure office exists (reuse logic similar to pricelist importer)
            var officeExistsSql = "SELECT 1 FROM [dbo].[Office] WHERE [Id] = @OfficeId";
            using (var officeCheckCmd = new SqlCommand(officeExistsSql, sqlConn))
            {
                officeCheckCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
                var exists = officeCheckCmd.ExecuteScalar();
                if (exists == null || exists == DBNull.Value)
                {
                    string officeName = null;
                    try
                    {
                        using var parmCmd = new OleDbCommand("SELECT TOP 1 Foretag FROM Parm", accessConn);
                        var parmObj = parmCmd.ExecuteScalar();
                        officeName = parmObj == null || parmObj == DBNull.Value ? null : parmObj.ToString()?.Trim();
                    }
                    catch
                    {
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

            // Use explicit bracketed identifiers to avoid "No value given for one or more required parameters"
            // which Access throws when a field name is missing or treated as a parameter.
            // Detect available columns in the Access table and select only those present to avoid
            // "No value given for one or more required parameters." which Access throws when a
            // column name is missing or invalid.
            string[] desiredColumns = new[]
            {
                "lngCustomer_ID","IngCustomer_ID","Namn","F_Namn","Adress","Post_Nr","Post_Adr","Tele","Fax","E_Mail","AntBetDagar","Rabatt","FaktAvg",
                "KundNot","Kreditlimit","Org_Nr2","Momspliktig","lngPricelistVersion_ID","IngPricelistVersion_ID","bolInternal","bolActive","strRegNr","Bgnr","IsCompany","VatHomeTown",
                "VatRegistration","VatNr","KeyFortnox","CoAddress","CrediflowPartyId","GLNnr"
            };

            // Get schema for the table
            DataTable? schemaTable = null;
            try
            {
                using var schemaCmd = new OleDbCommand($"SELECT * FROM [{accessTableName}] WHERE 1=0", accessConn);
                using var schemaReader = schemaCmd.ExecuteReader();
                schemaTable = schemaReader.GetSchemaTable();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to read schema for Access table '{accessTableName}': {ex.Message}");
                throw;
            }

            var availableCols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (schemaTable != null)
            {
                foreach (DataRow row in schemaTable.Rows)
                {
                    if (row.Table!.Columns.Contains("ColumnName"))
                    {
                        var col = row["ColumnName"]?.ToString();
                        if (!string.IsNullOrEmpty(col)) availableCols.Add(col);
                    }
                }
            }

            var selected = new List<string>();
            foreach (var col in desiredColumns)
            {
                if (availableCols.Contains(col)) selected.Add(col);
            }

            var customerIdColumn = availableCols.Contains("lngCustomer_ID")
                ? "lngCustomer_ID"
                : availableCols.Contains("IngCustomer_ID")
                    ? "IngCustomer_ID"
                    : null;

            var priceListVersionColumn = availableCols.Contains("lngPricelistVersion_ID")
                ? "lngPricelistVersion_ID"
                : availableCols.Contains("IngPricelistVersion_ID")
                    ? "IngPricelistVersion_ID"
                    : null;

            if (selected.Count == 0)
            {
                Console.WriteLine($"No matching columns found in Access table '{accessTableName}'. Available columns: {string.Join(", ", availableCols)}");
                return;
            }

            var selectSql = $"SELECT {string.Join(", ", selected.Select(c => "[" + c + "]"))} FROM [{accessTableName}]";
            using var selectCmd = new OleDbCommand(selectSql, accessConn);
            using var reader = selectCmd.ExecuteReader();
            if (reader == null)
            {
                Console.WriteLine("No reader returned for customers.");
                return;
            }

            var checkCustomerSql = "SELECT [Id] FROM [dbo].[Customer] WHERE [OfficeId] = @OfficeId AND [ImportSource] = @ImportSource AND [ImportId] = @ImportId";
            var insertSql = @"INSERT INTO [dbo].[Customer] ([OfficeId],[CustomerNr],[CustomerName],[OrgNr],[VatNr],[Street1],[Street2],[ZipCode],[City],[Telephone],[MobilePhone],[Email],[NrOfInvoiceDays],[Note],[CreditLimit],[ImportId],[ImportSource],[KeySpcs],[KeyFortnox],[KeyWinassist],[IsActive],[RegNr],[IsCompany],[VatRegisterd],[PgNr],[BgNr],[EfakturaAddresseeIntermediator],[EfakturaAddresseeID],[EfakturaAddresseeIDType],[EfakturaBankCode],[EfakturaBankId],[EfakturaBankName],[EfakturaVatHomeTown],[EfakturaVatRegistration],[CrediflowPartyId],[GLNnr],[CreatedAt],[DefaultPriceListId],[DiscountPercent])
                VALUES (@OfficeId,@CustomerNr,@CustomerName,@OrgNr,@VatNr,@Street1,@Street2,@ZipCode,@City,@Telephone,@MobilePhone,@Email,@NrOfInvoiceDays,@Note,@CreditLimit,@ImportId,@ImportSource,@KeySpcs,@KeyFortnox,@KeyWinassist,@IsActive,@RegNr,@IsCompany,@VatRegisterd,@PgNr,@BgNr,@EfakturaAddresseeIntermediator,@EfakturaAddresseeID,@EfakturaAddresseeIDType,@EfakturaBankCode,@EfakturaBankId,@EfakturaBankName,@EfakturaVatHomeTown,@EfakturaVatRegistration,@CrediflowPartyId,@GLNnr,@CreatedAt,@DefaultPriceListId,@DiscountPercent);";

            var processed = 0;
            var inserted = 0;

            // Determine starting CustomerNr by taking the current max for this office
            int nextCustomerNr = 1;
            try
            {
                using var maxCmd = new SqlCommand("SELECT ISNULL(MAX(CustomerNr), 0) FROM [dbo].[Customer] WHERE [OfficeId] = @OfficeId", sqlConn);
                maxCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
                var maxObj = maxCmd.ExecuteScalar();
                if (maxObj != null && maxObj != DBNull.Value)
                {
                    var maxVal = Convert.ToInt32(maxObj);
                    nextCustomerNr = maxVal + 1;
                }
            }
            catch
            {
                // ignore and start from 1
                nextCustomerNr = 1;
            }
            while (reader.Read())
            {
                processed++;

                var rawCustomerId = string.IsNullOrEmpty(customerIdColumn) || reader.IsDBNull(customerIdColumn)
                    ? null
                    : reader[customerIdColumn];

                var nameForContext = reader.IsDBNull("Namn") ? string.Empty : reader["Namn"]?.ToString()?.Trim() ?? string.Empty;
                var customerRef = $"ImportId='{rawCustomerId?.ToString() ?? "null"}', Name='{nameForContext}'";

                try
                {
                    var importId = SafeToInt32(rawCustomerId, customerIdColumn ?? "lngCustomer_ID", customerRef);
                    var name = nameForContext;
                    var contact = reader.IsDBNull("F_Namn") ? string.Empty : reader["F_Namn"]?.ToString()?.Trim() ?? string.Empty;
                    var address = reader.IsDBNull("Adress") ? string.Empty : reader["Adress"]?.ToString()?.Trim() ?? string.Empty;
                    var postNr = reader.IsDBNull("Post_Nr") ? string.Empty : reader["Post_Nr"]?.ToString()?.Trim() ?? string.Empty;
                    var postAdr = reader.IsDBNull("Post_Adr") ? string.Empty : reader["Post_Adr"]?.ToString()?.Trim() ?? string.Empty;
                    var tel = reader.IsDBNull("Tele") ? string.Empty : reader["Tele"]?.ToString()?.Trim() ?? string.Empty;
                    var fax = reader.IsDBNull("Fax") ? string.Empty : reader["Fax"]?.ToString()?.Trim() ?? string.Empty;
                    var email = reader.IsDBNull("E_Mail") ? string.Empty : reader["E_Mail"]?.ToString()?.Trim() ?? string.Empty;
                    var invoiceDays = SafeToInt32(reader.IsDBNull("AntBetDagar") ? null : reader["AntBetDagar"], "AntBetDagar", customerRef);
                    var discount = reader.IsDBNull("Rabatt") ? (decimal?)null : Convert.ToDecimal(reader["Rabatt"]);
                    var invoiceFee = reader.IsDBNull("FaktAvg") ? false : Convert.ToBoolean(reader["FaktAvg"]);
                    var note = reader.IsDBNull("KundNot") ? string.Empty : reader["KundNot"]?.ToString()?.Trim() ?? string.Empty;
                    var creditLimit = reader.IsDBNull("Kreditlimit") ? (decimal?)null : Convert.ToDecimal(reader["Kreditlimit"]);
                    var orgNr = reader.IsDBNull("Org_Nr2") ? string.Empty : reader["Org_Nr2"]?.ToString()?.Trim() ?? string.Empty;
                    var vatRegistered = reader.IsDBNull("Momspliktig") ? false : Convert.ToBoolean(reader["Momspliktig"]);
                    var priceListVersionId = SafeToInt32(
                        string.IsNullOrEmpty(priceListVersionColumn) || reader.IsDBNull(priceListVersionColumn) ? null : reader[priceListVersionColumn],
                        priceListVersionColumn ?? "lngPricelistVersion_ID",
                        customerRef);
                    var active = reader.IsDBNull("bolActive") ? true : Convert.ToBoolean(reader["bolActive"]);
                    var regNr = reader.IsDBNull("strRegNr") ? string.Empty : reader["strRegNr"]?.ToString()?.Trim() ?? string.Empty;
                    var bgnr = reader.IsDBNull("Bgnr") ? string.Empty : reader["Bgnr"]?.ToString()?.Trim() ?? string.Empty;
                    var isCompany = reader.IsDBNull("IsCompany") ? true : Convert.ToBoolean(reader["IsCompany"]);
                    var vatHomeTown = reader.IsDBNull("VatHomeTown") ? string.Empty : reader["VatHomeTown"]?.ToString()?.Trim() ?? string.Empty;
                    var vatRegistration = reader.IsDBNull("VatRegistration") ? string.Empty : reader["VatRegistration"]?.ToString()?.Trim() ?? string.Empty;
                    var vatNr = reader.IsDBNull("VatNr") ? string.Empty : reader["VatNr"]?.ToString()?.Trim() ?? string.Empty;
                    var keyFortnox = reader.IsDBNull("KeyFortnox") ? string.Empty : reader["KeyFortnox"]?.ToString()?.Trim() ?? string.Empty;
                    var coAddress = reader.IsDBNull("CoAddress") ? string.Empty : reader["CoAddress"]?.ToString()?.Trim() ?? string.Empty;
                    var crediflowPartyId = SafeToInt32(reader.IsDBNull("CrediflowPartyId") ? null : reader["CrediflowPartyId"], "CrediflowPartyId", customerRef);
                    var gln = SafeToInt64(reader.IsDBNull("GLNnr") ? null : reader["GLNnr"], "GLNnr", customerRef);

                    // Determine default pricelist id by matching pricelist name using the Access pricelist version id
                    int? defaultPriceListId = null;
                    if (priceListVersionId.HasValue)
                    {
                        try
                        {
                            using var plCmd = new OleDbCommand("SELECT TOP 1 strPricelist FROM Pricelist WHERE lngPricelist_ID = ?", accessConn);
                            plCmd.Parameters.Add("?", OleDbType.Integer).Value = priceListVersionId.Value;
                            var plNameObj = plCmd.ExecuteScalar();
                            var plName = plNameObj == null || plNameObj == DBNull.Value ? null : plNameObj.ToString();
                            if (!string.IsNullOrEmpty(plName))
                            {
                                using var findPlCmd = new SqlCommand("SELECT [Id] FROM [dbo].[PriceList] WHERE [OfficeId] = @OfficeId AND [Name] = @Name", sqlConn);
                                findPlCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
                                findPlCmd.Parameters.Add(new SqlParameter("@Name", SqlDbType.NVarChar, 200) { Value = plName });
                                var plIdObj = findPlCmd.ExecuteScalar();
                                if (plIdObj != null && plIdObj != DBNull.Value) defaultPriceListId = Convert.ToInt32(plIdObj);
                            }
                        }
                        catch
                        {
                            // ignore pricelist resolution errors
                        }
                    }

                    // Check existing
                    using (var checkCmd = new SqlCommand(checkCustomerSql, sqlConn))
                    {
                        checkCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
                        checkCmd.Parameters.Add(new SqlParameter("@ImportSource", SqlDbType.NVarChar, 200) { Value = "HYR" });
                        checkCmd.Parameters.Add(new SqlParameter("@ImportId", SqlDbType.Int) { Value = (object?)importId ?? DBNull.Value });

                        var existing = checkCmd.ExecuteScalar();
                        if (existing != null && existing != DBNull.Value)
                        {
                            // skip existing
                            continue;
                        }
                    }

                    using (var insertCmd = new SqlCommand(insertSql, sqlConn))
                    {
                        insertCmd.Parameters.Add(new SqlParameter("@OfficeId", SqlDbType.Int) { Value = officeId });
                        insertCmd.Parameters.Add(new SqlParameter("@CustomerNr", SqlDbType.Int) { Value = nextCustomerNr });
                        insertCmd.Parameters.Add(new SqlParameter("@CustomerName", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(name) ? string.Empty : name });
                        insertCmd.Parameters.Add(new SqlParameter("@OrgNr", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(orgNr) ? string.Empty : orgNr });
                        insertCmd.Parameters.Add(new SqlParameter("@VatNr", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(vatNr) ? string.Empty : vatNr });
                        insertCmd.Parameters.Add(new SqlParameter("@Street1", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(address) ? string.Empty : address });
                        insertCmd.Parameters.Add(new SqlParameter("@Street2", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(coAddress) ? string.Empty : coAddress });
                        insertCmd.Parameters.Add(new SqlParameter("@ZipCode", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(postNr) ? string.Empty : postNr });
                        insertCmd.Parameters.Add(new SqlParameter("@City", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(vatHomeTown) ? string.Empty : vatHomeTown });
                        insertCmd.Parameters.Add(new SqlParameter("@Telephone", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(tel) ? string.Empty : tel });
                        insertCmd.Parameters.Add(new SqlParameter("@MobilePhone", SqlDbType.NVarChar, 200) { Value = string.Empty });
                        insertCmd.Parameters.Add(new SqlParameter("@Email", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(email) ? string.Empty : email });
                        insertCmd.Parameters.Add(new SqlParameter("@NrOfInvoiceDays", SqlDbType.Int) { Value = (object?)invoiceDays ?? DBNull.Value });
                        insertCmd.Parameters.Add(new SqlParameter("@Note", SqlDbType.NVarChar, 2000) { Value = string.IsNullOrEmpty(note) ? string.Empty : note });
                        insertCmd.Parameters.Add(new SqlParameter("@CreditLimit", SqlDbType.Decimal) { Value = (object?)creditLimit ?? DBNull.Value });
                        insertCmd.Parameters.Add(new SqlParameter("@ImportId", SqlDbType.Int) { Value = (object?)importId ?? DBNull.Value });
                        insertCmd.Parameters.Add(new SqlParameter("@ImportSource", SqlDbType.NVarChar, 200) { Value = "HYR" });
                        insertCmd.Parameters.Add(new SqlParameter("@KeySpcs", SqlDbType.NVarChar, 200) { Value = string.Empty });
                        insertCmd.Parameters.Add(new SqlParameter("@KeyFortnox", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(keyFortnox) ? string.Empty : keyFortnox });
                        insertCmd.Parameters.Add(new SqlParameter("@KeyWinassist", SqlDbType.NVarChar, 200) { Value = string.Empty });
                        insertCmd.Parameters.Add(new SqlParameter("@IsActive", SqlDbType.Bit) { Value = active });
                        insertCmd.Parameters.Add(new SqlParameter("@RegNr", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(regNr) ? string.Empty : regNr });
                        insertCmd.Parameters.Add(new SqlParameter("@IsCompany", SqlDbType.Bit) { Value = isCompany });
                        insertCmd.Parameters.Add(new SqlParameter("@VatRegisterd", SqlDbType.Bit) { Value = vatRegistered });
                        insertCmd.Parameters.Add(new SqlParameter("@PgNr", SqlDbType.NVarChar, 200) { Value = string.Empty });
                        insertCmd.Parameters.Add(new SqlParameter("@BgNr", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(bgnr) ? string.Empty : bgnr });
                        insertCmd.Parameters.Add(new SqlParameter("@EfakturaAddresseeIntermediator", SqlDbType.NVarChar, 200) { Value = string.Empty });
                        insertCmd.Parameters.Add(new SqlParameter("@EfakturaAddresseeID", SqlDbType.NVarChar, 200) { Value = string.Empty });
                        insertCmd.Parameters.Add(new SqlParameter("@EfakturaAddresseeIDType", SqlDbType.NVarChar, 200) { Value = string.Empty });
                        insertCmd.Parameters.Add(new SqlParameter("@EfakturaBankCode", SqlDbType.NVarChar, 200) { Value = string.Empty });
                        insertCmd.Parameters.Add(new SqlParameter("@EfakturaBankId", SqlDbType.NVarChar, 200) { Value = string.Empty });
                        insertCmd.Parameters.Add(new SqlParameter("@EfakturaBankName", SqlDbType.NVarChar, 200) { Value = string.Empty });
                        insertCmd.Parameters.Add(new SqlParameter("@EfakturaVatHomeTown", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(vatHomeTown) ? string.Empty : vatHomeTown });
                        insertCmd.Parameters.Add(new SqlParameter("@EfakturaVatRegistration", SqlDbType.NVarChar, 200) { Value = string.IsNullOrEmpty(vatRegistration) ? string.Empty : vatRegistration });
                        insertCmd.Parameters.Add(new SqlParameter("@CrediflowPartyId", SqlDbType.Int) { Value = (object?)crediflowPartyId ?? DBNull.Value });
                        insertCmd.Parameters.Add(new SqlParameter("@GLNnr", SqlDbType.BigInt) { Value = (object?)gln ?? DBNull.Value });
                        insertCmd.Parameters.Add(new SqlParameter("@CreatedAt", SqlDbType.DateTime2) { Value = DateTime.UtcNow });
                        insertCmd.Parameters.Add(new SqlParameter("@DefaultPriceListId", SqlDbType.Int) { Value = (object?)defaultPriceListId ?? DBNull.Value });
                        insertCmd.Parameters.Add(new SqlParameter("@DiscountPercent", SqlDbType.Decimal) { Value = (object?)discount ?? DBNull.Value });

                        insertCmd.ExecuteNonQuery();
                        inserted++;
                        // increment the CustomerNr for next row
                        nextCustomerNr++;
                    }
                }
                catch (Exception ex)
                {
                    throw new InvalidOperationException($"Failed to import customer {customerRef} (row {processed}).", ex);
                }
            }

            Console.WriteLine($"Customer import finished. Processed={processed}, Inserted={inserted}");
        }
    }
}
