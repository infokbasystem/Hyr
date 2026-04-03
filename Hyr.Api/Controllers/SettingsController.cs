using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Hyr.Api.Data;
using Hyr.Api.Models;
using Hyr.Api.Filters;

using Fortnox.SDK;
using Fortnox.SDK.Auth;
using Fortnox.SDK.Authorization;
using Fortnox.SDK.Extensions;
using Fortnox.SDK.Search;
using System.Diagnostics;

namespace Hyr.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]

    public class SettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SettingsController(ApplicationDbContext context)
        {
            _context = context;
        }


        [HttpPost("fortnoxactivate")]
        [Authorize]
        public async Task<IActionResult> FortnoxActivate([FromBody] FortnoxActivateRequest request)
        {
            // var path = Request.Path;
            // var segments = path.Value?.Split('/', StringSplitOptions.RemoveEmptyEntries);
            // var newPath = segments != null ? "/" + string.Join("/", segments.Skip(1)) : "/";
            // var redirectUrl = Request.Scheme + "://" + Request.Host + newPath;
            try
            {
                if (string.IsNullOrEmpty(request.Code) || string.IsNullOrEmpty(request.State))
                {
                    return BadRequest(new { message = "Missing code or state" });
                }
                var office = _context.Offices.Find(3);
                if (office == null)
                {
                    return BadRequest("No Fortnox settings found");
                }
                var clientId = "lbiXtlx8rx0I";
                var clientSecret = "fX3OelQ883";
                var fortnoxAuthClient = new Fortnox.SDK.FortnoxAuthClient();
                var authWorkflow = fortnoxAuthClient.StandardAuthWorkflow;
                var token = await authWorkflow.GetTokenAsync(request.Code, clientId, clientSecret, request.RedirectUrl);

                office.FortnoxAccessToken = token.AccessToken;
                office.FortnoxRefreshToken = token.RefreshToken;
                office.FortnoxTokenCreated = DateTime.UtcNow;
                office.FortnoxTokenExpiresInSeconds = token.ExpiresIn;
                _context.SaveChanges();

                return Ok(new
                {
                    message = "Kopplingen aktiverades!",
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message + ". " + request.RedirectUrl });
            }
        }


    }
}
