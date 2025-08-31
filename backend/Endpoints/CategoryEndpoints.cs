using Microsoft.EntityFrameworkCore;
using MoneyTrack.Api.Data;

namespace MoneyTrack.Api.Endpoints;

public static class CategoryEndpoints
{
    public static void MapCategoryEndpoints(this WebApplication app)
    {
        var categories = app.MapGroup("/api/categories")
            .WithTags("Categories");

        categories.MapGet("/", GetCategories)
            .WithName("GetCategories")
            .WithSummary("Get all categories")
            .WithDescription("Retrieves all available transaction categories");
    }

    private static async Task<IResult> GetCategories(MoneyTrackContext context)
    {
        var categories = await context.Categories.OrderBy(c => c.Name).ToListAsync();
        return Results.Ok(categories);
    }
}