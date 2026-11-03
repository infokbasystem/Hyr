using Backend.Models;
using PublicHoliday;

namespace Backend.Services;

public static class DirectItemPricingCalculator
{
    public sealed record PriceRow(string Text, decimal Qty, decimal UnitPrice)
    {
        public decimal Sum => decimal.Round(Qty * UnitPrice, 5, MidpointRounding.AwayFromZero);
    }

    private sealed record Segment(DateTime From, DateTime To, long Offset);
    private sealed record Rate(string Text, decimal Price, int Hours = 0, int Days = 0, int Months = 0);

    public static IReadOnlyList<PriceRow> Calculate(Item item, DateTime from, DateTime to, string? calendarCode)
    {
        if (to <= from)
        {
            throw new ArgumentException("Slutdatum måste vara senare än startdatum.");
        }

        var calendar = ReservationPricingCalendarCodes.NormalizeOrDefault(calendarCode);
        if (!ReservationPricingCalendarCodes.IsValid(calendar))
        {
            throw new ArgumentException("Ogiltig priskalender.");
        }

        var prices = new[] { item.BasePrice, item.PricePerDay, item.PricePerWeek, item.PricePerMonth };
        if (prices.Any(price => price < 0m))
        {
            throw new ArgumentException("Artikelpriser får inte vara negativa.");
        }

        var holidays = new SwedenPublicHoliday();
        var segments = new List<Segment>();
        long totalTicks = 0;
        for (var date = from.Date; date < to; date = date.AddDays(1))
        {
            if (!IsChargeableDate(date, calendar, holidays))
            {
                continue;
            }

            var start = date < from ? from : date;
            var end = date.AddDays(1) > to ? to : date.AddDays(1);
            segments.Add(new Segment(start, end, totalTicks));
            totalTicks += (end - start).Ticks;
        }

        var rows = new List<PriceRow>();
        if (item.BasePrice > 0m)
        {
            rows.Add(new PriceRow("Baspris", 1m, item.BasePrice.Value));
        }

        if (totalTicks == 0)
        {
            return rows;
        }

        var rates = new[]
        {
            new Rate("Dygn", item.PricePerDay ?? 0m, Hours: 24),
            new Rate("Vecka", item.PricePerWeek ?? 0m, Days: 7),
            new Rate("Månad", item.PricePerMonth ?? 0m, Months: 1),
        }.Where(rate => rate.Price > 0m).ToArray();

        if (rates.Length == 0)
        {
            throw new ArgumentException("Artikeln saknar positiva hyrespriser.");
        }

        var candidates = new List<PriceRow>();
        foreach (var rate in rates)
        {
            long position = 0;
            decimal quantity = 0;
            while (position < totalTicks)
            {
                var currentDate = DateAt(position);
                position = rate.Hours > 0
                    ? Math.Min(totalTicks, position + rate.Hours * TimeSpan.TicksPerHour)
                    : PositionAt(rate.Months > 0 ? currentDate.AddMonths(rate.Months) : currentDate.AddDays(rate.Days));
                quantity++;
            }

            candidates.Add(new PriceRow(rate.Text, quantity, rate.Price));
        }

        rows.Add(candidates.OrderBy(candidate => candidate.Sum).First());
        return rows;

        DateTime DateAt(long position)
        {
            var low = 0;
            var high = segments.Count - 1;
            while (low < high)
            {
                var middle = (low + high + 1) / 2;
                if (segments[middle].Offset <= position)
                {
                    low = middle;
                }
                else
                {
                    high = middle - 1;
                }
            }

            return segments[low].From.AddTicks(position - segments[low].Offset);
        }

        long PositionAt(DateTime date)
        {
            if (date >= to)
            {
                return totalTicks;
            }

            var low = 0;
            var high = segments.Count - 1;
            while (low < high)
            {
                var middle = (low + high) / 2;
                if (segments[middle].To < date)
                {
                    low = middle + 1;
                }
                else
                {
                    high = middle;
                }
            }

            var segment = segments[low];
            var coveredEnd = date < segment.To ? date : segment.To;
            return segment.Offset + Math.Max(0, (coveredEnd - segment.From).Ticks);
        }
    }

    private static bool IsChargeableDate(DateTime date, string calendar, SwedenPublicHoliday holidays)
    {
        if (calendar == ReservationPricingCalendarCodes.AllDays)
        {
            return true;
        }

        if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
        {
            return false;
        }

        var isHolidayEve = (date.Month == 12 && date.Day is 24 or 31)
            || (date.Month == 6 && date.Day is >= 19 and <= 25 && date.DayOfWeek == DayOfWeek.Friday);
        return calendar == ReservationPricingCalendarCodes.WeekDays
            || isHolidayEve
            || !holidays.IsPublicHoliday(date);
    }
}