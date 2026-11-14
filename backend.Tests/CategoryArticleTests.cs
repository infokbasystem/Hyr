using System.Security.Claims;
using System.Text.Json;
using System.Globalization;
using Backend.Controllers;
using Backend.Data;
using Backend.Dtos;
using Backend.Filters;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Backend.Tests;

public class CategoryArticleTests
{
    [Fact]
    public async Task ArticleCanBelongToMultipleCategoriesAndLinksCanBeReplaced()
    {
        using var context = CreateContext();
        context.Articles.AddRange(
            new Article { Id = 1, OfficeId = 1 },
            new Article { Id = 2, OfficeId = 1 });
        await context.SaveChangesAsync();
        var controller = new ItemCategoryController(context, new TestUserService());

        var first = SavedCategory(await controller.PostItemCategory(new() { Name = "First", ArticleIds = [1, 1] }));
        var second = SavedCategory(await controller.PostItemCategory(new() { Name = "Second", ArticleIds = [1] }));
        Assert.Equal(new[] { 1 }, first.ArticleIds);
        Assert.Equal(2, await context.CategoryArticles.CountAsync(link => link.ArticleId == 1));

        var updated = SavedCategory(await controller.PostItemCategory(new() { Id = first.Id, Name = "Updated", ArticleIds = [2] }));
        Assert.Equal(new[] { 2 }, updated.ArticleIds);
        context.ChangeTracker.Clear();
        var read = SavedCategory(await controller.GetItemCategory(first.Id));
        Assert.Equal(new[] { 2 }, read.ArticleIds);
        Assert.Equal(new[] { 1 }, SavedCategory(await controller.GetItemCategory(second.Id)).ArticleIds);

        await controller.PostItemCategory(new() { Id = first.Id, Name = "Renamed" });
        Assert.Equal(1, await context.CategoryArticles.CountAsync(link => link.ItemCategoryId == first.Id));
        await controller.PostItemCategory(new() { Id = first.Id, ArticleIds = [] });
        Assert.False(await context.CategoryArticles.AnyAsync(link => link.ItemCategoryId == first.Id));
    }

