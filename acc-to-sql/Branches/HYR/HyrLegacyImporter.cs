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

            Console.WriteLine("Starting import of Customers...");
            HyrCustomerImporter.ImportCustomers(officeId, accessConnectionString, sqlServerConnectionString);
            Console.WriteLine("Customers import completed.");

            //Console.WriteLine("Starting import of InsuranceCompanies...");
            //HyrInsuranceCompanyImporter.ImportInsuranceCompanies(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("InsuranceCompanies import completed.");

            //Console.WriteLine("Starting import of Categories...");
            //HyrCategoryImporter.ImportCategories(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("Categories import completed.");

            //Console.WriteLine("Starting import of ItemModels...");
            //HyrItemModelImporter.ImportItemModels(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("ItemModels import completed.");

            //Console.WriteLine("Starting import of Items...");
            //HyrItemImporter.ImportItems(officeId, accessConnectionString, sqlServerConnectionString);
            //Console.WriteLine("Items import completed.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Import failed: {ex.Message}");
        }
    }
}
