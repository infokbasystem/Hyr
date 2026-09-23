using System.Security.Claims;

using Microsoft.EntityFrameworkCore;

using Backend.Data;
using Backend.Models;

namespace Backend.Services
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly ApplicationDbContext _context;

        public CurrentUserService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetCurrentUserAsync(ClaimsPrincipal? principal)
        {
            var userIdClaim = principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                             ?? principal?.FindFirst("sub")?.Value
                             ?? principal?.FindFirst("id")?.Value;

            if (!int.TryParse(userIdClaim, out var userId))
            {
                return null;
            }

            return await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        }
    }
}