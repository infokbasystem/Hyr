using System.Security.Claims;
using Backend.Controllers;
using Backend.Data;
using Backend.Dtos;
using Backend.Filters;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Backend.Tests;

public class PlanningControllerTests
{
    private static readonly DateTime Start = new(2026, 11, 8, 8, 30, 0);

    [Theory]
    [InlineData("CABIN", new[] { 2, 1 })]
    [InlineData(" lift ", new[] { 3, 1 })]
    [InlineData("cabin", new[] { 2, 1 })]
    [InlineData("UNKNOWN", new int[] { })]
    public async Task TypedCategoriesRequireActiveMatchingOfficeItemsAndRetainOrder(string type, int[] expected)
    {
        using var context = await Seed();
        var categories = Value(await Controller(context).GetCategories(type));
        Assert.Equal(expected, categories.Select(category => category.Id));
    }

    [Fact]
    public async Task UntypedCategoriesKeepAllOfficeCategories()
    {
        using var context = await Seed();
        var categories = Value(await Controller(context).GetCategories());
        Assert.Equal(new[] { 2, 3, 1, 4, 5, 6 }, categories.Select(category => category.Id));
    }

    [Theory]
    [InlineData("CABIN", 1, new[] { 11, 12 })]
    [InlineData("LIFT", 1, new[] { 21 })]
    [InlineData("CABIN", 2, new[] { 13 })]
    [InlineData("LIFT", 3, new[] { 22 })]
    public async Task CategoryFiltersScopeRowsAndBookingsToTheSameItems(string type, int categoryId, int[] expected)
    {
        using var context = await Seed();
        var categoryIds = new List<int> { categoryId };
        var rows = await RowIds(context, type, categoryIds);
        var bookings = Value(await Controller(context).GetReservations(new PlanningReservationFilter
        {
            ItemTypeCode = type,
            CategoryIds = categoryIds,
            From = Start,
            To = Start.AddDays(2),
        }));
        Assert.Equal(expected.Order(), rows.Order());
        Assert.Equal(expected.Order(), bookings.Select(booking => booking.VehicleId).Order());
    }

    [Theory]
    [InlineData("CABIN", new[] { 11, 12, 13, 14 })]
    [InlineData("LIFT", new[] { 21, 22, 23 })]
    public async Task EmptyCategoriesIncludeUncategorizedActiveItems(string type, int[] expected)
    {
        using var context = await Seed();
        Assert.Equal(expected.Order(), (await RowIds(context, type, [])).Order());
        var bookings = Value(await Controller(context).GetReservations(new() { ItemTypeCode = type, CategoryIds = [] }));
        Assert.Equal(expected.Order(), bookings.Select(booking => booking.VehicleId).Order());
    }

    [Fact]
    public async Task CabinCategoryAndLegacyTypeFiltersIntersect()
    {
        using var context = await Seed();
        var cabins = Value(await Controller(context).GetCabins(new()
        {
            CategoryIds = [1],
            CabinTypeCodes = [" office "],
        }));
        Assert.Equal(11, Assert.Single(cabins).Id);
    }

    [Theory]
    [InlineData("CABIN", 11)]
    [InlineData("LIFT", 21)]
    public async Task AvailabilityUsesActualDatesAndInclusiveBoundaries(string type, int itemId)
    {
        using var context = await Seed();
        var booking = await context.ReservationItems.SingleAsync(row => row.ItemId == itemId);
        booking.ActualFrom = Start.AddDays(4);
        booking.ActualTo = Start.AddDays(5);
        await context.SaveChangesAsync();

        Assert.Contains(itemId, await RowIds(context, type, null, Start, Start.AddDays(1)));
        Assert.DoesNotContain(itemId, await RowIds(context, type, null, Start.AddDays(3), Start.AddDays(4)));
        Assert.DoesNotContain(itemId, await RowIds(context, type, null, Start.AddDays(5), Start.AddDays(6)));
        Assert.Contains(itemId, await RowIds(context, type, null, Start.AddDays(5).AddTicks(1), Start.AddDays(6)));
        booking.ActualFrom = null;
        booking.ActualTo = null;
        await context.SaveChangesAsync();
        Assert.DoesNotContain(itemId, await RowIds(context, type, null, Start.AddDays(2), Start.AddDays(3)));
        Assert.Contains(itemId, await RowIds(context, type, null, Start.AddDays(2).AddTicks(1), Start.AddDays(3)));
    }

