using Microsoft.EntityFrameworkCore;
using MoneyTrack.Api.Data;
using MoneyTrack.Api.Services;
using MoneyTrack.Api.Endpoints;
using MoneyTrack.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddDbContext<MoneyTrackContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Money Track API",
        Version = "v1",
        Description = "API for Money Track Telegram Bot - Personal Finance Tracking"
    });
});
builder.Services.AddCors();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<TelegramAuthService>();

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

app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// Health check endpoint
app.MapGet("/health", () => "OK");

// Map endpoint groups
app.MapTransactionEndpoints();
app.MapCategoryEndpoints();

app.Run();