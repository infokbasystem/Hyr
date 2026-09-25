using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Backend.Data;
using Backend.Models;
using Backend.Filters;
using Backend.Services;
using Backend.Utils.Fortnox;

using Fortnox.SDK;
using Fortnox.SDK.Auth;
using Fortnox.SDK.Authorization;
using Fortnox.SDK.Extensions;
using Fortnox.SDK.Search;
using System.Diagnostics;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]

    public class SettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public SettingsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
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
                var currentUser = await _currentUserService.GetCurrentUserAsync(User);
                if (currentUser?.OfficeId == null)
                {
                    return BadRequest("No Fortnox settings found");
                }
                var office = await _context.Offices.FirstOrDefaultAsync(o => o.Id == currentUser.OfficeId.Value);
                if (office == null)
                {
                    return BadRequest("No Fortnox settings found");
                }
                var fortnoxAuthClient = new Fortnox.SDK.FortnoxAuthClient();
                var authWorkflow = fortnoxAuthClient.StandardAuthWorkflow;
                var token = await authWorkflow.GetTokenAsync(request.Code, FortnoxAppCredentials.ClientId, FortnoxAppCredentials.ClientSecret, request.RedirectUrl);

                office.FortnoxAccessToken = token.AccessToken;
                office.FortnoxRefreshToken = token.RefreshToken;
                office.FortnoxTokenCreated = DateTime.UtcNow;
                office.FortnoxTokenExpiresInSeconds = token.ExpiresIn;
                office.UseFortnox = true;
                await _context.SaveChangesAsync();

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
