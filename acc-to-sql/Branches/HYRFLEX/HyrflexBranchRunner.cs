using Branches.HYRFLEX;

public sealed class HyrflexBranchRunner
{
    public void Run(string action, int officeId, string accessConnectionString, string sqlServerConnectionString)
    {
        switch (action)
        {
            case "CheckConnectionAndReadCompany":
                new HyrflexAccessDatabaseChecker().CheckConnectionAndReadCompany(accessConnectionString);
                break;

            case "ImportInvoices":
                if (string.IsNullOrWhiteSpace(sqlServerConnectionString))
                {
                    Console.WriteLine("SqlServerConnectionString is required for ImportInvoices.");
                    return;
                }

                var res = new HyrflexInvoiceImporter().ImportInvoices(officeId, accessConnectionString, sqlServerConnectionString);
                Console.WriteLine($"Imported {res.imported} imported invoices. {res.existing} existing invoices. {res.error} with errors");
                break;

            default:
                Console.WriteLine($"Unknown HYRFLEX action: {action}");
                break;
        }
    }
}