    [Fact]
    public async Task LiftReassignmentCopiesPricesAndRetainsClockTimeAndRejectsWrongOfficeOrType()
    {
        using var context = await Seed();
        var controller = Controller(context);
        var row = await context.ReservationItems.SingleAsync(item => item.ItemId == 21);
        row.BasePrice = 42m;
        row.PricePerDay = 84m;
        await context.SaveChangesAsync();
        var request = new UpdatePlanningReservationRequest
        {
            VehicleId = 22,
            Start = new DateTimeOffset(Start.AddDays(3), TimeSpan.Zero),
            End = new DateTimeOffset(Start.AddDays(5), TimeSpan.Zero),
        };
        Assert.IsType<OkObjectResult>((await controller.UpdateReservation(row.Id, request, CancellationToken.None)).Result);
        Assert.Equal(22, row.ItemId);
        Assert.Equal(Start.TimeOfDay, row.BookedFrom!.Value.TimeOfDay);
        Assert.Equal(100m, row.BasePrice);
        Assert.Equal(200m, row.PricePerDay);

        foreach (var targetId in new[] { 11, 31, 71 })
        {
            var rejectedRequest = new UpdatePlanningReservationRequest
            {
                VehicleId = targetId,
                Start = request.Start,
                End = request.End,
            };
            Assert.IsType<BadRequestObjectResult>((await controller.UpdateReservation(row.Id, rejectedRequest, CancellationToken.None)).Result);
            Assert.Equal(22, row.ItemId);
            Assert.Equal(100m, row.BasePrice);
            Assert.Equal(200m, row.PricePerDay);
        }
    }

    [Fact]
    public async Task LiftActiveOverrideAndDtoOrderingMatchCabins()
    {
        using var context = await Seed();
        var lifts = Value(await Controller(context).GetLifts(new()));
        Assert.Equal(new[] { 22, 21, 23 }, lifts.Select(item => item.Id));
        var lift = lifts.Single(item => item.Id == 21);
        Assert.Equal("Shared", lift.ItemCategoryName);
        Assert.Equal("Serial 21", lift.SerialNr);
        Assert.Equal("Maker", lift.Manufacturer);
        Assert.Equal(24, Assert.Single(Value(await Controller(context).GetLifts(new() { IsActive = false }))).Id);
    }

