using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddDbContext<MoneyTrackContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors();

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// Health check endpoint
app.MapGet("/health", () => "OK");

app.Run();

// Placeholder for MoneyTrackContext
public class MoneyTrackContext : DbContext
{
    public MoneyTrackContext(DbContextOptions<MoneyTrackContext> options) : base(options)
    {
    }
}