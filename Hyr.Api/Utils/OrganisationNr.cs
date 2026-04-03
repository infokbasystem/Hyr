
namespace Hyr.Api.Utils
{
    public static class OrganisationNr
    {
        public static bool IsCompany(string OrganisationNr)
        {
            if (string.IsNullOrWhiteSpace(OrganisationNr) || OrganisationNr.Length < 3)
            {
                return false;
            }
            if (int.Parse(OrganisationNr.Substring(2, 1)) >= 2)
            {
                return true;
            }
            return false;
        }
    }
}