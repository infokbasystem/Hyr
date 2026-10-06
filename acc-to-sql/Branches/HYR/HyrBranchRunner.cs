public sealed class HyrBranchRunner
{
    public void Run(string action, int officeId, string accessConnectionString, string sqlServerConnectionString)
    {
        switch (action)
        {
            case "CheckConnectionAndReadCompany":
                new HyrAccessDatabaseChecker().CheckConnectionAndReadCompany(accessConnectionString);
                break;

            case "ImportAllTables":
                new HyrLegacyImporter().ImportAllTables(officeId, accessConnectionString, sqlServerConnectionString);
                break;

            default:
                Console.WriteLine($"Unknown HYR action: {action}");
                break;
        }
    }
}
