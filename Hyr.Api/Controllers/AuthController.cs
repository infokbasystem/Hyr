using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Hyr.Api.Models;
using Hyr.Api.Services;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Hyr.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] Login login)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            var result = await _authService.LoginAsync(login);
            if (result == null)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }
            return Ok(result);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] Register register)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.RegisterAsync(register);
            if (result == null)
            {
                return BadRequest(new { message = "User with this email already exists" });
            }

            return Ok(result);
        }

        [HttpGet("verify")]
        [Authorize]
        public async Task<IActionResult> VerifyToken()
        {
            var authHeader = Request.Headers["Authorization"].ToString();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return Unauthorized(new { message = "Invalid token format" });
            }

            var token = authHeader.Substring("Bearer ".Length);
            var user = await _authService.GetUserByTokenAsync(token);

            if (user == null)
            {
                return Unauthorized(new { message = "Invalid token" });
            }
            var newToken = _authService.GenerateJwtToken(user);
            var result = new AuthResponse
            {
                Token = newToken,
                User = user,
            };
            return Ok(result);
        }

        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            var authHeader = Request.Headers["Authorization"].ToString();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return Unauthorized(new { message = "Invalid token format" });
            }

            var token = authHeader.Substring("Bearer ".Length);
            var user = await _authService.GetUserByTokenAsync(token);

            if (user == null)
            {
                return Unauthorized(new { message = "Invalid token" });
            }

            return Ok(user);
        }
    }
}
