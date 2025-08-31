using System.Net;
using MoneyTrack.Api.Exceptions;

namespace MoneyTrack.Api.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        switch (exception)
        {
            case UnauthorizedException unauthorizedException:
                _logger.LogWarning(unauthorizedException, "Unauthorized access attempt");
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new
                {
                    error = "Unauthorized",
                    message = unauthorizedException.Message
                }));
                break;

            default:
                _logger.LogError(exception, "Unhandled exception occurred");
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new
                {
                    error = "Internal Server Error",
                    message = "An unexpected error occurred"
                }));
                break;
        }
    }
}