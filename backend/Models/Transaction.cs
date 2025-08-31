namespace MoneyTrack.Api.Models;

public class Transaction
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public DateTime TransactionDate { get; set; }
    public decimal Amount { get; set; }
    public string? Note { get; set; }
    public int? CategoryId { get; set; }
    public string[] Tags { get; set; } = [];
    public string Currency { get; set; } = "AED";
    public string? SmsText { get; set; }
    public string? MessageId { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public Category? Category { get; set; }
}