using System.Net;
using System.Security.Claims;
using Backend.Controllers;
using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace Backend.Tests;

public class PlacementLocationTests
{
    [Fact]
    public async Task ReservationSavesAndReturnsPlacementLocationAndCanClearIt()
    {
        using var context = CreateContext();
        var controller = new ReservationController(context, new TestUserService());

        var saved = await controller.PostReservation(new()
        {
            PlacementStreet = "  Storgatan 1 ",
            PlacementZipCode = "972 31",
            PlacementCity = "Luleå",
            PlacementLatitude = 65.584819m,
            PlacementLongitude = 22.156703123m,
        });
        var id = Assert.IsType<int>(Assert.IsType<OkObjectResult>(saved.Result).Value);

        context.ChangeTracker.Clear();
        var read = Assert.IsType<Reservation>(Assert.IsType<OkObjectResult>((await controller.GetReservation(id)).Result).Value);
        Assert.Equal("Storgatan 1", read.PlacementStreet);
        Assert.Equal("972 31", read.PlacementZipCode);
        Assert.Equal("Luleå", read.PlacementCity);
        Assert.Equal(65.584819m, read.PlacementLatitude);
        Assert.Equal(22.156703m, read.PlacementLongitude);

        Assert.IsType<OkObjectResult>((await controller.PostReservation(new() { Id = id })).Result);
        context.ChangeTracker.Clear();
        var cleared = Assert.IsType<Reservation>(Assert.IsType<OkObjectResult>((await controller.GetReservation(id)).Result).Value);
        Assert.Null(cleared.PlacementLatitude);
        Assert.Null(cleared.PlacementLongitude);
        Assert.Equal(string.Empty, cleared.PlacementStreet);
    }

    [Theory]
    [InlineData(65.5, null)]
    [InlineData(null, 22.1)]
    [InlineData(90.1, 22.1)]
    [InlineData(-90.1, 22.1)]
    [InlineData(65.5, 180.1)]
    [InlineData(65.5, -180.1)]
    public async Task ReservationRejectsIncompleteOrOutOfRangeCoordinates(double? latitude, double? longitude)
    {
        using var context = CreateContext();

        var result = await new ReservationController(context, new TestUserService()).PostReservation(new()
        {
            PlacementLatitude = (decimal?)latitude,
            PlacementLongitude = (decimal?)longitude,
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(await context.Reservations.ToListAsync());
    }

    [Fact]
    public async Task GeocodingSendsStructuredQueryParsesResultsAndCachesRepeatedSearches()
    {
        var handler = new StubHandler(_ => Json("""
            [
              { "lat": "65.584819", "lon": "22.156703", "display_name": "Storgatan 1, Luleå, Sverige",
                "address": { "road": "Storgatan", "house_number": "1", "postcode": "972 31", "town": "Luleå" } },
              { "lat": "bad", "lon": "22.1", "display_name": "ignored" }
            ]
            """));
        var service = CreateGeocoder(handler);
        var query = new GeocodingQuery("Storgatan 1", "972 31", "Luleå", null);

        var first = await service.SearchAsync(query);
        var second = await service.SearchAsync(query);

        var result = Assert.Single(first);
        Assert.Same(first, second);
        Assert.Equal(1, handler.Calls);
        Assert.Equal(new GeocodingResult("Storgatan 1, Luleå, Sverige", 65.584819m, 22.156703m, "Storgatan 1", "972 31", "Luleå"), result);
        var url = handler.LastRequest!.RequestUri!.AbsoluteUri;
        Assert.Contains("street=Storgatan%201", url);
        Assert.Contains("postalcode=972%2031", url);
        Assert.Contains("city=Lule%C3%A5", url);
        Assert.Contains("countrycodes=se", url);
        Assert.Contains("Hyr-Test", handler.LastRequest.Headers.UserAgent.ToString());
    }

    [Fact]
    public async Task GeocodingWithoutAnyAddressDoesNotCallTheProvider()
    {
        var handler = new StubHandler(_ => Json("[]"));

        var results = await CreateGeocoder(handler).SearchAsync(new GeocodingQuery(" ", null, "", null));

        Assert.Empty(results);
        Assert.Equal(0, handler.Calls);
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests, "[]")]
    [InlineData(HttpStatusCode.OK, "not json")]
    public async Task GeocodingReportsUpstreamFailuresAndDoesNotCacheThem(HttpStatusCode status, string body)
    {
        var handler = new StubHandler(_ => new HttpResponseMessage(status) { Content = new StringContent(body) });
        var service = CreateGeocoder(handler);
        var query = new GeocodingQuery(null, null, "Luleå", null);

        await Assert.ThrowsAsync<GeocodingUnavailableException>(() => service.SearchAsync(query));
        await Assert.ThrowsAsync<GeocodingUnavailableException>(() => service.SearchAsync(query));
        Assert.Equal(2, handler.Calls);
    }

    [Fact]
    public async Task GeocodingEndpointValidatesInputAndMapsProviderFailuresTo502()
    {
        var empty = await new GeocodingController(new FakeGeocoder(_ => []))
            .Search(" ", null, "", null);
        Assert.IsType<BadRequestObjectResult>(empty.Result);

        var failed = await new GeocodingController(new FakeGeocoder(_ => throw new GeocodingUnavailableException("nere")))
            .Search("Storgatan 1", null, null, null);
        Assert.Equal(StatusCodes.Status502BadGateway, Assert.IsType<ObjectResult>(failed.Result).StatusCode);

        var ok = await new GeocodingController(new FakeGeocoder(_ => [new("x", 1m, 2m, "", "", "")]))
            .Search(null, null, null, "Luleå");
        Assert.Single(Assert.IsAssignableFrom<IReadOnlyList<GeocodingResult>>(Assert.IsType<OkObjectResult>(ok.Result).Value));
    }

    private static HttpResponseMessage Json(string body) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json"),
    };

    private static NominatimGeocodingService CreateGeocoder(StubHandler handler) => new(
        new StubHttpClientFactory(handler),
        new MemoryCache(new MemoryCacheOptions()),
        Options.Create(new GeocodingSettings { UserAgent = "Hyr-Test/1.0", MinRequestIntervalMilliseconds = 0 }),
        NullLogger<NominatimGeocodingService>.Instance);

    private static ApplicationDbContext CreateContext() => new(new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private sealed class TestUserService : ICurrentUserService
    {
        public Task<User?> GetCurrentUserAsync(ClaimsPrincipal? principal) => Task.FromResult<User?>(new User { Id = 1, OfficeId = 1 });
    }

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            LastRequest = request;
            return Task.FromResult(respond(request));
        }
    }

    private sealed class StubHttpClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }

    private sealed class FakeGeocoder(Func<GeocodingQuery, IReadOnlyList<GeocodingResult>> search) : IGeocodingService
    {
        public Task<IReadOnlyList<GeocodingResult>> SearchAsync(GeocodingQuery query, CancellationToken cancellationToken = default) =>
            Task.FromResult(search(query));
    }
}
