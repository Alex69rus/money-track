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
            .WithSummary("Get user's transactions with optional filters, search and pagination")
            .WithDescription("Retrieves transactions for the authenticated user with optional date range, amount, category, tag filters, text search and pagination (skip/take)");

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
        string? tags = null,
        string? text = null,
        int? skip = null,
        int? take = null)
    {
        var userId = authService.GetUserIdFromInitData();

        var query = context.Transactions
            .Include(t => t.Category)
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

        if (!string.IsNullOrEmpty(text))
        {
            var lowerText = text.ToLower();
            query = query.Where(t =>
                t.Amount.ToString().ToLower().Contains(lowerText) ||
                (t.Note != null && t.Note.ToLower().Contains(lowerText)) ||
                t.Tags.Any(tag => tag.ToLower().Contains(lowerText)) ||
                (t.Category != null && t.Category.Name.ToLower().Contains(lowerText))
            );
        }

        IQueryable<Transaction> orderedQuery = query.OrderByDescending(t => t.TransactionDate);

        if (skip.HasValue)
            orderedQuery = orderedQuery.Skip(skip.Value);

        if (take.HasValue)
            orderedQuery = orderedQuery.Take(take.Value);

        var transactions = await orderedQuery.ToListAsync();

        return Results.Ok(transactions);
    }

    private static async Task<IResult> CreateTransaction(
        MoneyTrackContext context,
        TelegramAuthService authService,
        CreateTransactionDto createDto)
    {
        var userId = authService.GetUserIdFromInitData();

        var transaction = new Transaction
        {
            UserId = userId,
            TransactionDate = createDto.TransactionDate.Kind == DateTimeKind.Unspecified 
                ? DateTime.SpecifyKind(createDto.TransactionDate, DateTimeKind.Utc) 
                : createDto.TransactionDate.ToUniversalTime(),
            Amount = createDto.Amount,
            Note = createDto.Note,
            CategoryId = createDto.CategoryId,
            Tags = createDto.Tags ?? [],
            Currency = createDto.Currency,
            SmsText = createDto.SmsText,
            MessageId = createDto.MessageId,
            CreatedAt = DateTime.UtcNow
        };

        context.Transactions.Add(transaction);
        await context.SaveChangesAsync();
        return Results.Created($"/api/transactions/{transaction.Id}", transaction);
    }

    private static async Task<IResult> UpdateTransaction(
        MoneyTrackContext context,
        TelegramAuthService authService,
        long id,
        UpdateTransactionDto updateDto)
    {
        var userId = authService.GetUserIdFromInitData();

        var transaction = await context.Transactions.FindAsync(id);
        if (transaction == null || transaction.UserId != userId)
            return Results.NotFound();

        transaction.TransactionDate = updateDto.TransactionDate.Kind == DateTimeKind.Unspecified 
            ? DateTime.SpecifyKind(updateDto.TransactionDate, DateTimeKind.Utc) 
            : updateDto.TransactionDate.ToUniversalTime();
        transaction.Amount = updateDto.Amount;
        transaction.Note = updateDto.Note;
        transaction.CategoryId = updateDto.CategoryId;
        transaction.Tags = updateDto.Tags ?? [];
        transaction.Currency = updateDto.Currency;

        await context.SaveChangesAsync();
        
        // Reload the transaction with category information to return complete data
        var updatedTransactionWithCategory = await context.Transactions
            .Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == id);
        
        return Results.Ok(updatedTransactionWithCategory);
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