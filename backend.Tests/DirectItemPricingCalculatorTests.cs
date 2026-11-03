using Backend.Models;
using Backend.Services;
using Xunit;

namespace Backend.Tests;

public class DirectItemPricingCalculatorTests
{
    [Fact]
    public void SelectsOneRateForWholePeriodWithOneBaseCharge()
    {
        var item = new Item { BasePrice = 50m, PricePerHour = 10m, PricePerDay = 100m, PricePerWeek = 500m };
        var from = new DateTime(2026, 10, 1, 8, 0, 0);
        var rows = DirectItemPricingCalculator.Calculate(item, from, from.AddDays(8).AddHours(2), "ALLDAYS");

        Assert.Equal(950m, rows.Sum(row => row.Sum));
        Assert.Equal(1m, rows.Single(row => row.Text == "Baspris").Qty);
        Assert.Equal(9m, rows.Single(row => row.Text == "Dygn").Qty);
        Assert.Equal(2, rows.Count);
        Assert.DoesNotContain(rows, row => row.Text == "Timme");
    }

    [Fact]
    public void DoesNotCombineMonthAndDayEvenWhenCombinationCostsLess()
    {
        var from = new DateTime(2026, 10, 1);
        var rows = DirectItemPricingCalculator.Calculate(new Item { PricePerDay = 100m, PricePerMonth = 1000m }, from, from.AddMonths(1).AddDays(1), "ALLDAYS");

        var row = Assert.Single(rows);
        Assert.Equal("Månad", row.Text);
        Assert.Equal(2m, row.Qty);
        Assert.Equal(2000m, row.Sum);
    }

    [Theory]
    [InlineData(1, "Dygn", 100)]
    [InlineData(6, "Vecka", 500)]
    [InlineData(20, "Månad", 1000)]
    public void ChoosesLowestWholePeriodTotal(int days, string expectedRate, int expectedTotal)
    {
        var from = new DateTime(2026, 10, 1);
        var rows = DirectItemPricingCalculator.Calculate(new Item { PricePerDay = 100m, PricePerWeek = 500m, PricePerMonth = 1000m }, from, from.AddDays(days), "ALLDAYS");

        var row = Assert.Single(rows);
        Assert.Equal(expectedRate, row.Text);
        Assert.Equal(expectedTotal, row.Sum);
    }

    [Fact]
    public void CanUseLargerPackageForShorterRental()
    {
        var item = new Item { PricePerDay = 100m, PricePerWeek = 150m };
        var from = new DateTime(2026, 10, 1);

        var rows = DirectItemPricingCalculator.Calculate(item, from, from.AddDays(2), "ALLDAYS");

        Assert.Equal(150m, rows.Sum(row => row.Sum));
    }

    [Theory]
    [InlineData(2026, 1, 31)]
    [InlineData(2028, 1, 31)]
    [InlineData(2026, 3, 1)]
    public void MonthFollowsCalendarInsteadOfThirtyDays(int year, int month, int day)
    {
        var from = new DateTime(year, month, day);
        var item = new Item { PricePerDay = 100m, PricePerMonth = 1000m };

        var rows = DirectItemPricingCalculator.Calculate(item, from, from.AddMonths(1), "ALLDAYS");

        Assert.Equal(1000m, rows.Sum(row => row.Sum));
        Assert.Equal(1m, rows.Single().Qty);
    }

    [Theory]
    [InlineData("ALLDAYS", 400)]
    [InlineData("WEEKDAYS", 200)]
    [InlineData("WORKINGDAYS", 100)]
    public void AppliesSwedishEasterHolidayCalendar(string calendar, int total)
    {
        var item = new Item { PricePerDay = 100m };
        var rows = DirectItemPricingCalculator.Calculate(item, new DateTime(2026, 4, 2), new DateTime(2026, 4, 6), calendar);

        Assert.Equal(total, rows.Sum(row => row.Sum));
    }

    [Theory]
    [InlineData(2026, 12, 25)]
    [InlineData(2026, 1, 1)]
    [InlineData(2026, 1, 6)]
    [InlineData(2026, 4, 6)]
    [InlineData(2026, 5, 1)]
    [InlineData(2026, 5, 14)]
    public void ExcludesPublicHolidays(int year, int month, int day)
    {
        var from = new DateTime(year, month, day);
        var rows = DirectItemPricingCalculator.Calculate(new Item { PricePerDay = 100m }, from, from.AddDays(1), "WORKINGDAYS");

        Assert.Empty(rows);
    }

