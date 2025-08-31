using Microsoft.EntityFrameworkCore;
using MoneyTrack.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddDbContext<MoneyTrackContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors();

var app = builder.Build();

// Apply migrations and seed data
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<MoneyTrackContext>();
    await context.Database.MigrateAsync();
    await CategorySeeder.SeedCategoriesAsync(context);
}

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