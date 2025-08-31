using Microsoft.EntityFrameworkCore;
using MoneyTrack.Api.Data;
using MoneyTrack.Api.Models;
using MoneyTrack.Api.Services;

namespace MoneyTrack.Api.Endpoints;

public static class TransactionEndpoints
{
    public static void MapTransactionEndpoints(this WebApplication app)
    {
        var transactions = app.MapGroup("/api/transactions")
            .WithTags("Transactions");

        transactions.MapGet("/", GetTransactions)
            .WithName("GetTransactions")
            .WithSummary("Get user's transactions with optional filters")
            .WithDescription("Retrieves transactions for the authenticated user with optional date range, amount, category and tag filters");

        transactions.MapPost("/", CreateTransaction)
            .WithName("CreateTransaction")
            .WithSummary("Create a new transaction")
            .WithDescription("Creates a new transaction for the authenticated user");

        transactions.MapPut("/{id}", UpdateTransaction)
            .WithName("UpdateTransaction")
            .WithSummary("Update an existing transaction")
            .WithDescription("Updates a transaction owned by the authenticated user");

        transactions.MapDelete("/{id}", DeleteTransaction)
            .WithName("DeleteTransaction")
            .WithSummary("Delete a transaction")
            .WithDescription("Deletes a transaction owned by the authenticated user");
    }

    private static async Task<IResult> GetTransactions(
        MoneyTrackContext context,
        TelegramAuthService authService,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        decimal? minAmount = null,
        decimal? maxAmount = null,
        int? categoryId = null,
        string? tags = null)
    {
        var userId = authService.GetUserIdFromInitData();

        var query = context.Transactions
            .Include(t => t.Category)
            .Include(t => t.User)
            .Where(t => t.UserId == userId);

        if (fromDate.HasValue)
            query = query.Where(t => t.TransactionDate >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(t => t.TransactionDate <= toDate.Value);

        if (minAmount.HasValue)
            query = query.Where(t => t.Amount >= minAmount.Value);

        if (maxAmount.HasValue)
            query = query.Where(t => t.Amount <= maxAmount.Value);

        if (categoryId.HasValue)
            query = query.Where(t => t.CategoryId == categoryId.Value);

        if (!string.IsNullOrEmpty(tags))
        {
            var tagList = tags.Split(',', StringSplitOptions.RemoveEmptyEntries);
            query = query.Where(t => t.Tags.Any(tag => tagList.Contains(tag)));
        }

        var transactions = await query
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync();

        return Results.Ok(transactions);
    }

    private static async Task<IResult> CreateTransaction(
        MoneyTrackContext context,
        TelegramAuthService authService,
        Transaction transaction)
    {
        var userId = authService.GetUserIdFromInitData();

        transaction.UserId = userId;
        transaction.CreatedAt = DateTime.UtcNow;
        context.Transactions.Add(transaction);
        await context.SaveChangesAsync();
        return Results.Created($"/api/transactions/{transaction.Id}", transaction);
    }

    private static async Task<IResult> UpdateTransaction(
        MoneyTrackContext context,
        TelegramAuthService authService,
        long id,
        Transaction updatedTransaction)
    {
        var userId = authService.GetUserIdFromInitData();

        var transaction = await context.Transactions.FindAsync(id);
        if (transaction == null || transaction.UserId != userId)
            return Results.NotFound();

        transaction.TransactionDate = updatedTransaction.TransactionDate;
        transaction.Amount = updatedTransaction.Amount;
        transaction.Note = updatedTransaction.Note;
        transaction.CategoryId = updatedTransaction.CategoryId;
        transaction.Tags = updatedTransaction.Tags;
        transaction.Currency = updatedTransaction.Currency;

        await context.SaveChangesAsync();
        return Results.Ok(transaction);
    }

    private static async Task<IResult> DeleteTransaction(
        MoneyTrackContext context,
        TelegramAuthService authService,
        long id)
    {
        var userId = authService.GetUserIdFromInitData();

        var transaction = await context.Transactions.FindAsync(id);
        if (transaction == null || transaction.UserId != userId)
            return Results.NotFound();

        context.Transactions.Remove(transaction);
        await context.SaveChangesAsync();
        return Results.NoContent();
    }
}