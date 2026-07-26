using System.Security.Claims;

using Hyr.Api.Models;

namespace Hyr.Api.Services
{
    public interface ICurrentUserService
    {
        Task<User?> GetCurrentUserAsync(ClaimsPrincipal? principal);
    }
}