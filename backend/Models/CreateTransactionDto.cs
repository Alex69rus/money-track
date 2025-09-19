using System.ComponentModel.DataAnnotations;

namespace MoneyTrack.Api.Models;

public class CreateTransactionDto
{
    [Required]
    public DateTime TransactionDate { get; set; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
    public decimal Amount { get; set; }

    [MaxLength(500)]
    public string? Note { get; set; }

    public int? CategoryId { get; set; }

    public string[]? Tags { get; set; }

    [Required]
    [MaxLength(100)]
    public string Currency { get; set; } = "AED";

    [MaxLength(1000)]
    public string? SmsText { get; set; }

    [MaxLength(100)]
    public string? MessageId { get; set; }
}