    [Fact]
    public async Task QuantitiesCanBeSavedReadAndUpdatedWithoutLegacySavesResettingThem()
    {
        using var context = CreateContext();
        context.Articles.AddRange(
            new Article { Id = 1, OfficeId = 1 },
            new Article { Id = 2, OfficeId = 1 });
        await context.SaveChangesAsync();
        var controller = new ItemCategoryController(context, new TestUserService());

        var saved = SavedCategory(await controller.PostItemCategory(new()
        {
            Name = "Category",
            Articles = [new() { ArticleId = 1, Quantity = 1.23456m }],
        }));
        context.ChangeTracker.Clear();
        var read = SavedCategory(await controller.GetItemCategory(saved.Id));
        Assert.Equal(1.23456m, Assert.Single(read.Articles).Quantity);
        var list = Assert.IsType<PagedResult<ItemCategoryDto>>(
            Assert.IsType<OkObjectResult>((await controller.GetItemCategories(new())).Result).Value);
        Assert.Equal(read.Articles, Assert.Single(list.Data).Articles);

        await controller.PostItemCategory(new() { Id = saved.Id, Name = "Renamed" });
        var legacySave = SavedCategory(await controller.PostItemCategory(new() { Id = saved.Id, ArticleIds = [1, 2] }));
        Assert.Equal(1.23456m, legacySave.Articles.Single(article => article.ArticleId == 1).Quantity);
        Assert.Equal(1m, legacySave.Articles.Single(article => article.ArticleId == 2).Quantity);

        var updated = SavedCategory(await controller.PostItemCategory(new()
        {
            Id = saved.Id,
            Articles = [new() { ArticleId = 1, Quantity = 3m }],
        }));
        Assert.Equal(3m, Assert.Single(updated.Articles).Quantity);
        await controller.PostItemCategory(new() { Id = saved.Id, Articles = [] });
        Assert.Empty(await context.CategoryArticles.ToListAsync());
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("0.000001")]
    [InlineData("10000000000000")]
    public async Task InvalidQuantitiesAreRejectedWithoutChangingStoredValues(string quantity)
    {
        using var context = CreateContext();
        SeedCategory(context);
        await context.SaveChangesAsync();

        var result = await new ItemCategoryController(context, new TestUserService()).PostItemCategory(new()
        {
            Id = 1,
            Name = "Changed",
            Articles = [new() { ArticleId = 1, Quantity = decimal.Parse(quantity, CultureInfo.InvariantCulture) }],
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        context.ChangeTracker.Clear();
        Assert.Equal(1.5m, (await context.CategoryArticles.SingleAsync(link => link.ArticleId == 1)).Quantity);
        Assert.NotEqual("Changed", (await context.ItemCategories.SingleAsync()).Name);
    }

    [Fact]
    public async Task DuplicateArticleQuantityRowsAreRejected()
    {
        using var context = CreateContext();
        SeedCategory(context);
        await context.SaveChangesAsync();

        var result = await new ItemCategoryController(context, new TestUserService()).PostItemCategory(new()
        {
            Id = 1,
            Articles = [new() { ArticleId = 1, Quantity = 2m }, new() { ArticleId = 1, Quantity = 3m }],
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(1.5m, (await context.CategoryArticles.SingleAsync(link => link.ArticleId == 1)).Quantity);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(2)]
    [InlineData(99)]
    public async Task InvalidOrOtherOfficeArticlesAreRejectedWithoutChangingCategory(int articleId)
    {
        using var context = CreateContext();
        context.Articles.Add(new Article { Id = 2, OfficeId = 2 });
        context.ItemCategories.Add(new ItemCategory { Id = 1, OfficeId = 1, Name = "Original" });
        await context.SaveChangesAsync();

        var result = await new ItemCategoryController(context, new TestUserService()).PostItemCategory(
            new() { Id = 1, Name = "Changed", Articles = [new() { ArticleId = articleId, Quantity = 2m }] });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        context.ChangeTracker.Clear();
        Assert.Equal("Original", (await context.ItemCategories.SingleAsync()).Name);
        Assert.Empty(await context.CategoryArticles.ToListAsync());
    }

    [Fact]
    public async Task FormOptionsAreOfficeScopedAndIncludePreviouslyLinkedInactiveArticles()
    {
        using var context = CreateContext();
        context.Articles.AddRange(
            new Article { Id = 1, OfficeId = 1, ArticleNr = "B", IsActive = true },
            new Article { Id = 2, OfficeId = 1, ArticleNr = "A", IsActive = false },
            new Article { Id = 3, OfficeId = 2, ArticleNr = "Foreign" });
        await context.SaveChangesAsync();

        var result = await new ItemCategoryController(context, new TestUserService()).GetFormOptions();
        var options = Assert.IsType<ItemCategoryFormOptionsDto>(Assert.IsType<OkObjectResult>(result.Result).Value);

        Assert.Equal(new[] { 2, 1 }, options.Articles.Select(article => article.Id));
        Assert.False(options.Articles[0].IsActive);
    }

    [Fact]
    public async Task NewReservationItemsCopyCategoryLinksAndExistingSnapshotsArePreserved()
    {
        using var context = CreateContext();
        SeedCategory(context);
        context.Items.Add(new Item { Id = 2, OfficeId = 1, ItemTypeCode = "TOOL" });
        await context.SaveChangesAsync();
        var controller = new ReservationController(context, new TestUserService());
        var request = new ReservationUpsertDto
        {
            ReservationItems =
            [
                new() { ItemId = 1, ItemTypeCode = "TOOL" },
                new() { ItemId = 2, ItemTypeCode = "TOOL" },
            ],
        };

        var saved = await controller.PostReservation(request);
        var reservationId = Assert.IsType<int>(Assert.IsType<OkObjectResult>(saved.Result).Value);
        context.ChangeTracker.Clear();
        var read = Assert.IsType<Reservation>(Assert.IsType<OkObjectResult>((await controller.GetReservation(reservationId)).Result).Value);
        var originalItem = read.ReservationItems.Single(item => item.ItemId == 1);
        Assert.Equal(new[] { 1, 2 }, originalItem.ReservationItemArticles.Select(link => link.ArticleId));
        Assert.Equal(new[] { 1.5m, 2m }, originalItem.ReservationItemArticles.Select(link => link.Quantity));
        Assert.All(originalItem.ReservationItemArticles, link => Assert.True(link.Id > 0));
        Assert.Equal(15.12345m, originalItem.ReservationItemArticles.Single(link => link.ArticleId == 1).UnitPrice);
        Assert.Equal(0m, originalItem.ReservationItemArticles.Single(link => link.ArticleId == 2).UnitPrice);
        Assert.Empty(read.ReservationItems.Single(item => item.ItemId == 2).ReservationItemArticles);
        Assert.Contains("ReservationItemArticles", JsonSerializer.Serialize(read));
        (await context.Articles.SingleAsync(article => article.Id == 1)).Price = 999m;
        await context.SaveChangesAsync();

        await new ItemCategoryController(context, new TestUserService()).PostItemCategory(new()
        {
            Id = 1,
            Articles = [new() { ArticleId = 2, Quantity = 4.25m }],
        });
        request.Id = reservationId;
        request.ReservationItems = read.ReservationItems;
        request.ReservationItems.Add(new ReservationItem { ItemId = 1, ItemTypeCode = "TOOL" });
        Assert.IsType<OkObjectResult>((await controller.PostReservation(request)).Result);
        Assert.IsType<OkObjectResult>((await controller.PostReservation(new ReservationUpsertDto
        {
            Id = reservationId,
            ReservationItems = (await context.ReservationItems.Where(item => item.ReservationId == reservationId).ToListAsync()),
        })).Result);

        context.ChangeTracker.Clear();
        var links = await context.ReservationItemArticles.ToListAsync();
        Assert.Equal(3, links.Count);
        Assert.Equal(2, links.Count(link => link.ReservationItemId == originalItem.Id));
        Assert.Equal(2, links.Single(link => link.ReservationItemId != originalItem.Id).ArticleId);
        Assert.Equal(4.25m, links.Single(link => link.ReservationItemId != originalItem.Id).Quantity);
        Assert.Equal(1.5m, links.Single(link => link.ReservationItemId == originalItem.Id && link.ArticleId == 1).Quantity);
        Assert.Equal(2m, links.Single(link => link.ReservationItemId == originalItem.Id && link.ArticleId == 2).Quantity);
        var preserved = links.Single(link => link.ReservationItemId == originalItem.Id && link.ArticleId == 1);
        Assert.Equal(originalItem.ReservationItemArticles.Single(link => link.ArticleId == 1).Id, preserved.Id);
        Assert.Equal(15.12345m, preserved.UnitPrice);
    }

    [Fact]
    public async Task ReservationLinksProtectArticlesAndAreDeletedWithReservationItem()
    {
        using var context = CreateContext();
        SeedCategory(context);
        await context.SaveChangesAsync();
        var controller = new ReservationController(context, new TestUserService());
        var saved = await controller.PostReservation(new()
        {
            ReservationItems = [new() { ItemId = 1, ItemTypeCode = "TOOL" }],
        });
        var reservationId = Assert.IsType<int>(Assert.IsType<OkObjectResult>(saved.Result).Value);

        Assert.IsType<ConflictObjectResult>(await new ArticleController(context, new TestUserService()).DeleteArticle(1));
        Assert.IsType<OkObjectResult>((await controller.PostReservation(new() { Id = reservationId })).Result);
        Assert.Empty(await context.ReservationItemArticles.ToListAsync());
        Assert.Equal(2, await context.Articles.CountAsync());
        Assert.Equal(2, await context.CategoryArticles.CountAsync());
    }

    [Fact]
    public async Task NewReservationItemCannotCopyArticlesFromAnotherOfficesItem()
    {
        using var context = CreateContext();
        context.Items.Add(new Item { Id = 1, OfficeId = 2, ItemTypeCode = "TOOL" });
        await context.SaveChangesAsync();

        var result = await new ReservationController(context, new TestUserService()).PostReservation(new()
        {
            ReservationItems = [new() { ItemId = 1, ItemTypeCode = "TOOL" }],
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(await context.Reservations.ToListAsync());
        Assert.Empty(await context.ReservationItemArticles.ToListAsync());
    }

    [Fact]
    public async Task CabinArticleSelectionsAreSavedAndCanBeReplacedOrCleared()
    {
        using var context = CreateContext();
        SeedCategory(context);
        context.Items.Local.Single().ItemTypeCode = "CABIN";
        context.Articles.Add(new Article { Id = 3, OfficeId = 1, IsActive = true, Price = 35m });
        await context.SaveChangesAsync();
        var controller = new ReservationController(context, new TestUserService());
        var request = new ReservationUpsertDto
        {
            ReservationItems =
            [
                new()
                {
                    ItemId = 1,
                    ItemTypeCode = "CABIN",
                    ArticleSelections = [new() { ArticleId = 1, Quantity = 1.5m, UnitPrice = 7.5m }, new() { ArticleId = 3, Quantity = 1m }],
                },
            ],
        };
        request.Id = Assert.IsType<int>(Assert.IsType<OkObjectResult>((await controller.PostReservation(request)).Result).Value);
        context.ChangeTracker.Clear();
        var read = Assert.IsType<Reservation>(Assert.IsType<OkObjectResult>((await controller.GetReservation(request.Id)).Result).Value);
        var row = Assert.Single(read.ReservationItems);
        Assert.Equal(new[] { 1, 3 }, row.ReservationItemArticles.Select(article => article.ArticleId));
        Assert.Equal(1.5m, row.ReservationItemArticles.First().Quantity);
        Assert.Equal(7.5m, row.ReservationItemArticles.First().UnitPrice);
        var originalLink = row.ReservationItemArticles.Single(article => article.ArticleId == 3);
        Assert.Equal(35m, originalLink.UnitPrice);

        request.ReservationItems = read.ReservationItems;
        row.ArticleSelections = [new() { ArticleId = 3, Quantity = 2.12345m, UnitPrice = 0m }];
        context.ChangeTracker.Clear();
        Assert.IsType<OkObjectResult>((await controller.PostReservation(request)).Result);
        context.ChangeTracker.Clear();
        var link = Assert.Single(await context.ReservationItemArticles.ToListAsync());
        Assert.Equal(3, link.ArticleId);
        Assert.Equal(2.12345m, link.Quantity);
        Assert.Equal(originalLink.Id, link.Id);
        Assert.Equal(0m, link.UnitPrice);

        row.ArticleSelections = [];
        Assert.IsType<OkObjectResult>((await controller.PostReservation(request)).Result);
        context.ChangeTracker.Clear();
        Assert.Empty(await context.ReservationItemArticles.ToListAsync());
        Assert.Equal(2, await context.CategoryArticles.CountAsync());

        row.ArticleSelections = null;
        Assert.IsType<OkObjectResult>((await controller.PostReservation(request)).Result);
        context.ChangeTracker.Clear();
        Assert.Empty(await context.ReservationItemArticles.ToListAsync());
    }

    [Fact]
    public async Task EmptyCabinArticleSelectionDoesNotRestoreCategoryDefaultsOnFirstSave()
    {
        using var context = CreateContext();
        SeedCategory(context);
        context.Items.Local.Single().ItemTypeCode = "CABIN";
        await context.SaveChangesAsync();

        var result = await new ReservationController(context, new TestUserService()).PostReservation(new()
        {
            ReservationItems = [new() { ItemId = 1, ItemTypeCode = "CABIN", ArticleSelections = [] }],
        });

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Empty(await context.ReservationItemArticles.ToListAsync());
    }

    [Theory]
    [InlineData(0, "1", false)]
    [InlineData(999, "1", false)]
    [InlineData(3, "1", false)]
    [InlineData(1, "0", false)]
    [InlineData(1, "-1", false)]
    [InlineData(1, "0.000001", false)]
    [InlineData(1, "10000000000000", false)]
    [InlineData(1, "1", true)]
    public async Task InvalidCabinArticleSelectionsDoNotChangeSavedLinks(int articleId, string quantity, bool duplicate)
    {
        using var context = CreateContext();
        SeedCategory(context);
        context.Items.Local.Single().ItemTypeCode = "CABIN";
        context.Articles.Add(new Article { Id = 3, OfficeId = 2, IsActive = true });
        await context.SaveChangesAsync();
        var controller = new ReservationController(context, new TestUserService());
        var saved = await controller.PostReservation(new()
        {
            ReservationItems = [new() { ItemId = 1, ItemTypeCode = "CABIN" }],
        });
        var reservationId = Assert.IsType<int>(Assert.IsType<OkObjectResult>(saved.Result).Value);
        context.ChangeTracker.Clear();
        var read = Assert.IsType<Reservation>(Assert.IsType<OkObjectResult>((await controller.GetReservation(reservationId)).Result).Value);
        var row = Assert.Single(read.ReservationItems);
        row.ArticleSelections = [new() { ArticleId = articleId, Quantity = decimal.Parse(quantity, CultureInfo.InvariantCulture) }];
        if (duplicate)
        {
            row.ArticleSelections.Add(new() { ArticleId = articleId, Quantity = 1m });
        }
        context.ChangeTracker.Clear();

        var result = await controller.PostReservation(new() { Id = reservationId, ReservationItems = [row] });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        context.ChangeTracker.Clear();
        Assert.Equal(2, await context.ReservationItemArticles.CountAsync());
        Assert.Equal(1.5m, (await context.ReservationItemArticles.SingleAsync(article => article.ArticleId == 1)).Quantity);
    }

    [Theory]
    [InlineData("-1")]
    [InlineData("0.000001")]
    [InlineData("10000000000000")]
    public async Task InvalidArticleUnitPricesAreRejectedOnSave(string unitPrice)
    {
        using var context = CreateContext();
        SeedCategory(context);
        await context.SaveChangesAsync();
        var result = await new ReservationController(context, new TestUserService()).PostReservation(new()
        {
            ReservationItems =
            [
                new()
                {
                    ItemId = 1,
                    ItemTypeCode = "TOOL",
                    ArticleSelections = [new() { ArticleId = 1, UnitPrice = decimal.Parse(unitPrice, CultureInfo.InvariantCulture) }],
                },
            ],
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(await context.ReservationItemArticles.ToListAsync());
    }

    private static void SeedCategory(ApplicationDbContext context)
    {
        context.Articles.AddRange(
            new Article { Id = 1, OfficeId = 1, IsActive = true, Price = 15.12345m },
            new Article { Id = 2, OfficeId = 1, IsActive = false, Price = 0m });
        context.ItemCategories.Add(new ItemCategory
        {
            Id = 1,
            OfficeId = 1,
            CategoryArticles = [new() { ArticleId = 1, Quantity = 1.5m }, new() { ArticleId = 2, Quantity = 2m }],
        });
        context.Items.Add(new Item { Id = 1, OfficeId = 1, ItemCategoryId = 1, ItemTypeCode = "TOOL" });
    }

    private static ItemCategoryDto SavedCategory(ActionResult<ItemCategoryDto> result) =>
        Assert.IsType<ItemCategoryDto>(Assert.IsType<OkObjectResult>(result.Result).Value);

    private static ApplicationDbContext CreateContext() => new(new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private sealed class TestUserService : ICurrentUserService
    {
        public Task<User?> GetCurrentUserAsync(ClaimsPrincipal? principal) => Task.FromResult<User?>(new User { Id = 1, OfficeId = 1 });
    }
}
