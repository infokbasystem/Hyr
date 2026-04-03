namespace Hyr.Api.Utils
{
    public static class Rounding
    {
        public static decimal ToNearestKrona(decimal amount)
        {
            return Math.Floor(amount + 0.5m);
        }

        public static decimal GetRoundingDifference(decimal amount)
        {
            return ToNearestKrona(amount) - amount;
        }
    }
}
