namespace Backend.Utils
{
    public static class PlacementLocation
    {
        public const int CoordinateDecimals = 6;

        /// <summary>Returns an error message when the coordinates cannot be stored, otherwise null.</summary>
        public static string? Validate(decimal? latitude, decimal? longitude)
        {
            if (latitude.HasValue != longitude.HasValue)
            {
                return "Latitud och longitud måste anges tillsammans.";
            }

            if (latitude.HasValue && (latitude.Value < -90m || latitude.Value > 90m))
            {
                return "Latitud måste vara mellan -90 och 90.";
            }

            if (longitude.HasValue && (longitude.Value < -180m || longitude.Value > 180m))
            {
                return "Longitud måste vara mellan -180 och 180.";
            }

            return null;
        }

        public static decimal? Round(decimal? coordinate) =>
            coordinate.HasValue ? Math.Round(coordinate.Value, CoordinateDecimals) : null;
    }
}
