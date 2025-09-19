using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MoneyTrack.Api.Models;

namespace MoneyTrack.Api.Data.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Id)
            .ValueGeneratedOnAdd();

        builder.Property(t => t.Amount)
            .IsRequired()
            .HasPrecision(18, 2);

        builder.Property(t => t.Currency)
            .IsRequired()
            .HasMaxLength(100)
            .HasDefaultValue("AED");

        builder.Property(t => t.Note)
            .HasMaxLength(500);

        builder.Property(t => t.Tags)
            .HasColumnType("text[]");

        builder.Property(t => t.SmsText)
            .HasMaxLength(1000);

        builder.Property(t => t.MessageId)
            .HasMaxLength(100);

        builder.Property(t => t.TransactionDate)
            .IsRequired();

        builder.Property(t => t.CreatedAt)
            .IsRequired();

        builder.HasIndex(t=> new{ t.UserId, t.MessageId }).IsUnique();

        // Relationships
        builder.HasOne(t => t.Category)
            .WithMany(c => c.Transactions)
            .HasForeignKey(t => t.CategoryId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        // Indexes
        builder.HasIndex(t => t.UserId);
        builder.HasIndex(t => t.CategoryId);
        builder.HasIndex(t => t.TransactionDate);
        builder.HasIndex(t => new { t.UserId, t.TransactionDate });
    }
}