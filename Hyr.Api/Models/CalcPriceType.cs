namespace Hyr.Api.Models
{
    public enum CalcPriceType
    {
        Rent,
        Km,
        Fuel,
        User,
        FreeText,
    }

    public static class CalcPriceTypeCodes
    {
        public const string Rent = "RENT";
        public const string Km = "KM";
        public const string Fuel = "FUEL";
        public const string User = "USER";
        public const string FreeText = "FREETEXT";

        public static string ToCode(CalcPriceType calcPriceType) => calcPriceType switch
        {
            CalcPriceType.Rent => Rent,
            CalcPriceType.Km => Km,
            CalcPriceType.Fuel => Fuel,
            CalcPriceType.User => User,
            _ => FreeText,
        };

        public static CalcPriceType Parse(string? value) => value?.Trim().ToUpperInvariant() switch
        {
            Rent => CalcPriceType.Rent,
            Km => CalcPriceType.Km,
            Fuel => CalcPriceType.Fuel,
            User => CalcPriceType.User,
            _ => CalcPriceType.FreeText,
        };

        public static string NormalizeOrDefault(string? value) => ToCode(Parse(value));
    }
}
