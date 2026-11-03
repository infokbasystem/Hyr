using System.Security.Claims;
using Backend.Controllers;
using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Backend.Tests;

public class ReservationPricingTests
{
    private static readonly DateTime Start = new(2026, 10, 1, 8, 0, 0);

    [Theory]
    [InlineData("CABIN")]
    [InlineData("TRAILER")]
    [InlineData("LIFT")]
    [InlineData("ALU")]
    [InlineData("HAKI")]
    [InlineData("TOOL")]
    [InlineData("ACCESSORY")]
    public async Task CalculatesDirectItemsWithoutPriceList(string type)
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, type);
        context.VatRates.Add(new VatRate { OfficeId = 1, Rate = 12m, IsDefault = true, IsActive = true });
        await context.SaveChangesAsync();

        var response = await Calculate(context, reservation);

        Assert.Equal("DIRECT", response.PriceTypeUsed);
        var row = Assert.Single(Assert.Single(response.ReservationCalcs).ReservationCalcItems);
        Assert.Equal(200m, row.Sum);
        Assert.Equal(12m, row.VatRate);
        Assert.Equal(CalcPriceTypeCodes.Rent, row.CalcPriceTypeCode);
        Assert.Null(row.PriceListId);
    }

    [Fact]
    public async Task UsesEachItemsOwnPeriodAndActualDatesFirst()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        var first = reservation.ReservationItems.Single();
        first.ActualFrom = Start.AddDays(1);
        first.ActualTo = Start.AddDays(2);
        reservation.ReservationItems.Add(NewItem("TOOL", 2, Start.AddDays(3), Start.AddDays(6)));
        await context.SaveChangesAsync();

        var response = await Calculate(context, reservation, Start.AddDays(20));

        Assert.Equal(2, response.ReservationCalcs.Count);
        Assert.Equal(400m, response.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum));
        Assert.Contains(response.ReservationCalcs, calc => calc.DateTimeFrom == first.ActualFrom && calc.DateTimeTo == first.ActualTo);
        Assert.Contains(response.ReservationCalcs, calc => calc.DateTimeFrom == Start.AddDays(3) && calc.DateTimeTo == Start.AddDays(6));
    }

    [Fact]
    public async Task MixedReservationsRequirePriceListAndCalculateBothPaths()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "VEHICLE");
        var vehicle = reservation.ReservationItems.Single();
        vehicle.ActualFrom = Start;
        vehicle.Item!.ItemCategoryId = 1;
        vehicle.Item.PricePerDay = 1m;
        reservation.ReservationItems.Add(NewItem("CABIN", 2, Start, Start.AddDays(3)));
        await context.SaveChangesAsync();
        Assert.IsType<BadRequestObjectResult>((await Controller(context).ExecuteReservationPricing(new() { ReservationId = reservation.Id })).Result);

        reservation.PriceListId = 1;
        context.PriceLists.Add(new PriceList { Id = 1, OfficeId = 1, Name = "Vehicle list" });
        context.PriceListDayPriceFreeKms.Add(new PriceListDayPriceFreeKm { PriceListId = 1, ItemCategoryId = 1, PricePerDay = 500m });
        await context.SaveChangesAsync();

        var response = await Calculate(context, reservation);

        Assert.Equal("DAYPRICEFREEKM", response.PriceTypeUsed);
        Assert.Equal(1300m, response.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum));
        Assert.Equal(1000m, response.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Single(row => row.ItemId == 1).Sum);
        Assert.Null(response.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Single(row => row.ItemId == 2).PriceListId);
    }

    [Fact]
    public async Task RejectsMissingPricesWithoutDeletingExistingCalculations()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        await context.SaveChangesAsync();
        await Calculate(context, reservation);
        var unpricedItem = NewItem("TOOL", 2, Start, Start.AddDays(1));
        unpricedItem.Item!.PricePerDay = null;
        context.ReservationItems.Add(unpricedItem);
        reservation.ReservationItems.Add(unpricedItem);
        await context.SaveChangesAsync();

        var result = await Controller(context).ExecuteReservationPricing(new() { ReservationId = reservation.Id });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Single(await context.ReservationCalcs.ToListAsync());
        Assert.DoesNotContain(context.ChangeTracker.Entries(), entry => entry.State == EntityState.Deleted);
    }

    [Fact]
    public async Task RecalculationReplacesOnlyUninvoicedCalcsAndDeductsPerItem()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        reservation.ReservationItems.Add(NewItem("TOOL", 2, Start, Start.AddDays(3)));
        await context.SaveChangesAsync();
        var first = await Calculate(context, reservation);
        var retained = await context.ReservationCalcs.Include(calc => calc.ReservationCalcItems).SingleAsync(calc => calc.Id == first.ReservationCalcs[0].Id);
        var retainedRow = retained.ReservationCalcItems.Single();
        retainedRow.InvoiceRows!.Add(new InvoiceRow { OfficeId = 1, InvoiceId = 1, Sum = retainedRow.Sum });
        await context.SaveChangesAsync();

        var second = await Calculate(context, reservation);
        var third = await Calculate(context, reservation);

        Assert.Equal(3, third.ReservationCalcs.Count);
        Assert.Contains(third.ReservationCalcs, calc => calc.Id == retained.Id);
        var deductions = third.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Where(row => row.Text == "Avdrag tidigare fakturerat").ToList();
        Assert.Equal(1, deductions.Count);
        Assert.Equal(1, deductions[0].ItemId);
        Assert.Equal(-200m, deductions[0].Sum);
        Assert.Equal(500m, third.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum));
        Assert.Equal(second.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum), third.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum));
    }

    [Fact]
    public async Task DeductsAllRowsOfPartlyInvoicedRetainedCalc()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        reservation.ReservationItems.Single().Item!.BasePrice = 50m;
        await context.SaveChangesAsync();
        await Calculate(context, reservation);
        var retained = await context.ReservationCalcs.Include(calc => calc.ReservationCalcItems).SingleAsync();
        retained.ReservationCalcItems.First().InvoiceRows!.Add(new InvoiceRow { InvoiceId = 1, OfficeId = 1, Sum = 50m });
        await context.SaveChangesAsync();

        var result = await Calculate(context, reservation);

        Assert.Equal(250m, result.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum));
        Assert.Equal(-250m, result.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Single(row => row.Text == "Avdrag tidigare fakturerat").Sum);
    }

    [Fact]
    public async Task ClearsStaleChargesWhenCalendarMakesWholePeriodFree()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        var item = reservation.ReservationItems.Single();
        item.BookedFrom = new DateTime(2026, 10, 3);
        item.BookedTo = new DateTime(2026, 10, 5);
        await context.SaveChangesAsync();
        await Calculate(context, reservation);
        reservation.PricingCalendarCode = "WEEKDAYS";
        await context.SaveChangesAsync();

        var result = await Calculate(context, reservation);

        Assert.Empty(result.ReservationCalcs);
        Assert.Equal(0, result.NewReservationCalcId);
    }

    [Fact]
    public async Task VehicleUsesExplicitEndOverrideAndRequiresActualStart()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "VEHICLE");
        reservation.PriceListId = 1;
        var vehicle = reservation.ReservationItems.Single();
        vehicle.Item!.ItemCategoryId = 1;
        context.PriceLists.Add(new PriceList { Id = 1, OfficeId = 1 });
        context.PriceListDayPriceFreeKms.Add(new PriceListDayPriceFreeKm { PriceListId = 1, ItemCategoryId = 1, PricePerDay = 500m });
        await context.SaveChangesAsync();
        Assert.IsType<BadRequestObjectResult>((await Controller(context).ExecuteReservationPricing(new() { ReservationId = reservation.Id })).Result);
        vehicle.ActualFrom = Start;
        await context.SaveChangesAsync();

        var result = await Calculate(context, reservation, Start.AddDays(3));

        Assert.Equal(1500m, result.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum));
        Assert.Equal(Start.AddDays(3), result.PeriodTo);
    }

    [Fact]
    public async Task PreservesSingleVehicleRestriction()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "VEHICLE");
        reservation.ReservationItems.Add(NewItem("VEHICLE", 2, Start, Start.AddDays(2)));
        await context.SaveChangesAsync();

        var result = await Controller(context).ExecuteReservationPricing(new() { ReservationId = reservation.Id });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(await context.ReservationCalcs.ToListAsync());
    }

    [Fact]
    public async Task AccumulatesDeductionsAcrossSeveralInvoicedPeriods()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        await context.SaveChangesAsync();
        await Calculate(context, reservation);
        var first = await context.ReservationCalcs.Include(calc => calc.ReservationCalcItems).SingleAsync();
        first.ReservationCalcItems.Single().InvoiceRows!.Add(new InvoiceRow { OfficeId = 1, InvoiceId = 1, Sum = 200m });
        reservation.ReservationItems.Single().BookedTo = Start.AddDays(3);
        await context.SaveChangesAsync();
        var second = await Calculate(context, reservation);
        var secondCalc = await context.ReservationCalcs.Include(calc => calc.ReservationCalcItems).SingleAsync(calc => calc.Id == second.NewReservationCalcId);
        foreach (var row in secondCalc.ReservationCalcItems)
        {
            row.InvoiceRows!.Add(new InvoiceRow { OfficeId = 1, InvoiceId = 2, Sum = row.Sum });
        }
        reservation.ReservationItems.Single().BookedTo = Start.AddDays(4);
        await context.SaveChangesAsync();

        var third = await Calculate(context, reservation);

        Assert.Equal(400m, third.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum));
        var latest = third.ReservationCalcs.Single(calc => calc.Id == third.NewReservationCalcId);
        Assert.Equal(100m, latest.ReservationCalcItems.Sum(row => row.Sum));
        Assert.Equal(-300m, latest.ReservationCalcItems.Single(row => row.Text == "Avdrag tidigare fakturerat").Sum);
    }

    [Fact]
    public async Task RejectsMissingDatesAndCrossOfficeItems()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        var item = reservation.ReservationItems.Single();
        item.BookedTo = null;
        await context.SaveChangesAsync();
        Assert.IsType<BadRequestObjectResult>((await Controller(context).ExecuteReservationPricing(new() { ReservationId = reservation.Id })).Result);
        item.BookedTo = Start.AddDays(1);
        item.Item!.OfficeId = 2;
        await context.SaveChangesAsync();
        Assert.IsType<BadRequestObjectResult>((await Controller(context).ExecuteReservationPricing(new() { ReservationId = reservation.Id })).Result);
        reservation.OfficeId = 2;
        await context.SaveChangesAsync();
        Assert.IsType<NotFoundObjectResult>((await Controller(context).ExecuteReservationPricing(new() { ReservationId = reservation.Id })).Result);
    }

    private static ApplicationDbContext CreateContext() => new(new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static PricingController Controller(ApplicationDbContext context) => new(context, new TestUserService());

    private static Reservation AddReservation(ApplicationDbContext context, string type)
    {
        var reservation = new Reservation { OfficeId = 1 };
        reservation.ReservationItems.Add(NewItem(type, 1, Start, Start.AddDays(2)));
        context.Reservations.Add(reservation);
        return reservation;
    }

    private static ReservationItem NewItem(string type, int itemId, DateTime from, DateTime to) => new()
    {
        OfficeId = 1,
        ItemTypeCode = type,
        Item = new Item { Id = itemId, OfficeId = 1, ItemNr = $"Item {itemId}", ItemTypeCode = type, PricePerDay = 100m },
        BookedFrom = from,
        BookedTo = to,
    };

    private static async Task<ExecuteReservationPricingResponseDto> Calculate(ApplicationDbContext context, Reservation reservation, DateTime? end = null)
    {
        var result = await Controller(context).ExecuteReservationPricing(new ExecuteReservationPricingRequestDto { ReservationId = reservation.Id, CalculateToDate = end });
        return Assert.IsType<ExecuteReservationPricingResponseDto>(Assert.IsType<OkObjectResult>(result.Result).Value);
    }

    private sealed class TestUserService : ICurrentUserService
    {
        public Task<User?> GetCurrentUserAsync(ClaimsPrincipal? principal) => Task.FromResult<User?>(new User { Id = 1, OfficeId = 1 });
    }
}