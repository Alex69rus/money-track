using Microsoft.EntityFrameworkCore;
using MoneyTrack.Api.Data;
using MoneyTrack.Api.Services;

namespace MoneyTrack.Api.Endpoints;

public static class TagEndpoints
{
    public static void MapTagEndpoints(this WebApplication app)
    {
        var tags = app.MapGroup("/api/tags")
            .WithTags("Tags");

        tags.MapGet("/", GetUserTags)
            .WithName("GetUserTags")
            .WithSummary("Get distinct tags for current user")
            .WithDescription("Returns all unique tags used by the authenticated user, sorted alphabetically");
    }

    private static async Task<IResult> GetUserTags(
        MoneyTrackContext context,
        TelegramAuthService authService)
    {
        var userId = authService.GetUserIdFromInitData();

        // First get all transactions with tags, then process client-side
        var transactionsWithTags = await context.Transactions
            .Where(t => t.UserId == userId && t.Tags.Any())
            .Select(t => t.Tags)
            .ToListAsync();

        // Flatten the tags arrays and get distinct values
        var allTags = transactionsWithTags
            .SelectMany(tags => tags)
            .Distinct()
            .OrderBy(tag => tag)
            .ToList();

        return Results.Ok(allTags);
    }
}