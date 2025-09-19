using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Web;
using MoneyTrack.Api.Exceptions;

namespace MoneyTrack.Api.Services;

public class TelegramAuthService
{
    private readonly string _botToken;
    private readonly ILogger<TelegramAuthService> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IWebHostEnvironment _environment;

    public TelegramAuthService(IConfiguration configuration, ILogger<TelegramAuthService> logger, IHttpContextAccessor httpContextAccessor, IWebHostEnvironment environment)
    {
        _botToken = configuration["Telegram:BotToken"] ?? throw new InvalidOperationException("Telegram bot token not configured");
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
        _environment = environment;
    }

    public long GetUserIdFromInitData()
    {
        // Skip authentication in Development mode
        if (_environment.IsDevelopment())
        {
            _logger.LogInformation("Development mode: Skipping Telegram authentication, using test user ID");
            return 123456789; // Test user ID for development
        }

        var httpContext = _httpContextAccessor.HttpContext ?? throw new InvalidOperationException("HttpContext is not available");
        var initData = httpContext.Request.Headers["X-Telegram-Init-Data"].FirstOrDefault();

        if (string.IsNullOrEmpty(initData))
        {
            _logger.LogWarning("No Telegram init data found in request headers");
            throw new UnauthorizedException("Missing Telegram authentication data");
        }

        if (!ValidateInitData(initData))
        {
            throw new UnauthorizedException("Invalid Telegram authentication data");
        }

        var userId = ExtractUserIdFromInitData(initData);
        if (!userId.HasValue)
        {
            _logger.LogWarning("Could not extract user ID from Telegram init data");
            throw new UnauthorizedException("Invalid user data in Telegram authentication");
        }

        return userId.Value;
    }

    private bool ValidateInitData(string initData)
    {
        try
        {
            var parameters = HttpUtility.ParseQueryString(initData);
            var hash = parameters["hash"];
            
            if (string.IsNullOrEmpty(hash))
            {
                _logger.LogWarning("No hash found in Telegram init data");
                return false;
            }

            // Remove hash from parameters for validation
            parameters.Remove("hash");

            // Create data check string
            var dataCheckString = string.Join('\n', 
                parameters.AllKeys
                    .OrderBy(key => key)
                    .Select(key => $"{key}={parameters[key]}"));

            // Create secret key
            var secretKey = HMACSHA256.HashData(Encoding.UTF8.GetBytes("WebAppData"), Encoding.UTF8.GetBytes(_botToken));

            // Calculate expected hash
            var expectedHashBytes = HMACSHA256.HashData(secretKey, Encoding.UTF8.GetBytes(dataCheckString));
            var expectedHash = Convert.ToHexString(expectedHashBytes).ToLowerInvariant();

            var isValid = hash.Equals(expectedHash, StringComparison.OrdinalIgnoreCase);
            
            if (!isValid)
            {
                _logger.LogWarning("Telegram init data validation failed");
            }
            else
            {
                _logger.LogInformation("Telegram init data validated successfully");
            }

            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating Telegram init data");
            return false;
        }
    }

    private long? ExtractUserIdFromInitData(string initData)
    {
        try
        {
            var parameters = HttpUtility.ParseQueryString(initData);
            var userJson = parameters["user"];
            
            if (string.IsNullOrEmpty(userJson))
                return null;

            using var jsonDoc = JsonDocument.Parse(userJson);
            if (jsonDoc.RootElement.TryGetProperty("id", out var idProperty))
            {
                return idProperty.GetInt64();
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting user ID from Telegram init data");
            return null;
        }
    }
}