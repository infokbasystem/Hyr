using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private const string AdminRole = "Admin";

        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly IPasswordHasher _passwordHasher;

        public UsersController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService,
            IPasswordHasher passwordHasher)
        {
            _context = context;
            _currentUserService = currentUserService;
            _passwordHasher = passwordHasher;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] string? searchTerm = null)
        {
            var currentUser = await _currentUserService.GetCurrentUserAsync(User);
            if (!IsAdmin(currentUser))
            {
                return Forbid();
            }

            var query = _context.Users.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var normalizedSearch = searchTerm.Trim();
                query = query.Where(user => user.Name.Contains(normalizedSearch) || user.Email.Contains(normalizedSearch));
            }

            var users = await query
                .OrderBy(user => user.Name)
                .ThenBy(user => user.Email)
                .Select(user => new UserListItemDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Role = user.Role,
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetUser(int id)
        {
            var currentUser = await _currentUserService.GetCurrentUserAsync(User);
            if (!IsAdmin(currentUser))
            {
                return Forbid();
            }

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == id);

            if (user == null)
            {
                return NotFound(new { message = "Användaren hittades inte." });
            }

            return Ok(MapUser(user));
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] UserCreateDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var currentUser = await _currentUserService.GetCurrentUserAsync(User);
            if (!IsAdmin(currentUser))
            {
                return Forbid();
            }

            var normalizedEmail = request.Email.Trim();
            if (await _context.Users.AnyAsync(user => user.Email == normalizedEmail))
            {
                return BadRequest(new { message = "En användare med denna e-post finns redan." });
            }

            var user = new User
            {
                Name = request.Name.Trim(),
                Email = normalizedEmail,
                PasswordHash = _passwordHasher.HashPassword(request.Password),
                Role = NormalizeRole(request.Role),
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(MapUser(user));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UserUpdateDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var currentUser = await _currentUserService.GetCurrentUserAsync(User);
            if (!IsAdmin(currentUser))
            {
                return Forbid();
            }

            var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == id);
            if (user == null)
            {
                return NotFound(new { message = "Användaren hittades inte." });
            }

            var normalizedEmail = request.Email.Trim();
            var emailExists = await _context.Users.AnyAsync(item => item.Id != id && item.Email == normalizedEmail);
            if (emailExists)
            {
                return BadRequest(new { message = "En användare med denna e-post finns redan." });
            }

            user.Name = request.Name.Trim();
            user.Email = normalizedEmail;
            user.Role = NormalizeRole(request.Role);

            await _context.SaveChangesAsync();

            return Ok(MapUser(user));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var currentUser = await _currentUserService.GetCurrentUserAsync(User);
            if (!IsAdmin(currentUser))
            {
                return Forbid();
            }

            if (currentUser?.Id == id)
            {
                return BadRequest(new { message = "Du kan inte radera ditt eget konto." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == id);
            if (user == null)
            {
                return NotFound(new { message = "Användaren hittades inte." });
            }

            _context.Users.Remove(user);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest(new { message = "Användaren kan inte raderas eftersom den används i historik." });
            }

            return NoContent();
        }

        [HttpPost("me/password")]
        public async Task<IActionResult> ResetOwnPassword([FromBody] PasswordResetDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var currentUser = await _currentUserService.GetCurrentUserAsync(User);
            if (currentUser == null)
            {
                return Unauthorized(new { message = "Användaren kunde inte identifieras." });
            }

            currentUser.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Lösenordet har uppdaterats." });
        }

        [HttpPost("{id:int}/password")]
        public async Task<IActionResult> ResetPasswordForUser(int id, [FromBody] PasswordResetDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var currentUser = await _currentUserService.GetCurrentUserAsync(User);
            if (!IsAdmin(currentUser))
            {
                return Forbid();
            }

            var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == id);
            if (user == null)
            {
                return NotFound(new { message = "Användaren hittades inte." });
            }

            user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Lösenordet har uppdaterats." });
        }

        private static bool IsAdmin(User? user)
        {
            return user != null && string.Equals(user.Role, AdminRole, StringComparison.OrdinalIgnoreCase);
        }

        private static string NormalizeRole(string role)
        {
            return string.Equals(role?.Trim(), AdminRole, StringComparison.OrdinalIgnoreCase)
                ? AdminRole
                : "User";
        }

        private static UserListItemDto MapUser(User user)
        {
            return new UserListItemDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role,
            };
        }
    }
}