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

            case "ImportPriceListDayPrices":
                if (string.IsNullOrWhiteSpace(sqlServerConnectionString))
                {
                    Console.WriteLine("SqlServerConnectionString is required for ImportPriceListDayPrices.");
                    return;
                }

                Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListDayPrices(officeId, accessConnectionString, sqlServerConnectionString);
                break;

            case "ImportPriceListDayPriceFreeKm":
                if (string.IsNullOrWhiteSpace(sqlServerConnectionString))
                {
                    Console.WriteLine("SqlServerConnectionString is required for ImportPriceListDayPriceFreeKm.");
                    return;
                }

                Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListDayPriceFreeKm(officeId, accessConnectionString, sqlServerConnectionString);
                break;

            case "ImportPriceListThirtyDayPriceIncludedKm":
                if (string.IsNullOrWhiteSpace(sqlServerConnectionString))
                {
                    Console.WriteLine("SqlServerConnectionString is required for ImportPriceListThirtyDayPriceIncludedKm.");
                    return;
                }

                Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListThirtyDayPriceIncludedKm(officeId, accessConnectionString, sqlServerConnectionString);
                break;

            case "ImportPriceListWeekendPrices":
                if (string.IsNullOrWhiteSpace(sqlServerConnectionString))
                {
                    Console.WriteLine("SqlServerConnectionString is required for ImportPriceListWeekendPrices.");
                    return;
                }

                Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListWeekendPrices(officeId, accessConnectionString, sqlServerConnectionString);
                break;

            case "ImportPriceListWeekendPriceFreeKm":
                if (string.IsNullOrWhiteSpace(sqlServerConnectionString))
                {
                    Console.WriteLine("SqlServerConnectionString is required for ImportPriceListWeekendPriceFreeKm.");
                    return;
                }

                Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListWeekendPriceFreeKm(officeId, accessConnectionString, sqlServerConnectionString);
                break;

            case "ImportPriceListWeekendPriceIncludedKm":
                if (string.IsNullOrWhiteSpace(sqlServerConnectionString))
                {
                    Console.WriteLine("SqlServerConnectionString is required for ImportPriceListWeekendPriceIncludedKm.");
                    return;
                }

                Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListWeekendPriceIncludedKm(officeId, accessConnectionString, sqlServerConnectionString);
                break;

            case "ImportPriceListWeekPriceFreeKm":
                if (string.IsNullOrWhiteSpace(sqlServerConnectionString))
                {
                    Console.WriteLine("SqlServerConnectionString is required for ImportPriceListWeekPriceFreeKm.");
                    return;
                }

                Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListWeekPriceFreeKm(officeId, accessConnectionString, sqlServerConnectionString);
                break;

            case "ImportPriceListWeekPriceIncludedKm":
                if (string.IsNullOrWhiteSpace(sqlServerConnectionString))
                {
                    Console.WriteLine("SqlServerConnectionString is required for ImportPriceListWeekPriceIncludedKm.");
                    return;
                }

                Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListWeekPriceIncludedKm(officeId, accessConnectionString, sqlServerConnectionString);
                break;

            default:
                Console.WriteLine($"Unknown HYR action: {action}");
                break;
        }
    }
}
