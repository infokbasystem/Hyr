using Hyr.Api.Models;

namespace Hyr.Api.Services
{
    public interface IAuthService
    {
        Task<AuthResponse?> LoginAsync(Login loginDto);
        Task<AuthResponse?> RegisterAsync(Register register);
        Task<User?> GetUserByTokenAsync(string token);
        string GenerateJwtToken(User user);
    }
}