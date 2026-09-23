using System.Security.Claims;
using Microsoft.Extensions.Options;
using Backend.Models;
using Backend.Services;

namespace Backend.Middleware
{
    /// <summary>
    /// Keeps an active session alive by issuing a refreshed JWT while the user keeps calling the API.
    /// </summary>
    public class SlidingSessionMiddleware
    {
        public const string RenewedTokenHeader = "X-Renewed-Token";

        private readonly RequestDelegate _next;

        public SlidingSessionMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public Task InvokeAsync(HttpContext context, IAuthService authService, IOptions<JwtSettings> jwtSettings)
        {
            if (context.User?.Identity?.IsAuthenticated == true)
            {
                context.Response.OnStarting(() =>
                {
                    TryAttachRenewedToken(context, authService, jwtSettings.Value);
                    return Task.CompletedTask;
                });
            }

            return _next(context);
        }

        private static void TryAttachRenewedToken(HttpContext context, IAuthService authService, JwtSettings jwtSettings)
        {
            var principal = context.User;

            var expiresAt = GetExpiration(principal);
            if (expiresAt == null)
            {
                return;
            }

            // Only renew in the second half of the token lifetime to avoid re-signing on every request.
            var renewalThreshold = TimeSpan.FromMinutes(jwtSettings.ExpirationMinutes / 2.0);
            if (expiresAt.Value - DateTime.UtcNow > renewalThreshold)
            {
                return;
            }

            var idClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out var userId))
            {
                return;
            }

            var user = new User
            {
                Id = userId,
                Name = principal.FindFirst(ClaimTypes.Name)?.Value ?? string.Empty,
                Email = principal.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty,
                Role = principal.FindFirst(ClaimTypes.Role)?.Value ?? "User"
            };

            context.Response.Headers[RenewedTokenHeader] = authService.GenerateJwtToken(user);
        }

        private static DateTime? GetExpiration(ClaimsPrincipal principal)
        {
            var expClaim = principal.FindFirst("exp")?.Value;
            if (!long.TryParse(expClaim, out var expSeconds))
            {
                return null;
            }

            return DateTimeOffset.FromUnixTimeSeconds(expSeconds).UtcDateTime;
        }
    }
}
