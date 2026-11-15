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

public class MobileControllerTests
{
    private static readonly DateTime Start = new(2026, 11, 10, 8, 0, 0);

    [Fact]
    public async Task AvailableItemsExcludeOverlappingUnreturnedAndBlockedItems()
    {
        using var context = await Seed();
        var ids = await AvailableIds(context, Start.AddDays(1), Start.AddDays(1));

        // 1 free, 2 booked in window, 3 delivered and overdue, 4 blocked, 5 inactive, 6 other office, 7 returned
        Assert.Equal(new[] { 1, 7 }, ids);
        Assert.Contains(2, await AvailableIds(context, Start.AddDays(2).AddTicks(1), Start.AddDays(3)));
        Assert.DoesNotContain(3, await AvailableIds(context, Start.AddDays(30), Start.AddDays(31)));
        Assert.Contains(4, await AvailableIds(context, Start.AddDays(6), Start.AddDays(7)));
    }

    [Fact]
    public async Task AvailableItemsReportNextBookingAndPendingCheckIn()
    {
        using var context = await Seed();
        var items = Value(await Controller(context).GetAvailableItems(new() { From = Start.AddDays(-2), To = Start.AddDays(-1) }));

        Assert.Equal(Start, Assert.Single(items, item => item.Id == 2).NextBookedFrom);
        var returned = Assert.Single(items, item => item.Id == 7);
        Assert.NotNull(returned.CheckInReservationId);
        Assert.Null(Assert.Single(items, item => item.Id == 1).CheckInReservationId);
    }

    [Fact]
    public async Task DeliverVehicleAlsoDeliversAccessoriesAndActivatesReservation()
    {
        using var context = await Seed();
        var reservation = await AddVehicleReservation(context);
        var vehicleRow = reservation.ReservationItems.Single(row => row.ItemTypeCode == "VEHICLE");
        var at = Start.AddHours(1);

        var result = Value(await Controller(context).UpdateItemStatus(reservation.Id,
            new() { Action = "deliver", ReservationItemIds = [vehicleRow.Id], At = at }));

        Assert.Equal(ReservationStatusCodes.Active, result.StatusCode);
        Assert.Equal(2, result.UpdatedReservationItemIds.Count);
        Assert.All(reservation.ReservationItems.Where(row => row.ItemTypeCode != "LIFT"), row => Assert.Equal(at, row.ActualFrom));
        Assert.Null(reservation.ReservationItems.Single(row => row.ItemTypeCode == "LIFT").ActualFrom);
        Assert.Equal(1, reservation.ModifiedByUserId);
    }

    [Fact]
    public async Task ReturnAndCheckInFollowTheItemLifecycle()
    {
        using var context = await Seed();
        var reservation = await AddVehicleReservation(context);
        var controller = Controller(context);
        // Legacy rows can carry a stale check-in flag before they are ever delivered.
        reservation.ReservationItems.First().IsCheckedIn = true;
        await context.SaveChangesAsync();

        Assert.IsType<ConflictObjectResult>((await controller.UpdateItemStatus(reservation.Id, new() { Action = "return" })).Result);
        await controller.UpdateItemStatus(reservation.Id, new() { Action = "deliver", At = Start });
        Assert.All(reservation.ReservationItems, row => Assert.False(row.IsCheckedIn));
        Assert.IsType<BadRequestObjectResult>((await controller.UpdateItemStatus(reservation.Id,
            new() { Action = "return", At = Start.AddMinutes(-15) })).Result);

        var returned = Value(await controller.UpdateItemStatus(reservation.Id, new() { Action = "return", At = Start.AddDays(1) }));
        Assert.Equal(ReservationStatusCodes.Returned, returned.StatusCode);
        Assert.All(reservation.ReservationItems, row => Assert.Equal(Start.AddDays(1), row.ActualTo));

        Value(await controller.UpdateItemStatus(reservation.Id, new() { Action = "checkin" }));
        Assert.All(reservation.ReservationItems, row => Assert.True(row.IsCheckedIn));
    }