    [Theory]
    [InlineData(2026, 12, 24)]
    [InlineData(2026, 12, 31)]
    [InlineData(2026, 6, 19)]
    public void HolidayEvesAreNotPublicHolidays(int year, int month, int day)
    {
        var from = new DateTime(year, month, day);
        var rows = DirectItemPricingCalculator.Calculate(new Item { PricePerDay = 100m }, from, from.AddDays(1), "WORKINGDAYS");

        Assert.Equal(100m, rows.Sum(row => row.Sum));
    }

    [Fact]
    public void WeeklyRatesDoNotStretchAcrossExcludedWeekends()
    {
        var item = new Item { PricePerDay = 100m, PricePerWeek = 450m };
        var from = new DateTime(2026, 10, 5);
        var rows = DirectItemPricingCalculator.Calculate(item, from, from.AddDays(8), "WEEKDAYS");

        Assert.Equal(600m, rows.Sum(row => row.Sum));
    }

    [Fact]
    public void HandlesCalendarPackageEndingInTrailingExcludedDays()
    {
        var from = new DateTime(2026, 10, 3);
        var rows = DirectItemPricingCalculator.Calculate(new Item { PricePerWeek = 450m }, from, from.AddDays(9), "WEEKDAYS");

        Assert.Equal(450m, rows.Sum(row => row.Sum));
    }

    [Fact]
    public void MonthlyPackageCanEndInsideTrailingExcludedWeekend()
    {
        var rows = DirectItemPricingCalculator.Calculate(new Item { PricePerMonth = 1000m }, new DateTime(2026, 1, 1), new DateTime(2026, 2, 2), "WEEKDAYS");

        Assert.Equal(1000m, rows.Sum(row => row.Sum));
    }

    [Fact]
    public void RoundsPartialDaysUp()
    {
        var from = new DateTime(2026, 10, 1, 8, 15, 0);
        Assert.Equal(100m, DirectItemPricingCalculator.Calculate(new Item { PricePerDay = 100m }, from, from.AddMinutes(61), "ALLDAYS").Sum(row => row.Sum));
        Assert.Equal(200m, DirectItemPricingCalculator.Calculate(new Item { PricePerDay = 100m }, from, from.AddHours(25), "ALLDAYS").Sum(row => row.Sum));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(-1)]
    public void IgnoresHourlyPrice(int hourlyPrice)
    {
        var from = new DateTime(2026, 10, 1);
        var rows = DirectItemPricingCalculator.Calculate(new Item { PricePerHour = hourlyPrice, PricePerDay = 100m }, from, from.AddHours(1), "ALLDAYS");

        Assert.Equal(100m, rows.Sum(row => row.Sum));
        Assert.Equal("Dygn", Assert.Single(rows).Text);
    }

    [Fact]
    public void RejectsMissingZeroAndNegativeRates()
    {
        var from = new DateTime(2026, 10, 1);
        foreach (var item in new[] { new Item(), new Item { BasePrice = 10m }, new Item { PricePerHour = 10m }, new Item { PricePerDay = 0m }, new Item { PricePerDay = -1m } })
        {
            Assert.Throws<ArgumentException>(() => DirectItemPricingCalculator.Calculate(item, from, from.AddDays(1), "ALLDAYS"));
        }
    }

    [Fact]
    public void RejectsInvalidPeriodAndCalendar()
    {
        var from = new DateTime(2026, 10, 1);
        var item = new Item { PricePerDay = 100m };
        Assert.Throws<ArgumentException>(() => DirectItemPricingCalculator.Calculate(item, from, from, "ALLDAYS"));
        Assert.Throws<ArgumentException>(() => DirectItemPricingCalculator.Calculate(item, from, from.AddDays(1), "INVALID"));
    }

    [Fact]
    public void SkipsExcludedDaysAndKeepsDecimalPrecision()
    {
        var from = new DateTime(2026, 10, 23, 12, 0, 0);
        var rows = DirectItemPricingCalculator.Calculate(new Item { PricePerDay = 1.12345m }, from, new DateTime(2026, 10, 26, 12, 0, 0), "WEEKDAYS");

        Assert.Equal(1.12345m, rows.Sum(row => row.Sum));
    }
}