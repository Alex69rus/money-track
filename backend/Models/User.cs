namespace MoneyTrack.Api.Models;

public class User
{
    public long Id { get; set; }
    public long TelegramId { get; set; }
    public string? Username { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public ICollection<Transaction> Transactions { get; set; } = [];
}