    [Fact]
    public async Task StatusUpdateRejectsForeignRowsIneligibleRowsAndOtherOffices()
    {
        using var context = await Seed();
        var reservation = await AddVehicleReservation(context);
        var otherRowId = await context.ReservationItems.Where(row => row.ReservationId != reservation.Id).Select(row => row.Id).FirstAsync();
        var controller = Controller(context);

        Assert.IsType<BadRequestObjectResult>((await controller.UpdateItemStatus(reservation.Id,
            new() { Action = "deliver", ReservationItemIds = [otherRowId] })).Result);
        Assert.IsType<ConflictObjectResult>((await controller.UpdateItemStatus(reservation.Id,
            new() { Action = "checkin", ReservationItemIds = [reservation.ReservationItems.First().Id] })).Result);
        Assert.IsType<BadRequestObjectResult>((await controller.UpdateItemStatus(reservation.Id, new() { Action = "undo" })).Result);
        Assert.IsType<NotFoundObjectResult>((await new MobileController(context, new TestUserService(new User { Id = 2, OfficeId = 2 }))
            .UpdateItemStatus(reservation.Id, new() { Action = "deliver" })).Result);
    }

    private static MobileController Controller(ApplicationDbContext context) =>
        new(context, new TestUserService(new User { Id = 1, OfficeId = 1 }));

    private static T Value<T>(ActionResult<T> result) =>
        Assert.IsType<T>(Assert.IsType<OkObjectResult>(result.Result).Value);

    private static async Task<int[]> AvailableIds(ApplicationDbContext context, DateTime from, DateTime to) =>
        Value(await Controller(context).GetAvailableItems(new() { From = from, To = to }))
            .Select(item => item.Id).Order().ToArray();

    private static async Task<Reservation> AddVehicleReservation(ApplicationDbContext context)
    {
        var reservation = new Reservation
        {
            OfficeId = 1,
            ReservationItems =
            [
                new ReservationItem { OfficeId = 1, ItemId = 1, ItemTypeCode = "VEHICLE", BookedFrom = Start, BookedTo = Start.AddDays(1) },
                new ReservationItem { OfficeId = 1, ItemId = 8, ItemTypeCode = "ACCESSORY", BookedFrom = Start, BookedTo = Start.AddDays(1) },
                new ReservationItem { OfficeId = 1, ItemId = 9, ItemTypeCode = "LIFT", BookedFrom = Start, BookedTo = Start.AddDays(1) },
            ],
        };
        context.Reservations.Add(reservation);
        await context.SaveChangesAsync();
        return reservation;
    }

    private static async Task<ApplicationDbContext> Seed()
    {
        var context = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        AddItem(context, 1, "VEHICLE");
        AddItem(context, 2, "LIFT", new() { BookedFrom = Start, BookedTo = Start.AddDays(2) });
        AddItem(context, 3, "LIFT", new() { BookedFrom = Start.AddDays(-5), BookedTo = Start.AddDays(-1), ActualFrom = Start.AddDays(-5) });
        AddItem(context, 4, "CABIN", unavailable: true);
        AddItem(context, 5, "CABIN", active: false);
        AddItem(context, 6, "CABIN", office: 2);
        AddItem(context, 7, "CABIN", new()
        {
            BookedFrom = Start.AddDays(-5), BookedTo = Start.AddDays(-3),
            ActualFrom = Start.AddDays(-5), ActualTo = Start.AddDays(-3),
        });
        AddItem(context, 8, "ACCESSORY", office: 3);
        AddItem(context, 9, "LIFT", office: 3);
        await context.SaveChangesAsync();
        return context;
    }

    private static void AddItem(ApplicationDbContext context, int id, string type, ReservationItem? booking = null,
        int office = 1, bool active = true, bool unavailable = false)
    {
        var item = new Item
        {
            Id = id, OfficeId = office, ItemTypeCode = type, ItemNr = $"Item {id}", IsActive = active,
            UnavailableForReservation = unavailable,
            UnavailableFrom = unavailable ? Start : null,
            UnavailableTo = unavailable ? Start.AddDays(5) : null,
        };
        context.Items.Add(item);
        if (booking != null)
        {
            booking.OfficeId = office;
            booking.Item = item;
            booking.ItemTypeCode = type;
            context.Reservations.Add(new Reservation { OfficeId = office, ReservationItems = [booking] });
        }
    }

    private sealed class TestUserService(User? user) : ICurrentUserService
    {
        public Task<User?> GetCurrentUserAsync(ClaimsPrincipal? principal) => Task.FromResult(user);
    }
}
