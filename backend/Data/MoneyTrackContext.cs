using Microsoft.EntityFrameworkCore;
using MoneyTrack.Api.Models;

namespace MoneyTrack.Api.Data;

public class MoneyTrackContext : DbContext
{
    public MoneyTrackContext(DbContextOptions<MoneyTrackContext> options) : base(options)
    {
    }

    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<Category> Categories { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);
        optionsBuilder.UseSnakeCaseNamingConvention();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(MoneyTrackContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}