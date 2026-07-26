using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Hyr.Api.Data;
using Hyr.Api.Models;

namespace Hyr.Api.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IPasswordHasher _passwordHasher;
        private readonly JwtSettings _jwtSettings;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            ApplicationDbContext context,
            IPasswordHasher passwordHasher,
            IOptions<JwtSettings> jwtSettings,
            ILogger<AuthService> logger)
        {
            _context = context;
            _passwordHasher = passwordHasher;
            _jwtSettings = jwtSettings.Value;
            _logger = logger;
        }

        public async Task<AuthResponse?> LoginAsync(Login login)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == login.Email);

            if (user == null)
            {
                return null;
            }

            var isPasswordValid = _passwordHasher.VerifyPassword(login.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                var computedHash = _passwordHasher.HashPassword(login.Password);
                _logger.LogWarning(
                    "Login failed due to password mismatch for user {Email}. Computed hash: {ComputedHash}. Stored hash: {StoredHash}.",
                    login.Email,
                    computedHash,
                    user.PasswordHash);
                return null;
            }

            var token = GenerateJwtToken(user);
            return new AuthResponse
            {
                Token = token,
                User = new User
                {
                    Id = user.Id,
                    Role = user.Role,
                    Name = user.Name,
                    Email = user.Email
                }
            };
        }

        public async Task<AuthResponse?> RegisterAsync(Register register)
        {
            if (await _context.Users.AnyAsync(u => u.Email == register.Email))
            {
                return null;
            }

            var user = new User
            {
                Name = register.Name,
                Email = register.Email,
                PasswordHash = _passwordHasher.HashPassword(register.Password),
                Role = "User"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);
            return new AuthResponse
            {
                Token = token,
                User = new User
                {
                    Id = user.Id,
                    Role = user.Role,
                    Name = user.Name,
                    Email = user.Email
                }
            };
        }
        public async Task<User?> GetUserByTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_jwtSettings.Key);

                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = _jwtSettings.Issuer,
                    ValidAudience = _jwtSettings.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(key)
                };

                var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
                var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier);

                if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var userId))
                {
                    var user = await _context.Users.FindAsync(userId);
                    if (user != null)
                    {
                        return new User
                        {
                            Id = user.Id,
                            Role = user.Role,
                            Name = user.Name,
                            Email = user.Email
                        };
                    }
                }
            }
            catch
            {
                // Token validation failed
            }

            return null;
        }

        public string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_jwtSettings.Key);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Name, user.Name),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role)
                }),
                Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationMinutes),
                Issuer = _jwtSettings.Issuer,
                Audience = _jwtSettings.Audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
