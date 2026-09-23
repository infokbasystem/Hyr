using System.Security.Claims;

using Backend.Models;

namespace Backend.Services
{
    public interface ICurrentUserService
    {
        Task<User?> GetCurrentUserAsync(ClaimsPrincipal? principal);
    }
}