    [Fact]
    public async Task NewQueriesRetainAuthenticationSemantics()
    {
        using var context = await Seed();
        var controller = new PlanningController(context, new TestUserService(null));
        Assert.IsType<UnauthorizedObjectResult>((await controller.GetCategories("LIFT")).Result);
        Assert.IsType<UnauthorizedObjectResult>((await controller.GetLifts(new())).Result);
        Assert.NotNull(typeof(PlanningController).GetMethod(nameof(PlanningController.GetLifts))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), true).SingleOrDefault());
    }

    [Fact]
    public async Task NewLiftReservationSavesAppearsInPlanningAndCopiesPricesOnMove()
    {
        using var context = await Seed();
        var previousIds = await context.Reservations.Select(reservation => reservation.Id).ToListAsync();
        var reservations = new ReservationController(context, new TestUserService(new User { Id = 1, OfficeId = 1 }));
        var result = await reservations.PostReservation(new ReservationUpsertDto
        {
            ReservationItems = [new ReservationItem
            {
                ItemId = 21,
                ItemTypeCode = "LIFT",
                BookedFrom = Start.AddDays(7),
                BookedTo = Start.AddDays(9),
            }],
        });
        Assert.IsType<OkObjectResult>(result.Result);
        var saved = await context.Reservations.Include(reservation => reservation.ReservationItems)
            .SingleAsync(reservation => !previousIds.Contains(reservation.Id));
        var row = Assert.Single(saved.ReservationItems);
        Assert.Equal("LIFT", row.ItemTypeCode);
        Assert.Equal(21, row.ItemId);
        Assert.Null(row.ActualFrom);
        Assert.Null(row.ActualTo);
        Assert.Null(row.BasePrice);
        Assert.Null(row.PricePerDay);
        Assert.Null(row.PricePerWeek);
        Assert.Null(row.PricePerMonth);

        var planning = Controller(context);
        var bookings = Value(await planning.GetReservations(new() { ItemTypeCode = "LIFT", CategoryIds = [1] }));
        Assert.Contains(bookings, booking => booking.Id == row.Id && booking.ReservationId == saved.Id);
        Assert.IsType<OkObjectResult>((await planning.UpdateReservation(row.Id, new()
        {
            VehicleId = 22,
            Start = new DateTimeOffset(Start.AddDays(10), TimeSpan.Zero),
            End = new DateTimeOffset(Start.AddDays(12), TimeSpan.Zero),
        }, CancellationToken.None)).Result);
        var read = Assert.IsType<Reservation>(Assert.IsType<OkObjectResult>((await reservations.GetReservation(saved.Id)).Result).Value);
        var readRow = Assert.Single(read.ReservationItems);
        Assert.Equal(22, readRow.ItemId);
        Assert.Equal(Start.AddDays(10), readRow.BookedFrom);
        Assert.Equal(100m, readRow.BasePrice);
        Assert.Equal(200m, readRow.PricePerDay);
        Assert.Equal(200m, (await context.Items.SingleAsync(item => item.Id == 22)).PricePerDay);
    }

    private static List<T> Value<T>(ActionResult<List<T>> result) =>
        Assert.IsType<List<T>>(Assert.IsType<OkObjectResult>(result.Result).Value);

    [Fact]
    public async Task CustomerRentalsIncludeAllItemTypesAndFutureBookingsButExcludeReturnedAndOtherOffices()
    {
        using var context = await Seed();
        var rows = await context.ReservationItems.Include(item => item.Reservation).ToListAsync();
        var future = DateTime.Now.AddYears(2);
        foreach (var row in rows)
        {
            row.BookedFrom = future;
            row.BookedTo = future.AddDays(7);
        }
        rows.Single(item => item.ItemId == 12).ActualTo = future;
        rows.Single(item => item.ItemId == 13).IsCheckedIn = true;
        rows.Single(item => item.ItemId == 14).Reservation!.OfficeId = 2;
        var cabin = rows.Single(item => item.ItemId == 11);
        cabin.Reservation!.CustomerId = 101;
        cabin.Reservation.CustomerName = "Testkund AB";
        cabin.Reservation.DeliveryPlace = "Umeå Hamn";
        await context.SaveChangesAsync();

        var rentals = Value(await Controller(context).GetCustomerRentals());
        Assert.Equal(new[] { 11, 21, 22, 23, 31 }, rentals.Select(item => item.ItemId).Order());
        Assert.All(rentals, item => Assert.Equal("booked", item.Status));
        var rental = Assert.Single(rentals, item => item.ItemId == 11);
        Assert.Equal(cabin.Id, rental.Id);
        Assert.Equal(cabin.Reservation.Id, rental.ReservationId);
        Assert.Equal(101, rental.CustomerId);
        Assert.Equal("Testkund AB", rental.Customer);
        Assert.Equal("Umeå Hamn", rental.DeliveryPlace);
        Assert.Equal("Shared", rental.ItemName);
        Assert.Equal("Item 11", rental.ItemNr);
        Assert.Equal("Serial 11", rental.SerialNr);
        Assert.Equal(future, rental.Start!.Value.DateTime);
        Assert.Equal(future.AddDays(7), rental.End!.Value.DateTime);
    }

    [Theory]
    [InlineData(false, 7, 14, "booked")]
    [InlineData(false, -7, 7, "late_out")]
    [InlineData(false, -14, -7, "late_out")]
    [InlineData(true, -7, 7, "out")]
    [InlineData(true, -14, -7, "late_in")]
    public async Task CustomerRentalsUseTheSameStatusRulesAsTimelines(bool handedOut, int startDays, int endDays, string status)
    {
        using var context = await Seed();
        var row = await context.ReservationItems.SingleAsync(item => item.ItemId == 11);
        var now = DateTime.Now;
        row.BookedFrom = now.AddDays(startDays);
        row.BookedTo = now.AddDays(endDays);
        row.ActualFrom = handedOut ? row.BookedFrom!.Value.AddHours(1) : null;
        await context.SaveChangesAsync();

        var rental = Assert.Single(Value(await Controller(context).GetCustomerRentals()), item => item.Id == row.Id);
        Assert.Equal(status, rental.Status);
        Assert.Equal(row.ActualFrom ?? row.BookedFrom, rental.Start!.Value.DateTime);
    }

    [Fact]
    public async Task CustomerRentalsKeepUndatedReturnsAndInactiveRentedItemsButExcludeDraftRows()
    {
        using var context = await Seed();
        var rows = await context.ReservationItems.ToListAsync();
        var rented = rows.Single(item => item.ItemId == 11);
        rented.BookedFrom = null;
        rented.BookedTo = null;
        rented.ActualFrom = DateTime.Now.AddDays(-1);
        (await context.Items.SingleAsync(item => item.Id == 11)).IsActive = false;
        var draft = rows.Single(item => item.ItemId == 12);
        draft.BookedFrom = null;
        draft.BookedTo = null;
        await context.SaveChangesAsync();

        var rentals = Value(await Controller(context).GetCustomerRentals());
        var rental = Assert.Single(rentals, item => item.ItemId == 11);
        Assert.Equal("out", rental.Status);
        Assert.Null(rental.End);
        Assert.Equal("Kund saknas", rental.Customer);
        Assert.DoesNotContain(rentals, item => item.ItemId == 12);
    }

    [Fact]
    public async Task CustomerRentalsRequireAnAuthenticatedOfficeUser()
    {
        using var context = await Seed();
        var controller = new PlanningController(context, new TestUserService(null));
        Assert.IsType<UnauthorizedObjectResult>((await controller.GetCustomerRentals()).Result);
        Assert.NotNull(typeof(PlanningController).GetMethod(nameof(PlanningController.GetCustomerRentals))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), true).SingleOrDefault());
    }

    [Fact]
    public async Task CustomerRentalsScopeEveryLinkedEntityAndUseTheItemModelAndIdentifiers()
    {
        using var context = await Seed();
        var rows = await context.ReservationItems.Include(item => item.Reservation).ToListAsync();
        rows.Single(item => item.ItemId == 21).OfficeId = 2;
        (await context.Items.SingleAsync(item => item.Id == 22)).OfficeId = 2;
        rows.Single(item => item.ItemId == 23).Reservation!.OfficeId = 2;
        var cabin = await context.Items.SingleAsync(item => item.Id == 11);
        cabin.ItemModel = new ItemModel { Name = "10 ft Kontorsbod" };
        cabin.RegNr = "TEST 01";
        await context.SaveChangesAsync();

        var rentals = Value(await Controller(context).GetCustomerRentals());
        Assert.Equal(new[] { 11, 12, 13, 14, 31 }, rentals.Select(item => item.ItemId).Order());
        var rental = Assert.Single(rentals, item => item.ItemId == 11);
        Assert.Equal("10 ft Kontorsbod", rental.ItemName);
        Assert.Equal("TEST 01", rental.RegNr);
        Assert.Equal("Serial 11", rental.SerialNr);
    }

    private static PlanningController Controller(ApplicationDbContext context) => new(context, new TestUserService(new User { Id = 1, OfficeId = 1 }));

    private static async Task<int[]> RowIds(ApplicationDbContext context, string type, List<int>? categories,
        DateTime? from = null, DateTime? to = null)
    {
        if (type == "CABIN")
        {
            return Value(await Controller(context).GetCabins(new()
            {
                CategoryIds = categories, AvailableFrom = from, AvailableTo = to,
            })).Select(item => item.Id).ToArray();
        }
        return Value(await Controller(context).GetLifts(new()
        {
            CategoryIds = categories, AvailableFrom = from, AvailableTo = to,
        })).Select(item => item.Id).ToArray();
    }

    private static async Task<ApplicationDbContext> Seed()
    {
        var context = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        context.ItemCategories.AddRange(
            new ItemCategory { Id = 1, OfficeId = 1, Name = "Shared", SortOrder = 2 },
            new ItemCategory { Id = 2, OfficeId = 1, Name = "Cabins", SortOrder = 1 },
            new ItemCategory { Id = 3, OfficeId = 1, Name = "Lifts", SortOrder = 1 },
            new ItemCategory { Id = 4, OfficeId = 1, Name = "Inactive", SortOrder = 3 },
            new ItemCategory { Id = 5, OfficeId = 1, Name = "Vehicle", SortOrder = 4 },
            new ItemCategory { Id = 6, OfficeId = 1, Name = "Empty", SortOrder = 5 },
            new ItemCategory { Id = 7, OfficeId = 2, Name = "Other office", SortOrder = 0 });
        context.CabinTypes.AddRange(new CabinType { Code = "OFFICE", Name = "Office" }, new CabinType { Code = "STORE", Name = "Store" });
        AddItem(context, 11, "CABIN", 1, cabinType: "OFFICE");
        AddItem(context, 12, "CABIN", 1, cabinType: "STORE");
        AddItem(context, 13, "CABIN", 2);
        AddItem(context, 14, "CABIN", null);
        AddItem(context, 15, "CABIN", 4, active: false, booked: false);
        AddItem(context, 21, "LIFT", 1);
        AddItem(context, 22, "LIFT", 3);
        AddItem(context, 23, "LIFT", null);
        AddItem(context, 24, "LIFT", 4, active: false, booked: false);
        AddItem(context, 31, "VEHICLE", 5);
        AddItem(context, 71, "LIFT", 7, office: 2);
        AddItem(context, 72, "CABIN", 6, office: 2);
        AddItem(context, 73, "LIFT", 6, office: 2);
        await context.SaveChangesAsync();
        return context;
    }

    private static void AddItem(ApplicationDbContext context, int id, string type, int? category,
        int office = 1, bool active = true, string? cabinType = null, bool booked = true)
    {
        var item = new Item
        {
            Id = id, OfficeId = office, ItemTypeCode = type, ItemCategoryId = category,
            ItemNr = $"Item {id}", SerialNr = $"Serial {id}", Manufacturer = "Maker",
            IsActive = active, CabinTypeCode = cabinType, BasePrice = 100m, PricePerDay = 200m,
        };
        context.Items.Add(item);
        if (booked)
        {
            context.Reservations.Add(new Reservation
            {
                OfficeId = office,
                ReservationItems = [new ReservationItem
                {
                    OfficeId = office, Item = item, ItemTypeCode = type,
                    BookedFrom = Start, BookedTo = Start.AddDays(2),
                }],
            });
        }
    }

    private sealed class TestUserService(User? user) : ICurrentUserService
    {
        public Task<User?> GetCurrentUserAsync(ClaimsPrincipal? principal) => Task.FromResult(user);
    }
}