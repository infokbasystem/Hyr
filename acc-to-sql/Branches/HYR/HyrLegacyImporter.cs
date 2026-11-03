using Branches.HYR;

public sealed class HyrLegacyImporter
{
    public void ImportAllTables(int officeId, string accessConnectionString, string sqlServerConnectionString)
    {
        Console.WriteLine("HYR import branch selected.");
        Console.WriteLine("ImportAllTables is prepared for future HYR table imports.");

        // Import PriceLists from Access into SQL
        try
        {

            //Console.WriteLine("Starting import of PriceLists...");
            //HyrPricelistVersionImporter.ImportPriceListVersions(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("PriceLists import completed.");

            //Console.WriteLine("Starting import of Customers...");
            //HyrCustomerImporter.ImportCustomers(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("Customers import completed.");

            //Console.WriteLine("Starting import of InsuranceCompanies...");
            //HyrInsuranceCompanyImporter.ImportInsuranceCompanies(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("InsuranceCompanies import completed.");

            //Console.WriteLine("Starting import of Categories...");
            //HyrCategoryImporter.ImportCategories(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("Categories import completed.");

            //Console.WriteLine("Starting import of ItemModels...");
            //HyrItemModelImporter.ImportItemModels(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("ItemModels import completed.");

            Console.WriteLine("Starting import of Items...");
            HyrItemImporter.ImportItems(officeId, accessConnectionString, sqlServerConnectionString);
            Console.WriteLine("Items import completed.");

            //Console.WriteLine("Starting import of PriceListDayPrices...");
            //Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListDayPrices(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("PriceListDayPrices import completed.");

            //Console.WriteLine("Starting import of PriceListDayPriceFreeKm...");
            //Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListDayPriceFreeKm(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("PriceListDayPriceFreeKm import completed.");

            //Console.WriteLine("Starting import of PriceListThirtyDayPriceIncludedKm...");
            //Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListThirtyDayPriceIncludedKm(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("PriceListThirtyDayPriceIncludedKm import completed.");

            //Console.WriteLine("Starting import of PriceListWeekendPrices...");
            //Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListWeekendPrices(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("PriceListWeekendPrices import completed.");

            //Console.WriteLine("Starting import of PriceListWeekendPriceFreeKm...");
            //Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListWeekendPriceFreeKm(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("PriceListWeekendPriceFreeKm import completed.");

            //Console.WriteLine("Starting import of PriceListWeekendPriceIncludedKm...");
            //Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListWeekendPriceIncludedKm(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("PriceListWeekendPriceIncludedKm import completed.");

            //Console.WriteLine("Starting import of PriceListWeekPriceFreeKm...");
            //Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListWeekPriceFreeKm(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("PriceListWeekPriceFreeKm import completed.");

            //Console.WriteLine("Starting import of PriceListWeekPriceIncludedKm...");
            //Branches.HYR.HyrPriceListDayPriceImporter.ImportPriceListWeekPriceIncludedKm(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("PriceListWeekPriceIncludedKm import completed.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Import failed: {ex.Message}");
        }
    }
}
