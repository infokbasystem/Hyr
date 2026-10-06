using System;
using System.Data.OleDb;

namespace Branches.HYRFLEX
{
    public sealed class HyrflexAccessDatabaseChecker
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
                Console.WriteLine("Connection string is required.");
            }

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
}
