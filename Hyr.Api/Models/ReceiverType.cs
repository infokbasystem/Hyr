namespace Hyr.Api.Models
{
    public enum ReceiverType
    {
        Customer,
        InsuranceCompany,
        Internal,
    }

    public static class ReceiverTypeCodes
    {
        public const string Customer = "CUSTOMER";
        public const string InsuranceCompany = "INSURANCECOMPANY";
        public const string Internal = "INTERNAL";

        public static string ToCode(ReceiverType receiverType) => receiverType switch
        {
            ReceiverType.InsuranceCompany => InsuranceCompany,
            ReceiverType.Internal => Internal,
            _ => Customer,
        };

        public static ReceiverType Parse(string? value) => value?.Trim().ToUpperInvariant() switch
        {
            InsuranceCompany => ReceiverType.InsuranceCompany,
            Internal => ReceiverType.Internal,
            _ => ReceiverType.Customer,
        };

        public static string NormalizeOrDefault(string? value) => ToCode(Parse(value));
    }
}
