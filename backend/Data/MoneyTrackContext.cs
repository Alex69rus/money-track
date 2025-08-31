using Microsoft.EntityFrameworkCore;
using MoneyTrack.Api.Models;

namespace MoneyTrack.Api.Data;

public class MoneyTrackContext : DbContext
{
    public MoneyTrackContext(DbContextOptions<MoneyTrackContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<Category> Categories { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(MoneyTrackContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}