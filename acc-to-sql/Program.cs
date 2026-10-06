using Serilog;
using Branches.HYRFLEX;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

try
{
    Log.Information("Application Starting Up");
    Console.WriteLine("Hello Floyd!");

    if (args.Length < 4)
    {
        Console.WriteLine("Usage: <ImportType> <Action> <OfficeId> <AccessFilePath> [SqlServerConnectionString]");
        Console.WriteLine("ImportType: HYR | HYRFLEX");
        Console.WriteLine("HYRFLEX Actions: CheckConnectionAndReadCompany | ImportInvoices");
        Console.WriteLine("HYR Actions: CheckConnectionAndReadCompany | ImportAllTables");
        return;
    }

    var importType = args[0]?.Trim().ToUpperInvariant();
    var action = args[1];

    if (!int.TryParse(args[2], out var officeId))
    {
        Console.WriteLine("OfficeId must be a valid integer.");
        return;
    }

    var accessFilePath = args[3];
    var sqlServerConnectionString = args.Length > 4 ? args[4] : string.Empty;

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

    switch (importType)
    {
        case "HYRFLEX":
        {
            var accessConnectionString = HyrflexAccessDatabaseChecker.BuildAccessConnectionString(officeId, accessFilePath);
            new HyrflexBranchRunner().Run(action, officeId, accessConnectionString, sqlServerConnectionString);
            break;
        }
        case "HYR":
        {
            var accessConnectionString = HyrAccessDatabaseChecker.BuildAccessConnectionString(officeId, accessFilePath);
            new HyrBranchRunner().Run(action, officeId, accessConnectionString, sqlServerConnectionString);
            break;
        }
        default:
            Console.WriteLine($"Unknown import type: {importType}. Valid values are HYR or HYRFLEX.");
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

