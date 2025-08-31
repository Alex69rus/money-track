using Microsoft.EntityFrameworkCore;
using MoneyTrack.Api.Models;

namespace MoneyTrack.Api.Data;

public static class CategorySeeder
{
    public static async Task SeedCategoriesAsync(MoneyTrackContext context)
    {
        if (await context.Categories.AnyAsync())
        {
            return; // Categories already seeded
        }

        var expenseCategories = new[]
        {
            "Medical Services", "Education", "Beauty", "Clothing & Shoes", "Furniture", "Charity", "Taxis",
            "Maintenance & Renovation", "Kids", "Utility", "Healthcare", "Internet-Services", "Entertainment",
            "Communication", "Medicines", "Baby Clothes", "Accessories & Toys", "Groceries", "Gifts", "Home",
            "Rent", "Alcohol", "Public transport", "Pets", "Carsharing", "Etc.", "Veterinary Services",
            "Car", "Fuel", "Classes", "Parking & Toll roads", "Toys", "Household Goods", "Eating Out",
            "Hotel", "Travel", "Tickets", "Car Wash", "Cellular", "Hardware", "Legalisation", "Pet Food"
        };

        var incomeCategories = new[]
        {
            "Savings interests", "Luda's job", "Rus transfer", "Apique salary Transfer from USD",
            "Apique salary", "Luda's income", "Other income"
        };

        var categories = new List<Category>();

        // Add expense categories
        foreach (var categoryName in expenseCategories)
        {
            categories.Add(new Category
            {
                Name = categoryName,
                Type = CategoryType.Expense,
                CreatedAt = DateTime.UtcNow
            });
        }

        // Add income categories
        foreach (var categoryName in incomeCategories)
        {
            categories.Add(new Category
            {
                Name = categoryName,
                Type = CategoryType.Income,
                CreatedAt = DateTime.UtcNow
            });
        }

        context.Categories.AddRange(categories);
        await context.SaveChangesAsync();
    }
}