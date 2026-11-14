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
    [InlineData(2, "Dygn", 200)]
    [InlineData(7, "Vecka", 300)]
    [InlineData(31, "Månad", 900)]
    public async Task CabinUsesReservationPricesInsteadOfMasterPrices(int days, string expectedText, int expectedRent)
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        var cabin = reservation.ReservationItems.Single();
        cabin.BookedTo = Start.AddDays(days);
        cabin.BasePrice = 200m;
        cabin.PricePerDay = 100m;
        cabin.PricePerWeek = 300m;
        cabin.PricePerMonth = 900m;
        cabin.Item!.BasePrice = 1m;
        cabin.Item.PricePerDay = 1m;
        await context.SaveChangesAsync();

        var response = await Calculate(context, reservation);
        var rows = response.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).ToList();

        Assert.Equal(200m, rows.Single(row => row.Text == "Baspris").Sum);
        Assert.Equal((decimal)expectedRent, rows.Single(row => row.Text == expectedText).Sum);
        cabin.Item.PricePerDay = 999m;
        cabin.Item.BasePrice = 999m;
        await context.SaveChangesAsync();
        var recalculated = await Calculate(context, reservation);
        Assert.Equal(200m + expectedRent, recalculated.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum));
    }

    [Fact]
    public async Task CabinDoesNotFallBackToMasterRatesWhenReservationRatesAreCleared()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        var cabin = reservation.ReservationItems.Single();
        cabin.PricePerDay = null;
        cabin.PricePerWeek = 0m;
        await context.SaveChangesAsync();

        var result = await Controller(context).ExecuteReservationPricing(new() { ReservationId = reservation.Id });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(await context.ReservationCalcs.ToListAsync());
    }

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
        reservation.ReservationItems.Single().BasePrice = 50m;
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

    [Fact]
    public async Task ArticleChargesUseSnapshotPriceAndVatAndPreserveSourceOnSave()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        var link = new ReservationItemArticle
        {
            Article = new Article
            {
                OfficeId = 1, ArticleNr = "EXTRA", Name = "Extra key", Price = 999m,
                VatRate = new VatRate { OfficeId = 1, Rate = 12m },
            },
            Quantity = 1.5m,
            UnitPrice = 12.34567m,
        };
        reservation.ReservationItems.Single().ReservationItemArticles.Add(link);
        await context.SaveChangesAsync();

        var response = await Calculate(context, reservation);
        var row = response.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems)
            .Single(row => row.ReservationItemArticleId == link.Id);
        Assert.Equal("Extra key", row.Text);
        Assert.Equal(1.5m, row.Qty);
        Assert.Equal(12.34567m, row.UnitPrice);
        Assert.Equal(18.51851m, row.Sum);
        Assert.Equal(12m, row.VatRate);
        Assert.Equal(link.Article.VatRateId, row.VatId);
        Assert.Equal(218.51851m, response.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum));
        link.Article.Price = 5000m;
        await context.SaveChangesAsync();
        var recalculated = await Calculate(context, reservation);
        Assert.Equal(18.51851m, recalculated.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems)
            .Single(row => row.ReservationItemArticleId == link.Id).Sum);

        var sourceId = link.Id;
        context.ChangeTracker.Clear();
        var controller = new ReservationController(context, new TestUserService());
        var read = Assert.IsType<Reservation>(Assert.IsType<OkObjectResult>((await controller.GetReservation(reservation.Id)).Result).Value);
        Assert.Equal(sourceId, read.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems)
            .Single(row => row.ReservationItemArticleId.HasValue).ReservationItemArticleId);
        Assert.IsType<OkObjectResult>((await controller.PostReservation(new()
        {
            Id = read.Id,
            ReservationItems = read.ReservationItems,
            ReservationCalcs = read.ReservationCalcs,
        })).Result);
        context.ChangeTracker.Clear();
        var savedRow = await context.ReservationCalcItems.SingleAsync(row => row.ReservationItemArticleId == sourceId);
        Assert.Equal(12m, savedRow.VatRate);
        Assert.Equal(18.51851m, savedRow.Sum);
    }

    [Fact]
    public async Task RecalculationDeductsArticlesSeparatelyAndRetainsRemovedArticleHistory()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        var cabin = reservation.ReservationItems.Single();
        var firstLink = new ReservationItemArticle
        {
            Article = new Article { OfficeId = 1, Name = "First", VatRate = new VatRate { OfficeId = 1, Rate = 12m } },
            Quantity = 2m, UnitPrice = 10m,
        };
        var removedLink = new ReservationItemArticle
        {
            Article = new Article { OfficeId = 1, Name = "Removed" }, Quantity = 1m, UnitPrice = 5m,
        };
        cabin.ReservationItemArticles.Add(firstLink);
        cabin.ReservationItemArticles.Add(removedLink);
        await context.SaveChangesAsync();
        await Calculate(context, reservation);
        var retained = await context.ReservationCalcs.Include(calc => calc.ReservationCalcItems).SingleAsync();
        foreach (var row in retained.ReservationCalcItems)
        {
            row.InvoiceRows!.Add(new InvoiceRow { OfficeId = 1, InvoiceId = 1, Sum = row.Sum });
        }
        firstLink.UnitPrice = 12m;
        cabin.ReservationItemArticles.Remove(removedLink);
        context.ReservationItemArticles.Remove(removedLink);
        await context.SaveChangesAsync();

        var second = await Calculate(context, reservation);
        var third = await Calculate(context, reservation);
        Assert.Equal(224m, third.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum));
        Assert.Equal(second.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum),
            third.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum));
        var latest = third.ReservationCalcs.Single(calc => calc.Id == third.NewReservationCalcId);
        Assert.Equal(4m, latest.ReservationCalcItems.Where(row => row.ReservationItemArticleId == firstLink.Id).Sum(row => row.Sum));
        Assert.Equal(-5m, latest.ReservationCalcItems.Single(row => row.ReservationItemArticleId == removedLink.Id).Sum);
        Assert.Equal(12m, latest.ReservationCalcItems.Single(row =>
            row.ReservationItemArticleId == firstLink.Id && row.Sum < 0m).VatRate);
        Assert.Equal(-200m, latest.ReservationCalcItems.Single(row => row.Text == "Avdrag tidigare fakturerat").Sum);
        Assert.False(await context.ReservationItemArticles.AnyAsync(link => link.Id == removedLink.Id));

        var latestCalc = await context.ReservationCalcs.Include(calc => calc.ReservationCalcItems)
            .SingleAsync(calc => calc.Id == third.NewReservationCalcId);
        foreach (var row in latestCalc.ReservationCalcItems)
        {
            row.InvoiceRows!.Add(new InvoiceRow { OfficeId = 1, InvoiceId = 2, Sum = row.Sum });
        }
        firstLink.UnitPrice = 13m;
        await context.SaveChangesAsync();
        var fourth = await Calculate(context, reservation);
        Assert.Equal(226m, fourth.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems).Sum(row => row.Sum));
        Assert.DoesNotContain(fourth.ReservationCalcs.Single(calc => calc.Id == fourth.NewReservationCalcId).ReservationCalcItems,
            row => row.ReservationItemArticleId == removedLink.Id);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("-1")]
    [InlineData("0.000001")]
    [InlineData("10000000000000")]
    public async Task InvalidArticlePriceLeavesPreviousCalculationsUntouched(string? price)
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        var link = new ReservationItemArticle
        {
            Article = new Article { OfficeId = 1, ArticleNr = "EXTRA" }, UnitPrice = 10m,
        };
        reservation.ReservationItems.Single().ReservationItemArticles.Add(link);
        await context.SaveChangesAsync();
        await Calculate(context, reservation);
        link.UnitPrice = price == null ? null : decimal.Parse(price, System.Globalization.CultureInfo.InvariantCulture);
        await context.SaveChangesAsync();

        var result = await Controller(context).ExecuteReservationPricing(new() { ReservationId = reservation.Id });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Single(await context.ReservationCalcs.ToListAsync());
        Assert.DoesNotContain(context.ChangeTracker.Entries(), entry => entry.State == EntityState.Deleted);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(10)]
    public async Task ArticlesAreChargedOnceEvenWhenRentalCalendarIsFree(int price)
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        reservation.PricingCalendarCode = "WEEKDAYS";
        var cabin = reservation.ReservationItems.Single();
        cabin.BookedFrom = new DateTime(2026, 10, 3);
        cabin.BookedTo = new DateTime(2026, 10, 5);
        var link = new ReservationItemArticle { Article = new Article { OfficeId = 1 }, Quantity = 3m, UnitPrice = price };
        cabin.ReservationItemArticles.Add(link);
        await context.SaveChangesAsync();

        var result = await Calculate(context, reservation);

        var row = Assert.Single(Assert.Single(result.ReservationCalcs).ReservationCalcItems);
        Assert.Equal(link.Id, row.ReservationItemArticleId);
        Assert.Equal(3m * price, row.Sum);
    }

    [Fact]
    public async Task ArticleInvoiceRowsUseTheSelectedArticleAndAccount()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        var link = new ReservationItemArticle
        {
            Article = new Article
            {
                OfficeId = 1, ArticleNr = "EXTRA", Name = "Extra key",
                Account = new Account { OfficeId = 1, AccountNr = 3010 },
            },
            Quantity = 2m, UnitPrice = 15m,
        };
        reservation.ReservationItems.Single().ReservationItemArticles.Add(link);
        await context.SaveChangesAsync();
        var response = await Calculate(context, reservation);
        var sourceCalcItem = response.ReservationCalcs.SelectMany(calc => calc.ReservationCalcItems)
            .Single(row => row.ReservationItemArticleId == link.Id);
        var controller = new InvoiceController(context, new TestUserService(), new CalcPriceTypeArticleService(context),
            new SystemAccountService(context), new UnusedPaymentSyncService());

        var invoice = Assert.IsType<InvoiceDto>(Assert.IsType<OkObjectResult>(
            (await controller.GetNewInvoice(reservation.Id, ReceiverTypeCodes.Customer)).Result).Value);
        var row = Assert.Single(invoice.InvoiceRows.Where(row => row.ReservationCalcItemId == sourceCalcItem.Id));
        Assert.Equal(link.ArticleId, row.ArticleId);
        Assert.Equal("EXTRA", row.ArticleNr);
        Assert.Equal(3010, row.AccountNr);
        Assert.Equal(2m, row.Qty);
        Assert.Equal(15m, row.UnitPrice);
        Assert.Equal(30m, row.Sum);
    }

    [Fact]
    public async Task SavingNewCalculationLinksValidatesTheReservationArticleSource()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        var source = new ReservationItemArticle
        {
            Article = new Article { OfficeId = 1, VatRate = new VatRate { OfficeId = 1, Rate = 12m } },
            UnitPrice = 10m,
        };
        reservation.ReservationItems.Single().ReservationItemArticles.Add(source);
        var otherReservation = new Reservation { OfficeId = 2 };
        otherReservation.ReservationItems.Add(NewItem("CABIN", 2, Start, Start.AddDays(1)));
        var otherSource = new ReservationItemArticle { Article = new Article { OfficeId = 2 }, UnitPrice = 15m };
        otherReservation.ReservationItems.Single().ReservationItemArticles.Add(otherSource);
        context.Reservations.Add(otherReservation);
        await context.SaveChangesAsync();
        var controller = new ReservationController(context, new TestUserService());
        var request = new ReservationUpsertDto
        {
            Id = reservation.Id,
            ReservationItems = reservation.ReservationItems,
            ReservationCalcs =
            [
                new()
                {
                    ReservationCalcItems =
                    [
                        new() { ItemId = 1, ReservationItemArticleId = source.Id, Qty = 1m, UnitPrice = 10m, Sum = 10m },
                    ],
                },
            ],
        };
        Assert.IsType<OkObjectResult>((await controller.PostReservation(request)).Result);
        var saved = await context.ReservationCalcItems.SingleAsync();
        Assert.Equal(source.Id, saved.ReservationItemArticleId);
        Assert.Equal(1, saved.OfficeId);
        Assert.Equal(12m, saved.VatRate);

        request.ReservationCalcs.Single().Id = saved.ReservationCalcId!.Value;
        var requestRow = request.ReservationCalcs.Single().ReservationCalcItems.Single();
        requestRow.Id = saved.Id;
        requestRow.ReservationItemArticleId = otherSource.Id;
        Assert.IsType<BadRequestObjectResult>((await controller.PostReservation(request)).Result);
        context.ChangeTracker.Clear();
        Assert.Equal(source.Id, (await context.ReservationCalcItems.SingleAsync()).ReservationItemArticleId);
    }

    private sealed class UnusedPaymentSyncService : IFortnoxInvoicePaymentSyncService
    {
        public Task<FortnoxInvoicePaymentSyncResult> SyncAsync(int officeId, string accessToken, CancellationToken cancellationToken = default)
            => throw new NotSupportedException();
    }

    private static ApplicationDbContext CreateContext() => new(new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Fact]
    public async Task CabinPricesSurviveCreateAndUpdateIncludingNullAndZero()
    {
        using var context = CreateContext();
        context.Items.Add(new Item { Id = 1, OfficeId = 1, ItemTypeCode = "CABIN", PricePerDay = 999m });
        await context.SaveChangesAsync();
        var controller = new ReservationController(context, new TestUserService());
        var request = new ReservationUpsertDto
        {
            ReservationItems = new List<ReservationItem>
            {
                new() { ItemId = 1, ItemTypeCode = "CABIN", BasePrice = 200m, PricePerDay = 123.45678m, PricePerWeek = 300m, PricePerMonth = 900m }
            }
        };

        var created = await controller.PostReservation(request);
        Assert.IsNotType<BadRequestObjectResult>(created.Result);
        var saved = await context.Reservations.Include(reservation => reservation.ReservationItems).SingleAsync();
        var row = Assert.Single(saved.ReservationItems);
        Assert.Equal(123.45678m, row.PricePerDay);
        Assert.Equal(200m, row.BasePrice);
        Assert.Equal(300m, row.PricePerWeek);
        Assert.Equal(900m, row.PricePerMonth);

        request.Id = saved.Id;
        request.ReservationItems.Single().Id = row.Id;
        request.ReservationItems.Single().BasePrice = 0m;
        request.ReservationItems.Single().PricePerWeek = null;
        await controller.PostReservation(request);
        Assert.Equal(0m, row.BasePrice);
        Assert.Null(row.PricePerWeek);
        Assert.Equal(123.45678m, row.PricePerDay);
        Assert.Equal(999m, (await context.Items.SingleAsync()).PricePerDay);
        var readResult = await controller.GetReservation(saved.Id);
        var readReservation = Assert.IsType<Reservation>(Assert.IsType<OkObjectResult>(readResult.Result).Value);
        var readRow = Assert.Single(readReservation.ReservationItems);
        Assert.Equal(0m, readRow.BasePrice);
        Assert.Equal(123.45678m, readRow.PricePerDay);
        Assert.Null(readRow.PricePerWeek);
        Assert.Equal(900m, readRow.PricePerMonth);
    }

    [Fact]
    public async Task RejectsNegativeCabinPricesOnSave()
    {
        using var context = CreateContext();
        var result = await new ReservationController(context, new TestUserService()).PostReservation(new ReservationUpsertDto
        {
            ReservationItems = new List<ReservationItem> { new() { ItemTypeCode = "CABIN", PricePerMonth = -1m } }
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(await context.Reservations.ToListAsync());
    }

    [Fact]
    public async Task PlanningCabinChangeCopiesPricesButDateMoveRetainsEdits()
    {
        using var context = CreateContext();
        var reservation = AddReservation(context, "CABIN");
        context.Items.Add(new Item { Id = 2, OfficeId = 1, ItemTypeCode = "CABIN", BasePrice = 200m, PricePerDay = 150m, PricePerWeek = 450m, PricePerMonth = 1200m });
        await context.SaveChangesAsync();
        var row = reservation.ReservationItems.Single();
        var controller = new PlanningController(context, new TestUserService());
        var request = new UpdatePlanningReservationRequest
        {
            VehicleId = 2,
            Start = new DateTimeOffset(Start, TimeSpan.Zero),
            End = new DateTimeOffset(Start.AddDays(2), TimeSpan.Zero)
        };

        Assert.IsType<OkObjectResult>((await controller.UpdateReservation(row.Id, request, CancellationToken.None)).Result);
        Assert.Equal(200m, row.BasePrice);
        Assert.Equal(150m, row.PricePerDay);
        Assert.Equal(450m, row.PricePerWeek);
        Assert.Equal(1200m, row.PricePerMonth);
        row.PricePerDay = 50m;
        await controller.UpdateReservation(row.Id, new UpdatePlanningReservationRequest
        {
            VehicleId = 2,
            Start = request.Start,
            End = request.End.AddDays(1)
        }, CancellationToken.None);
        Assert.Equal(50m, row.PricePerDay);
    }

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
        PricePerDay = type == "CABIN" ? 100m : null,
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