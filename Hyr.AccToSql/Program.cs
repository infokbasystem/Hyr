using Microsoft.Data.SqlClient;
using Serilog;
using System.Data;
using System.Data.OleDb;



// Configure Serilog at the start of your application
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();



try
{
    Log.Information("Application Starting Up");
    Console.WriteLine("Hello Floyd!");

    if (args.Length < 2)
    {
        Console.WriteLine("Usage: <Action> <AccessFilePath> [SqlServerConnectionString]");
        Console.WriteLine("Actions: CheckConnectionAndReadCompany | ImportInvoices | ImportInvoicesViaSqlServer");
        return;
    }

    var action = args[0];
    var officeId = int.Parse(args[1]);
    var accessFilePath = args[2];
    var sqlServerConnectionString = args.Length > 3 ? args[3] : string.Empty;

    if (string.IsNullOrWhiteSpace(action))
    {
        Console.WriteLine("Action is required.");
        return;
    }

    if (string.IsNullOrWhiteSpace(accessFilePath))
    {
        Console.WriteLine("Access file path is required.");
        return;
    }

    var accessConnectionString = AccessDatabaseChecker.BuildAccessConnectionString(officeId, accessFilePath);

    switch (action)
    {
        case "CheckConnectionAndReadCompany":
            new AccessDatabaseChecker().CheckConnectionAndReadCompany(accessConnectionString);
            break;
        case "ImportInvoices":
            var res = new InvoiceImporter().ImportInvoices(officeId, accessConnectionString, sqlServerConnectionString);
            Console.WriteLine($"Imported {res.imported} imported invoices. {res.existing} existing invoices. {res.error} with errors");
            break;
        default:
            Console.WriteLine($"Unknown action: {action}");
            break;
    }



}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}



public sealed class AccessDatabaseChecker
{
    public static string BuildAccessConnectionString(int officeId, string accessFilePath)
    {
        if (string.IsNullOrWhiteSpace(accessFilePath))
        {
            throw new ArgumentException("Access file path is required.", nameof(accessFilePath));
        }

        var escapedPath = accessFilePath.Replace("\"", "\"\"");
        return $"Provider=Microsoft.ACE.OLEDB.12.0;Data Source=\"{escapedPath}\";Persist Security Info=False;";
    }

    public bool CheckConnectionAndReadCompany(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            Console.WriteLine("Connection string is required.", nameof(connectionString));
        }

        // Check if the current OS is not Windows
        if (!OperatingSystem.IsWindows())
        {
            Console.WriteLine("Access database connections are only supported on Windows environments.");
            return false;
        }

        try
        {
            using var connection = new OleDbConnection(connectionString);
            using var command = new OleDbCommand(
                "SELECT TOP 1 strCompany FROM Settings",
                connection);

            connection.Open();

            var result = command.ExecuteScalar();
            var companyName = result is null || result is DBNull
                ? string.Empty
                : Convert.ToString(result)?.Trim() ?? string.Empty;

            Console.WriteLine(companyName);

            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }
}



public sealed class InvoiceImporter
{
    public (int imported, int existing, int error) ImportInvoices(int officeId, string accessConnectionString, string sqlServerConnectionString)
    {
        if (string.IsNullOrWhiteSpace(accessConnectionString) || string.IsNullOrWhiteSpace(sqlServerConnectionString))
        {
            throw new ArgumentException("Connection string is required.", nameof(accessConnectionString));
        }

        if (!OperatingSystem.IsWindows())
        {
            Console.WriteLine("Access database connections are only supported on Windows environments.");
            return (0, 0, 0);
        }

        // Pseudocode plan:
        // 1. The current SQL WHERE clause uses "dteAccountDate <> null", which is always false in SQL (should be "IS NOT NULL").
        // 2. In Access SQL, the correct syntax is "dteAccountDate IS NULL" or "IS NOT NULL".
        // 3. Update the selectSql to use "dteAccountDate IS NULL" to select invoices that have not been accounted yet.

        var selectSql = "SELECT * FROM Invoice WHERE dteInvoiceDate >= #2026-01-01# ORDER BY lngInvoice_ID";
        // dteAccountDate IS NULL AND 

        if (string.IsNullOrWhiteSpace(selectSql))
        {
            throw new ArgumentException("Select SQL is required.", nameof(selectSql));
        }

        int importedCount = 0;
        int existingCount = 0;
        int errorCount = 0;

        using var accessDbConnection = new OleDbConnection(accessConnectionString);
        using var command = new OleDbCommand(selectSql, accessDbConnection);

        accessDbConnection.Open();

        using var reader = command.ExecuteReader(CommandBehavior.CloseConnection);
        if (reader is null)
        {
            return (importedCount, existingCount, errorCount);
        }

        while (reader.Read())
        {
            var id = reader.IsDBNull((int)InvoiceField.Id)
                ? 0
                : Convert.ToInt32(reader.GetValue((int)InvoiceField.Id));

            var invoiceNumber = reader.IsDBNull((int)InvoiceField.InvoiceNumber)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.InvoiceNumber)?.ToString()?.Trim() ?? string.Empty;

            var status = reader.IsDBNull((int)InvoiceField.Status)
                ? 0
                : Convert.ToInt32(reader.GetValue((int)InvoiceField.Status));

            var payMethod = reader.IsDBNull((int)InvoiceField.PayMethod)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.PayMethod)?.ToString()?.Trim() ?? string.Empty;

