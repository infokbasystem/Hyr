using System.Security.Claims;
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

public class MailTextControllerTests
{
    [Fact]
    public async Task ItemFilterMatchesExactCaseInsensitiveItemInCurrentOffice()
    {
        using var context = CreateContext();
        context.MailTexts.AddRange(
            new MailText { Id = 1, OfficeId = 1, Item = "iNvOiCe", Subject = "Local invoice" },
            new MailText { Id = 2, OfficeId = 1, Item = "INVOICEREMINDER", Subject = "Reminder" },
            new MailText { Id = 3, OfficeId = 2, Item = "INVOICE", Subject = "Other office" });
        await context.SaveChangesAsync();

        var result = await Controller(context).GetMailTexts(new MailTextFilter { Item = "  invoice  " });

        var page = GetPage(result);
        Assert.Equal(1, page.TotalRecords);
        var mailText = Assert.Single(page.Data);
        Assert.Equal(1, mailText.Id);
        Assert.Equal(1, mailText.OfficeId);
        Assert.Equal("Local invoice", mailText.Subject);
    }

    [Fact]
    public async Task ItemLookupCreatesRequiredTemplatesAndReturnsEmptyForUnknownItems()
    {
        using var context = CreateContext();
        var controller = Controller(context);

        var reservation = GetPage(await controller.GetMailTexts(new MailTextFilter { Item = "reservation" }));
        var invoice = GetPage(await controller.GetMailTexts(new MailTextFilter { Item = "invoice" }));
        var unknown = GetPage(await controller.GetMailTexts(new MailTextFilter { Item = "unknown" }));

        Assert.Equal("RESERVATION", Assert.Single(reservation.Data).Item);
        Assert.Equal("INVOICE", Assert.Single(invoice.Data).Item);
        Assert.All(await context.MailTexts.ToListAsync(), row => Assert.Equal(1, row.OfficeId));
        Assert.Equal(0, unknown.TotalRecords);
        Assert.Empty(unknown.Data);
    }

    [Fact]
    public async Task SearchTermStillFindsBothInvoiceAndReminderWithoutItemFilter()
    {
        using var context = CreateContext();
        var page = GetPage(await Controller(context).GetMailTexts(new MailTextFilter { SearchTerm = "invoice" }));

        Assert.Equal(2, page.TotalRecords);
        Assert.Equal(new[] { "INVOICE", "INVOICEREMINDER" }, page.Data.Select(row => row.Item));
    }

    [Fact]
    public async Task ItemLookupRejectsUserWithoutOffice()
    {
        using var context = CreateContext();
        var controller = new MailTextController(context, new TestUserService(new User { Id = 1 }));

        var result = await controller.GetMailTexts(new MailTextFilter { Item = "INVOICE" });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
        Assert.Empty(await context.MailTexts.ToListAsync());
    }

    private static PagedResult<MailTextDto> GetPage(ActionResult<PagedResult<MailTextDto>> result) =>
        Assert.IsType<PagedResult<MailTextDto>>(Assert.IsType<OkObjectResult>(result.Result).Value);

    private static MailTextController Controller(ApplicationDbContext context) =>
        new(context, new TestUserService(new User { Id = 1, OfficeId = 1 }));

    private static ApplicationDbContext CreateContext() => new(new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private sealed class TestUserService(User? user) : ICurrentUserService
    {
        public Task<User?> GetCurrentUserAsync(ClaimsPrincipal? principal) => Task.FromResult(user);
    }
}
