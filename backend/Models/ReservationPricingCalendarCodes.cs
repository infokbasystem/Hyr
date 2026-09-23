namespace Backend.Models
{
    public static class ReservationPricingCalendarCodes
    {
        public const string AllDays = "ALLDAYS";
        public const string WeekDays = "WEEKDAYS";
        public const string WorkingDays = "WORKINGDAYS";

        public static bool IsValid(string? value)
        {
            var normalized = value?.Trim();
            return normalized == AllDays || normalized == WeekDays || normalized == WorkingDays;
        }

        public static string NormalizeOrDefault(string? value)
        {
            var normalized = value?.Trim();
            if (string.IsNullOrWhiteSpace(normalized))
            {
                return AllDays;
            }

            if (string.Equals(normalized, AllDays, StringComparison.OrdinalIgnoreCase))
            {
                return AllDays;
            }

            if (string.Equals(normalized, WeekDays, StringComparison.OrdinalIgnoreCase))
            {
                return WeekDays;
            }

            if (string.Equals(normalized, WorkingDays, StringComparison.OrdinalIgnoreCase))
            {
                return WorkingDays;
            }

            return normalized;
        }
    }
}