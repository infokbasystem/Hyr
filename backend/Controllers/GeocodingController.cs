using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using Backend.Services;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/geocoding")]
    [Authorize]
    public class GeocodingController : ControllerBase
    {
        private const int MaxFieldLength = 200;

        private readonly IGeocodingService _geocodingService;

        public GeocodingController(IGeocodingService geocodingService)
        {
            _geocodingService = geocodingService;
        }

        /// <summary>Searches for addresses either by structured fields (street, zip, city) or by free text.</summary>
        [HttpGet("search")]
        public async Task<ActionResult<IReadOnlyList<GeocodingResult>>> Search(
            [FromQuery] string? street,
            [FromQuery] string? zipCode,
            [FromQuery] string? city,
            [FromQuery] string? q,
            CancellationToken cancellationToken = default)
        {
            if (new[] { street, zipCode, city, q }.Any(value => value?.Length > MaxFieldLength))
            {
                return BadRequest(new { message = "Sökningen är för lång." });
            }

            if (string.IsNullOrWhiteSpace(street) && string.IsNullOrWhiteSpace(zipCode)
                && string.IsNullOrWhiteSpace(city) && string.IsNullOrWhiteSpace(q))
            {
                return BadRequest(new { message = "Ange en adress att söka efter." });
            }

            try
            {
                var results = await _geocodingService.SearchAsync(new GeocodingQuery(street, zipCode, city, q), cancellationToken);
                return Ok(results);
            }
            catch (GeocodingUnavailableException ex)
            {
                return StatusCode(StatusCodes.Status502BadGateway, new { message = ex.Message });
            }
        }
    }
}