            var invoiceType = reader.IsDBNull((int)InvoiceField.InvoiceType)
                ? (int?)null
                : Convert.ToInt32(reader.GetValue((int)InvoiceField.InvoiceType));

            var creditingInvoiceNr = reader.IsDBNull((int)InvoiceField.CreditingInvoiceNr)
                ? (int?)null
                : Convert.ToInt32(reader.GetValue((int)InvoiceField.CreditingInvoiceNr));

            var discountPercent = reader.IsDBNull((int)InvoiceField.DiscountPercent)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.DiscountPercent)?.ToString()?.Trim() ?? string.Empty;

            var customerId = reader.IsDBNull((int)InvoiceField.CustomerId)
                ? (int?)null
                : Convert.ToInt32(reader.GetValue((int)InvoiceField.CustomerId));

            var organizationNr = reader.IsDBNull((int)InvoiceField.OrganizationNr)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.OrganizationNr)?.ToString()?.Trim() ?? string.Empty;

            var customerName = reader.IsDBNull((int)InvoiceField.CustomerName)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.CustomerName)?.ToString()?.Trim() ?? string.Empty;

            var customerNr = reader.IsDBNull((int)InvoiceField.CustomerNr)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.CustomerNr)?.ToString()?.Trim() ?? string.Empty;

            var telephone = reader.IsDBNull((int)InvoiceField.Telephone)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.Telephone)?.ToString()?.Trim() ?? string.Empty;

            var telephone2 = reader.IsDBNull((int)InvoiceField.Telephone2)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.Telephone2)?.ToString()?.Trim() ?? string.Empty;

            var yourReference = reader.IsDBNull((int)InvoiceField.YourReference)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.YourReference)?.ToString()?.Trim() ?? string.Empty;

            var ourReference = reader.IsDBNull((int)InvoiceField.OurReference)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.OurReference)?.ToString()?.Trim() ?? string.Empty;

            var noteExternal = reader.IsDBNull((int)InvoiceField.NoteExternal)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.NoteExternal)?.ToString()?.Trim() ?? string.Empty;

            var noteInternal = reader.IsDBNull((int)InvoiceField.NoteInternal)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.NoteInternal)?.ToString()?.Trim() ?? string.Empty;

            var invoiceText = reader.IsDBNull((int)InvoiceField.InvoiceText)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.InvoiceText)?.ToString()?.Trim() ?? string.Empty;

            var invoiceDays = reader.IsDBNull((int)InvoiceField.InvoiceDays)
                ? (int?)null
                : int.TryParse(reader.GetValue((int)InvoiceField.InvoiceDays)?.ToString(), out var days) ? days : (int?)null;

            var invoiceDate = reader.IsDBNull((int)InvoiceField.InvoiceDate)
                ? (DateTime?)null
                : DateTime.TryParse(reader.GetValue((int)InvoiceField.InvoiceDate)?.ToString(), out var dtInvoiceDate) ? dtInvoiceDate : (DateTime?)null;

            var accountingDate = reader.IsDBNull((int)InvoiceField.AccountingDate)
                ? (DateTime?)null
                : DateTime.TryParse(reader.GetValue((int)InvoiceField.AccountingDate)?.ToString(), out var dtAccountingDate) ? dtAccountingDate : (DateTime?)null;

            var costCenter = reader.IsDBNull((int)InvoiceField.CostCenter)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.CostCenter)?.ToString()?.Trim() ?? string.Empty;

            var account = reader.IsDBNull((int)InvoiceField.Account)
                ? (int?)null
                : int.TryParse(reader.GetValue((int)InvoiceField.Account)?.ToString(), out var acc) ? acc : (int?)null;

            var latePaymentInterest = reader.IsDBNull((int)InvoiceField.LatePaymentInterest)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.LatePaymentInterest)?.ToString()?.Trim() ?? string.Empty;

            var invoiceOk = reader.IsDBNull((int)InvoiceField.InvoiceOk)
                ? false
                : Convert.ToBoolean(reader.GetValue((int)InvoiceField.InvoiceOk));

            var endInvoice = reader.IsDBNull((int)InvoiceField.EndInvoice)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.EndInvoice)?.ToString()?.Trim() ?? string.Empty;

            var message = reader.IsDBNull((int)InvoiceField.Message)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.Message)?.ToString()?.Trim() ?? string.Empty;

            var printed = reader.IsDBNull((int)InvoiceField.Printed)
                ? false
                : Convert.ToBoolean(reader.GetValue((int)InvoiceField.Printed));

            var createdDate = reader.IsDBNull((int)InvoiceField.CreatedDate)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.CreatedDate)?.ToString()?.Trim() ?? string.Empty;

            var address = reader.IsDBNull((int)InvoiceField.Address)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.Address)?.ToString()?.Trim() ?? string.Empty;

            var calcFromDate = reader.IsDBNull((int)InvoiceField.CalcFromDate)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.CalcFromDate)?.ToString()?.Trim() ?? string.Empty;

            var calcToDate = reader.IsDBNull((int)InvoiceField.CalcToDate)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.CalcToDate)?.ToString()?.Trim() ?? string.Empty;

            var pdfCreated = reader.IsDBNull((int)InvoiceField.PdfCreated)
                ? string.Empty
                : reader.GetValue((int)InvoiceField.PdfCreated)?.ToString()?.Trim() ?? string.Empty;

            var rows = new List<InvoiceRow>();

            using var commandInvRos = new OleDbCommand("SELECT * FROM InvoiceRow WHERE lngInvoice_ID = ?", accessDbConnection);
            commandInvRos.Parameters.AddWithValue("?", id);

            using var readerInvRows = commandInvRos.ExecuteReader();
            while (readerInvRows.Read())
            {
                rows.Add(new InvoiceRow
                {
                    lngInvoiceRow_ID = readerInvRows.IsDBNull(0) ? 0 : Convert.ToInt32(readerInvRows.GetValue(0)),
                    lngInvoice_ID = readerInvRows.IsDBNull(1) ? (int?)null : Convert.ToInt32(readerInvRows.GetValue(1)),
                    lngPriceRow_ID = readerInvRows.IsDBNull(2) ? (int?)null : Convert.ToInt32(readerInvRows.GetValue(2)),
                    lngSortOrder = readerInvRows.IsDBNull(3) ? (int?)null : Convert.ToInt32(readerInvRows.GetValue(3)),
                    lngInvoiceRow = readerInvRows.IsDBNull(4) ? (int?)null : Convert.ToInt32(readerInvRows.GetValue(4)),
                    lngItem_ID = readerInvRows.IsDBNull(5) ? (int?)null : Convert.ToInt32(readerInvRows.GetValue(5)),
                    lngItemType_ID = readerInvRows.IsDBNull(6) ? (int?)null : Convert.ToInt32(readerInvRows.GetValue(6)),
                    strPriceKey = readerInvRows.IsDBNull(7) ? string.Empty : readerInvRows.GetValue(7)?.ToString()?.Trim() ?? string.Empty,
                    strArticleNr = readerInvRows.IsDBNull(8) ? string.Empty : readerInvRows.GetValue(8)?.ToString()?.Trim() ?? string.Empty,
                    strText0 = readerInvRows.IsDBNull(9) ? string.Empty : readerInvRows.GetValue(9)?.ToString()?.Trim() ?? string.Empty,
                    strText = readerInvRows.IsDBNull(10) ? string.Empty : readerInvRows.GetValue(10)?.ToString()?.Trim() ?? string.Empty,
                    strText2 = readerInvRows.IsDBNull(11) ? string.Empty : readerInvRows.GetValue(11)?.ToString()?.Trim() ?? string.Empty,
                    dblNrOf = readerInvRows.IsDBNull(12) ? (double?)null : Convert.ToDouble(readerInvRows.GetValue(12)),
                    dblRentDays = readerInvRows.IsDBNull(13) ? (double?)null : Convert.ToDouble(readerInvRows.GetValue(13)),
                    dblBasePrice = readerInvRows.IsDBNull(14) ? (double?)null : Convert.ToDouble(readerInvRows.GetValue(14)),
                    dblUnitPrice = readerInvRows.IsDBNull(15) ? (double?)null : Convert.ToDouble(readerInvRows.GetValue(15)),
                    dblSum = readerInvRows.IsDBNull(16) ? (double?)null : Convert.ToDouble(readerInvRows.GetValue(16)),
                    bolVATGround = readerInvRows.GetBoolean(17),
                    strAccountNr = readerInvRows.IsDBNull(18) ? string.Empty : readerInvRows.GetValue(18)?.ToString()?.Trim() ?? string.Empty,
                    strCostCenter = readerInvRows.IsDBNull(19) ? string.Empty : readerInvRows.GetValue(19)?.ToString()?.Trim() ?? string.Empty,
                    bolCompareWithPriceRow = readerInvRows.GetBoolean(20),
                    bolCalculate = readerInvRows.GetBoolean(21)
                });
            }

            decimal totalExclVat = (decimal)rows.Where(p => p.strPriceKey != "vat" && p.strPriceKey != "rounding").Sum(p => p.dblSum ?? 0);
            decimal totalVat = (decimal)rows.Where(p => p.strPriceKey == "vat").Sum(p => p.dblSum ?? 0);
            decimal rounding = (decimal)rows.Where(p => p.strPriceKey == "rounding").Sum(p => p.dblSum ?? 0);
            decimal totalSum = (decimal)rows.Sum(p => p.dblSum ?? 0);

            using var sqlConnection = new SqlConnection(sqlServerConnectionString);
            sqlConnection.Open();

            const string query = "SELECT COUNT(1) FROM Invoice WHERE InvoiceNr = @InvoiceNr";
            using var commandCheckIfInvoiceExists = new SqlCommand(query, sqlConnection);
            commandCheckIfInvoiceExists.Parameters.AddWithValue("@InvoiceNr", invoiceNumber);

            var count = (int)commandCheckIfInvoiceExists.ExecuteScalar();

            if (count > 0)
            {
                existingCount++;
                // Invoice already exists in SQL Server, skip to next record
                // Update dteAccountDate in Access for this invoice
                using (var updateCommand = new OleDbCommand("UPDATE Invoice SET dteAccountDate = ? WHERE lngInvoice_ID = ?", accessDbConnection))
                {
                    var accessDate = DateTime.Now.Date;
                    updateCommand.Parameters.Add("?", OleDbType.Date).Value = accessDate;
                    updateCommand.Parameters.Add("?", OleDbType.Integer).Value = id;
                    updateCommand.ExecuteNonQuery();
                }
                continue;
            }

            // After reading customerId from the Access invoice, check if it exists in SQL Server Customer.ImportId
            int sqlServerCustomerId;
            const string queryCustExists = "SELECT Id FROM Customer WHERE ImportId = @ImportId";
            using var commandCheckIfCustomerExists = new SqlCommand(queryCustExists, sqlConnection);
            commandCheckIfCustomerExists.Parameters.AddWithValue("@ImportId", customerId ?? -1);
            var result = commandCheckIfCustomerExists.ExecuteScalar();
            sqlServerCustomerId = result != null ? Convert.ToInt32(result) : -1;
            bool customerExists = sqlServerCustomerId != -1;


            if (!customerExists)
            {

                Console.WriteLine($"Customer with ImportId {customerId} does not exist in SQL Server. Retrieving from Access...");

                var customerImporter = new CustomerImporter();
                var accessCustomer = customerImporter.GetCustomerFromAccess(accessConnectionString, customerId.Value);

                if (accessCustomer != null)
                {
                    // Insert new customer into SQL Server using Access data
                    using (var insertCustCmd = new SqlCommand(@"
                            INSERT INTO Customer (
                                OfficeId, CustomerNr, CustomerName, OrgNr, VatNr, Street1, Street2, ZipCode, City, 
                                Telephone, MobilePhone, Email, NrOfInvoiceDays, Note, CreditLimit, ImportId, 
                                ImportSource, IsActive, IsCompany, VatRegisterd,
                                KeySpcs, KeyFortnox, KeyWinassist, RegNr, PgNr, BgNr,
                                EfakturaAddresseeIntermediator, EfakturaAddresseeID, EfakturaAddresseeIDType,
                                EfakturaBankCode, EfakturaBankId, EfakturaBankName, EfakturaVatHomeTown, EfakturaVatRegistration
                            ) 
                            OUTPUT INSERTED.Id
                            VALUES (
                                @OfficeId, @CustomerNr, @CustomerName, @OrgNr, @VatNr, @Street1, @Street2, @ZipCode, @City,
                                @Telephone, @MobilePhone, @Email, @NrOfInvoiceDays, @Note, @CreditLimit, @ImportId,
                                @ImportSource, @IsActive, @IsCompany, @VatRegisterd,
                                @KeySpcs, @KeyFortnox, @KeyWinassist, @RegNr, @PgNr, @BgNr,
                                @EfakturaAddresseeIntermediator, @EfakturaAddresseeID, @EfakturaAddresseeIDType,
                                @EfakturaBankCode, @EfakturaBankId, @EfakturaBankName, @EfakturaVatHomeTown, @EfakturaVatRegistration
                            )", sqlConnection))
                    {
                        insertCustCmd.Parameters.AddWithValue("@OfficeId", officeId); // Set default office ID
                        insertCustCmd.Parameters.AddWithValue("@CustomerNr", string.IsNullOrEmpty(accessCustomer.CustomerNr) ? (object)DBNull.Value : int.TryParse(accessCustomer.CustomerNr, out var custNr) ? custNr : (object)DBNull.Value);
                        insertCustCmd.Parameters.AddWithValue("@CustomerName", (object?)accessCustomer.CustomerName ?? string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@OrgNr", (object?)accessCustomer.OrganizationNr ?? string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@VatNr", string.Empty); // No direct mapping from Access
                        insertCustCmd.Parameters.AddWithValue("@Street1", (object?)accessCustomer.PostalAddress ?? string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@Street2", (object?)accessCustomer.DeliveryAddress ?? string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@ZipCode", (object?)accessCustomer.PostalCode ?? string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@City", (object?)accessCustomer.DeliveryPostalAddress ?? string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@Telephone", (object?)accessCustomer.Telephone1 ?? string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@MobilePhone", (object?)accessCustomer.Telephone2 ?? string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@Email", (object?)accessCustomer.Email ?? string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@NrOfInvoiceDays", (object?)accessCustomer.InvoiceDays ?? DBNull.Value);
                        insertCustCmd.Parameters.AddWithValue("@Note", (object?)accessCustomer.Note ?? string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@CreditLimit", 0.0); // Default credit limit
                        insertCustCmd.Parameters.AddWithValue("@ImportId", accessCustomer.Id);
                        insertCustCmd.Parameters.AddWithValue("@ImportSource", "Access");
                        insertCustCmd.Parameters.AddWithValue("@IsActive", accessCustomer.Active);
                        insertCustCmd.Parameters.AddWithValue("@IsCompany", !string.IsNullOrEmpty(accessCustomer.OrganizationNr));
                        insertCustCmd.Parameters.AddWithValue("@VatRegisterd", !string.IsNullOrEmpty(accessCustomer.OrganizationNr));
                        insertCustCmd.Parameters.AddWithValue("@KeySpcs", string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@KeyFortnox", string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@KeyWinassist", string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@RegNr", string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@PgNr", string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@BgNr", string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@EfakturaAddresseeIntermediator", string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@EfakturaAddresseeID", string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@EfakturaAddresseeIDType", string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@EfakturaBankCode", string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@EfakturaBankId", string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@EfakturaBankName", string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@EfakturaVatHomeTown", string.Empty);
                        insertCustCmd.Parameters.AddWithValue("@EfakturaVatRegistration", string.Empty);

                        var res = insertCustCmd.ExecuteScalar();
                        sqlServerCustomerId = res != null ? Convert.ToInt32(res) : -1;

                        if (sqlServerCustomerId == -1)
                        {
                            Console.WriteLine("Failed to insert customer or retrieve new ID");
                            continue; // Skip this invoice
                        }

                        customerId = sqlServerCustomerId;
                        Console.WriteLine($"Added customer: {accessCustomer.CustomerName} (SQL Id: {sqlServerCustomerId})");

                    }
                }
            }
            else
            {
                customerId = sqlServerCustomerId;
            }


            using (var transaction = sqlConnection.BeginTransaction())
            {
                try
                {
                    int sqlServerInvoiceId = -1;
                    // Insert new invoice into SQL Server
                    using (var insertCmd = new SqlCommand(@"
                        INSERT INTO Invoice (
                        OfficeId, InvoiceNr, InvoiceDate, AccountedDate, InvoiceType, InvoicePayMethod, NrOfInvoiceDays, CreditingInvoiceId, CustomerId, CustomerName, CustomerReference, VatNr, OrgNr, Street1, Street2, ZipCode, City, OurReference, YourReference, AccountNr, AccountNrVat, Note, IsCancelled, IsSettled, IsOkForAccounting, IsPrinted, IsEmailed, IsEInvoiced, TermsOfPayment, Marking, InvoiceFee, CurrencyRate, CurrencyId, PdfName, TotExVat, TotVat, TotSum, Rounding, ExportResult, CrediflowSessionId
                        ) 
                        OUTPUT INSERTED.Id
                        VALUES (
                        @OfficeId, @InvoiceNr, @InvoiceDate, @AccountedDate, @InvoiceType, @InvoicePayMethod, @NrOfInvoiceDays, @CreditingInvoiceId, @CustomerId, @CustomerName, @CustomerReference, @VatNr, @OrgNr, @Street1, @Street2, @ZipCode, @City, @OurReference, @YourReference, @AccountNr, @AccountNrVat, @Note, @IsCancelled, @IsSettled, @IsOkForAccounting, @IsPrinted, @IsEmailed, @IsEInvoiced, @TermsOfPayment, @Marking, @InvoiceFee, @CurrencyRate, @CurrencyId, @PdfName, @TotExVat, @TotVat, @TotSum, @Rounding, @ExportResult, @CrediflowSessionId
                        )", sqlConnection, transaction))
                    {
                        insertCmd.Parameters.AddWithValue("@OfficeId", officeId); // Example, set as needed
                        insertCmd.Parameters.AddWithValue("@InvoiceNr", invoiceNumber);
                        insertCmd.Parameters.AddWithValue("@InvoiceDate", (object?)invoiceDate ?? DBNull.Value);
                        insertCmd.Parameters.AddWithValue("@AccountedDate", DBNull.Value);
                        insertCmd.Parameters.AddWithValue("@InvoiceType", invoiceType == 1 || invoiceType == 3 ? "INVOICE" : invoiceType == 8 ? "CREDIT" : "INVOICE");
                        insertCmd.Parameters.AddWithValue("@InvoicePayMethod", payMethod == "1" ? "CASH" : payMethod == "2" ? "CARD" : payMethod == "3" ? "INVOICE" : "");
                        insertCmd.Parameters.AddWithValue("@NrOfInvoiceDays", (object?)invoiceDays ?? DBNull.Value);
                        insertCmd.Parameters.AddWithValue("@CreditingInvoiceId", (object?)creditingInvoiceNr ?? DBNull.Value);
                        insertCmd.Parameters.AddWithValue("@CustomerId", (object?)customerId ?? DBNull.Value);
                        insertCmd.Parameters.AddWithValue("@CustomerName", (object?)customerName ?? DBNull.Value);
                        insertCmd.Parameters.AddWithValue("@CustomerReference", string.Empty); // Map as needed
                        insertCmd.Parameters.AddWithValue("@VatNr", string.Empty); // Map as needed
                        insertCmd.Parameters.AddWithValue("@OrgNr", (object?)organizationNr ?? string.Empty);
                        insertCmd.Parameters.AddWithValue("@Street1", string.Empty); // Map as needed
                        insertCmd.Parameters.AddWithValue("@Street2", string.Empty); // Map as needed
                        insertCmd.Parameters.AddWithValue("@ZipCode", string.Empty); // Map as needed
                        insertCmd.Parameters.AddWithValue("@City", string.Empty); // Map as needed
                        insertCmd.Parameters.AddWithValue("@OurReference", (object?)ourReference ?? string.Empty);
                        insertCmd.Parameters.AddWithValue("@YourReference", (object?)yourReference ?? string.Empty);
                        insertCmd.Parameters.AddWithValue("@AccountNr", (object?)account ?? DBNull.Value);
                        insertCmd.Parameters.AddWithValue("@AccountNrVat", DBNull.Value); // Map as needed
                        insertCmd.Parameters.AddWithValue("@Note", (object?)noteInternal ?? string.Empty);
                        insertCmd.Parameters.AddWithValue("@IsCancelled", status == 2 ? true : false); // Map as needed
                        insertCmd.Parameters.AddWithValue("@IsSettled", false); // Map as needed
                        insertCmd.Parameters.AddWithValue("@IsOkForAccounting", false); // Map as needed
                        insertCmd.Parameters.AddWithValue("@IsPrinted", (object?)printed ?? DBNull.Value);
                        insertCmd.Parameters.AddWithValue("@IsEmailed", false); // Map as needed
                        insertCmd.Parameters.AddWithValue("@IsEInvoiced", false); // Map as needed
                        insertCmd.Parameters.AddWithValue("@TermsOfPayment", string.Empty); // Map as needed
                        insertCmd.Parameters.AddWithValue("@Marking", string.Empty); // Map as needed
                        insertCmd.Parameters.AddWithValue("@InvoiceFee", DBNull.Value); // Map as needed
                        insertCmd.Parameters.AddWithValue("@CurrencyRate", DBNull.Value); // Map as needed
                        insertCmd.Parameters.AddWithValue("@CurrencyId", DBNull.Value); // Map as needed
                        insertCmd.Parameters.AddWithValue("@PdfName", string.Empty); // Map as needed
                        insertCmd.Parameters.AddWithValue("@TotExVat", totalExclVat); // Map as needed
                        insertCmd.Parameters.AddWithValue("@TotVat", totalVat); // Map as needed
                        insertCmd.Parameters.AddWithValue("@TotSum", totalSum); // Map as needed
                        insertCmd.Parameters.AddWithValue("@Rounding", rounding); // Map as needed
                        insertCmd.Parameters.AddWithValue("@ExportResult", string.Empty); // Map as needed
                        insertCmd.Parameters.AddWithValue("@CrediflowSessionId", string.Empty); // Map as needed
                        var res = insertCmd.ExecuteScalar();
                        sqlServerInvoiceId = res != null ? Convert.ToInt32(res) : -1;
                    }

                    // Insert invoice rows into SQL Server
                    foreach (var row in rows)
                    {
                        // Check if item exists in SQL Server using ImportId from Access
                        int? sqlServerItemId = null;
                        if (row.lngItem_ID.HasValue && row.lngItem_ID != 0)
                        {
                            const string queryItemExists = "SELECT Id FROM Item WHERE ImportId = @ImportId";
                            using var commandCheckIfItemExists = new SqlCommand(queryItemExists, sqlConnection, transaction);
                            commandCheckIfItemExists.Parameters.AddWithValue("@ImportId", row.lngItem_ID.Value);
                            var itemResult = commandCheckIfItemExists.ExecuteScalar();
                            sqlServerItemId = itemResult != null ? Convert.ToInt32(itemResult) : (int?)null;
                            bool itemExists = sqlServerItemId.HasValue;

                            if (!itemExists)
                            {
                                Console.WriteLine($"Item with ImportId {row.lngItem_ID} does not exist in SQL Server. Retrieving from Access...");

                                var itemImporter = new ItemImporter();
                                var accessItem = itemImporter.GetItemFromAccess(accessConnectionString, row.lngItem_ID.Value);

                                if (accessItem != null)
                                {
                                    // Insert new item into SQL Server using Access data
                                    using (var insertItemCmd = new SqlCommand(@"
                                    INSERT INTO Item (
                                        OfficeId, ItemTypeCode, RegNr, YearModel, Note, MachineNr, AccountNr,
                                        BasePrice, CostCenterNr, ImportId, IsActive, IsStorageItem, ItemNr, Manufacturer,
                                        NrOfItemsTotal, PlatformHeightMm, PlatformLengthMm, PopupText, PricePerDay, ReplacementCost, 
                                        UnavailableForReservation, UnavailableReason
                                    ) 
                                    OUTPUT INSERTED.Id
                                    VALUES (
                                        @OfficeId, @ItemTypeCode, @RegNr, @YearModel, @Note, @MachineNr, @AccountNr,
                                        @BasePrice, @CostCenterNr, @ImportId, @IsActive, @IsStorageItem, @ItemNr, @Manufacturer,
                                        @NrOfItemsTotal, @PlatformHeightMm, @PlatformLengthMm, @PopupText, @PricePerDay, @ReplacementCost, 
                                        @UnavailableForReservation, @UnavailableReason
                                    )", sqlConnection, transaction))
                                    {
                                        insertItemCmd.Parameters.AddWithValue("@OfficeId", officeId);
                                        insertItemCmd.Parameters.AddWithValue("@ItemTypeCode", string.Empty);
                                        insertItemCmd.Parameters.AddWithValue("@RegNr", string.Empty);
                                        insertItemCmd.Parameters.AddWithValue("@YearModel", string.Empty);
                                        insertItemCmd.Parameters.AddWithValue("@Note", accessItem.Note ?? string.Empty);
                                        insertItemCmd.Parameters.AddWithValue("@MachineNr", accessItem.MachineNr ?? string.Empty);
                                        insertItemCmd.Parameters.AddWithValue("@AccountNr", accessItem.AccountNr != null ? accessItem.AccountNr : string.Empty);
                                        insertItemCmd.Parameters.AddWithValue("@BasePrice", (object?)accessItem.BasePrice ?? DBNull.Value);
                                        insertItemCmd.Parameters.AddWithValue("@CostCenterNr", accessItem.CostCenterNr ?? string.Empty);
                                        insertItemCmd.Parameters.AddWithValue("@ImportId", accessItem.Id);
                                        insertItemCmd.Parameters.AddWithValue("@IsActive", accessItem.IsActive);
                                        insertItemCmd.Parameters.AddWithValue("@IsStorageItem", accessItem.IsStorageItem);
                                        insertItemCmd.Parameters.AddWithValue("@ItemNr", (object?)accessItem.ItemNr ?? string.Empty);
                                        insertItemCmd.Parameters.AddWithValue("@Manufacturer", accessItem.Manufacturer ?? string.Empty);
                                        insertItemCmd.Parameters.AddWithValue("@NrOfItemsTotal", accessItem.NrOfItemsTotal);
                                        insertItemCmd.Parameters.AddWithValue("@PlatformHeightMm", accessItem.PlatformHeightMm);
                                        insertItemCmd.Parameters.AddWithValue("@PlatformLengthMm", accessItem.PlatformLengthMm);
                                        insertItemCmd.Parameters.AddWithValue("@PopupText", (object?)accessItem.PopupText ?? string.Empty);
                                        insertItemCmd.Parameters.AddWithValue("@PricePerDay", accessItem.PricePerDay);
                                        insertItemCmd.Parameters.AddWithValue("@ReplacementCost", accessItem.ReplacementCost);
                                        insertItemCmd.Parameters.AddWithValue("@UnavailableForReservation", accessItem.UnavailableForReservation);
                                        insertItemCmd.Parameters.AddWithValue("@UnavailableReason", accessItem.UnavailableReason ?? string.Empty);

                                        var itemInsertResult = insertItemCmd.ExecuteScalar();
                                        sqlServerItemId = itemInsertResult != null ? Convert.ToInt32(itemInsertResult) : (int?)null;

                                        if (sqlServerItemId.HasValue)
                                        {
                                            Console.WriteLine($"Added item: {accessItem.ItemName} (SQL Id: {sqlServerItemId})");
                                        }
                                        else
                                        {
                                            Console.WriteLine("Failed to insert item or retrieve new ID");
                                        }
                                    }
                                }
                            }
                        }

                        using (var insertRowCmd = new SqlCommand(@"
                        INSERT INTO InvoiceRow (
                            OfficeId, InvoiceId, ItemId, ReservationCalcItemId, SortNr, ArticleId, 
                            ArticleNr, InvoiceRowType, Text1, Text2, Qty, UnitPrice, Sum, VatRate, AccountNr, CostCenter
                        ) VALUES (
                            @OfficeId, @InvoiceId, @ItemId, @ReservationCalcItemId, @SortNr, @ArticleId,
                            @ArticleNr, @InvoiceRowType, @Text1, @Text2, @Qty, @UnitPrice, @Sum, @VatRate, @AccountNr, @CostCenter
                        )", sqlConnection, transaction))
                        {
                            insertRowCmd.Parameters.AddWithValue("@OfficeId", officeId);
                            insertRowCmd.Parameters.AddWithValue("@InvoiceId", sqlServerInvoiceId);
                            insertRowCmd.Parameters.AddWithValue("@ItemId", sqlServerItemId != null ? sqlServerItemId : DBNull.Value);
                            insertRowCmd.Parameters.AddWithValue("@ReservationCalcItemId", DBNull.Value); // No direct mapping
                            insertRowCmd.Parameters.AddWithValue("@SortNr", (object?)row.lngSortOrder ?? DBNull.Value);
                            insertRowCmd.Parameters.AddWithValue("@ArticleId", DBNull.Value); // No direct mapping
                            insertRowCmd.Parameters.AddWithValue("@ArticleNr", (object?)row.strArticleNr ?? string.Empty);
                            insertRowCmd.Parameters.AddWithValue("@InvoiceRowType", row.strPriceKey ?? string.Empty);
                            insertRowCmd.Parameters.AddWithValue("@Text1", (object?)(row.strText0 ?? string.Empty) + (string.IsNullOrEmpty(row.strText0) && string.IsNullOrWhiteSpace(row.strText) ? "" : " ") + (row.strText ?? string.Empty));
                            insertRowCmd.Parameters.AddWithValue("@Text2", (object?)row.strText2 ?? string.Empty);
                            insertRowCmd.Parameters.AddWithValue("@Qty", (object?)row.dblNrOf ?? DBNull.Value);
                            insertRowCmd.Parameters.AddWithValue("@UnitPrice", (object?)row.dblUnitPrice ?? DBNull.Value);
                            insertRowCmd.Parameters.AddWithValue("@Sum", (object?)row.dblSum ?? DBNull.Value);
                            insertRowCmd.Parameters.AddWithValue("@VatRate", row.bolVATGround ? 0.25m : 0.0m); // Example VAT rate mapping
                            insertRowCmd.Parameters.AddWithValue("@AccountNr", string.IsNullOrEmpty(row.strAccountNr) ? DBNull.Value : int.TryParse(row.strAccountNr, out var accNr) ? accNr : DBNull.Value);
                            insertRowCmd.Parameters.AddWithValue("@CostCenter", (object?)row.strCostCenter ?? string.Empty);

                            insertRowCmd.ExecuteNonQuery();
                        }
                    }

                    transaction.Commit();
                    importedCount++;

                    using (var updateCommand = new OleDbCommand("UPDATE Invoice SET dteAccountDate = ? WHERE lngInvoice_ID = ?", accessDbConnection))
                    {
                        var accessDate = DateTime.Now.Date;
                        updateCommand.Parameters.Add("?", OleDbType.Date).Value = accessDate;
                        updateCommand.Parameters.Add("?", OleDbType.Integer).Value = id;
                        updateCommand.ExecuteNonQuery();
                    }

                }
                catch (Exception ex)
                {
                    // Rollback on error
                    transaction.Rollback();
                    Console.WriteLine($"Error importing invoice {invoiceNumber}: {ex.Message}");
                    errorCount++;
                    continue;
                }

            }

        }

        return (importedCount, existingCount, errorCount);
    }

}



public enum InvoiceField
{
    Id = 0,
    InvoiceNumber = 1,
    Status = 2,
    PayMethod = 3,
    InvoiceType = 4,
    CreditingInvoiceNr = 5,
    DiscountPercent = 6,
    CustomerId = 7,
    OrganizationNr = 8,
    CustomerName = 9,
    CustomerNr = 10,
    Telephone = 15,
    Telephone2 = 16,
    YourReference = 17,
    OurReference = 18,
    NoteExternal = 19,
    NoteInternal = 20,
    InvoiceText = 21,
    InvoiceDays = 25,
    InvoiceDate = 26,
    AccountingDate = 27,
    CostCenter = 30,
    Account = 31,
    LatePaymentInterest = 32,
    InvoiceOk = 33,
    EndInvoice = 34,
    Message = 35,
    Printed = 36,
    CreatedDate = 38,
    Address = 40,
    CalcFromDate = 41,
    CalcToDate = 42,
    PdfCreated = 43,
}

