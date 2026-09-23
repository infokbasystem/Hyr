using System.Data;
using System.Data.OleDb;

public sealed class CustomerImporter
{
    public AccessCustomer? GetCustomerFromAccess(string accessConnectionString, int customerId)
    {
        if (string.IsNullOrWhiteSpace(accessConnectionString))
        {
            throw new ArgumentException("Connection string is required.", nameof(accessConnectionString));
        }

        if (!OperatingSystem.IsWindows())
        {
            Console.WriteLine("Access database connections are only supported on Windows environments.");
            return null;
        }

        var selectSql = "SELECT * FROM Customer WHERE lngCustomer_ID = ?";

        using var connection = new OleDbConnection(accessConnectionString);
        using var command = new OleDbCommand(selectSql, connection);
        command.Parameters.AddWithValue("?", customerId);

        connection.Open();

        using var reader = command.ExecuteReader();
        if (reader?.Read() == true)
        {
            var id = reader.IsDBNull("lngCustomer_ID") ? 0 : Convert.ToInt32(reader["lngCustomer_ID"]);
            var customerNr = reader.IsDBNull("strCustomerNr") ? string.Empty : reader["strCustomerNr"]?.ToString()?.Trim() ?? string.Empty;
            var customerName = reader.IsDBNull("strCustomer") ? string.Empty : reader["strCustomer"]?.ToString()?.Trim() ?? string.Empty;
            var organizationNr = reader.IsDBNull("strOrganizationNr") ? string.Empty : reader["strOrganizationNr"]?.ToString()?.Trim() ?? string.Empty;
            var contactPerson = reader.IsDBNull("strContactPerson") ? string.Empty : reader["strContactPerson"]?.ToString()?.Trim() ?? string.Empty;
            var postalAddress = reader.IsDBNull("strPostalAddress") ? string.Empty : reader["strPostalAddress"]?.ToString()?.Trim() ?? string.Empty;
            var postalCode = reader.IsDBNull("strPostalCode") ? string.Empty : reader["strPostalCode"]?.ToString()?.Trim() ?? string.Empty;
            var deliveryAddress = reader.IsDBNull("strDeliveryAddress") ? string.Empty : reader["strDeliveryAddress"]?.ToString()?.Trim() ?? string.Empty;
            var deliveryPostalAddress = reader.IsDBNull("strDeliveryPostalAddress") ? string.Empty : reader["strDeliveryPostalAddress"]?.ToString()?.Trim() ?? string.Empty;
            var deliveryPostalCode = reader.IsDBNull("strDeliveryPostalCode") ? string.Empty : reader["strDeliveryPostalCode"]?.ToString()?.Trim() ?? string.Empty;
            var telephone1 = reader.IsDBNull("strTelephone1") ? string.Empty : reader["strTelephone1"]?.ToString()?.Trim() ?? string.Empty;
            var telephone2 = reader.IsDBNull("strTelephone2") ? string.Empty : reader["strTelephone2"]?.ToString()?.Trim() ?? string.Empty;
            var fax = reader.IsDBNull("strFax") ? string.Empty : reader["strFax"]?.ToString()?.Trim() ?? string.Empty;
            var email = reader.IsDBNull("strEmail") ? string.Empty : reader["strEmail"]?.ToString()?.Trim() ?? string.Empty;
            var invoiceDays = reader.IsDBNull("intInvoiceDays") ? (int?)null : Convert.ToInt32(reader["intInvoiceDays"]);
            var discount = reader.IsDBNull("intDiscount") ? (int?)null : Convert.ToInt32(reader["intDiscount"]);
            var invoiceFee = reader.IsDBNull("bolInvoiceFee") ? false : Convert.ToBoolean(reader["bolInvoiceFee"]);
            var note = reader.IsDBNull("strNote") ? string.Empty : reader["strNote"]?.ToString()?.Trim() ?? string.Empty;
            var externalKey = reader.IsDBNull("strExternalKey") ? string.Empty : reader["strExternalKey"]?.ToString()?.Trim() ?? string.Empty;
            var active = reader.IsDBNull("bolActive") ? true : Convert.ToBoolean(reader["bolActive"]);
            var created = reader.IsDBNull("dteCreated") ? (DateTime?)null : Convert.ToDateTime(reader["dteCreated"]);
            var bankrupt = reader.IsDBNull("bolBankrupt") ? false : Convert.ToBoolean(reader["bolBankrupt"]);
            var customerType = reader.IsDBNull("lngCustomerType_ID") ? (int?)null : Convert.ToInt32(reader["lngCustomerType_ID"]);
            var blockReservations = reader.IsDBNull("bolBlockReservations") ? false : Convert.ToBoolean(reader["bolBlockReservations"]);
            var viewPriceCalcOnContract = reader.IsDBNull("bolViewPriceCalcOnContract") ? false : Convert.ToBoolean(reader["bolViewPriceCalcOnContract"]);

            return new AccessCustomer(
                id, customerNr, customerName, organizationNr, contactPerson, postalAddress, postalCode,
                deliveryAddress, deliveryPostalAddress, deliveryPostalCode, telephone1, telephone2,
                fax, email, invoiceDays, discount, invoiceFee, note, externalKey, active, created,
                bankrupt, customerType, blockReservations, viewPriceCalcOnContract
            );
        }

        return null;
    }
}

public sealed record AccessCustomer(
    int Id,
    string CustomerNr,
    string CustomerName,
    string OrganizationNr,
    string ContactPerson,
    string PostalAddress,
    string PostalCode,
    string DeliveryAddress,
    string DeliveryPostalAddress,
    string DeliveryPostalCode,
    string Telephone1,
    string Telephone2,
    string Fax,
    string Email,
    int? InvoiceDays,
    int? Discount,
    bool InvoiceFee,
    string Note,
    string ExternalKey,
    bool Active,
    DateTime? Created,
    bool Bankrupt,
    int? CustomerType,
    bool BlockReservations,
    bool ViewPriceCalcOnContract
);
