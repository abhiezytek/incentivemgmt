using Incentive.Application.Abstractions.Repositories;
using Incentive.Application.Interfaces;
using Incentive.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Incentive.Api.Controllers;

/// <summary>
/// Authentication endpoints for user login and profile.
/// Matches the Node.js auth pattern: POST /api/auth/login, GET /api/auth/me.
/// </summary>
[ApiController]
[Route("api/auth")]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IUserAuthRepository _userAuthRepo;
    private readonly IJwtTokenService _jwtService;
    private readonly ICurrentUserService _currentUser;

    public AuthController(
        IUserAuthRepository userAuthRepo,
        IJwtTokenService jwtService,
        ICurrentUserService currentUser)
    {
        _userAuthRepo = userAuthRepo;
        _jwtService = jwtService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Authenticates a user with email and password, returns a JWT.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] Dictionary<string, object?> body)
    {
        var email = body.GetValueOrDefault("email")?.ToString();
        var password = body.GetValueOrDefault("password")?.ToString();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return BadRequest(new { error = "VAL_001", message = "email and password are required" });
        }

        var user = await _userAuthRepo.GetByEmailAsync(email);
        if (user == null)
        {
            return Unauthorized(new { error = "AUTH_010", message = "Invalid email or password" });
        }

        if (!user.IsActive)
        {
            return Unauthorized(new { error = "AUTH_011", message = "Account is deactivated" });
        }

        // Verify password using bcrypt (matching Node.js bcryptjs behavior)
        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            return Unauthorized(new { error = "AUTH_010", message = "Invalid email or password" });
        }

        var token = _jwtService.GenerateUserToken(user.Id, user.Email, user.Name, user.Role, user.ChannelId);
        var expiresAt = DateTime.UtcNow.AddHours(_jwtService.GetExpiryHours()).ToString("o");

        return Ok(new
        {
            token,
            expires_at = expiresAt,
            user = new
            {
                id = user.Id,
                name = user.Name,
                email = user.Email,
                role = user.Role,
                channel_id = user.ChannelId
            }
        });
    }

    /// <summary>
    /// Returns the currently authenticated user's profile.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMe()
    {
        if (_currentUser.UserId == null)
        {
            return Unauthorized(new { error = "AUTH_012", message = "Not authenticated" });
        }

        var user = await _userAuthRepo.GetByIdAsync(_currentUser.UserId.Value);
        if (user == null)
        {
            return NotFound(new { error = "AUTH_013", message = "User not found" });
        }

        return Ok(new
        {
            id = user.Id,
            name = user.Name,
            email = user.Email,
            role = user.Role,
            channel_id = user.ChannelId,
            is_active = user.IsActive
        });
    }
}
