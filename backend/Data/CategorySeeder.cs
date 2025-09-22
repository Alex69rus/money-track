using Microsoft.EntityFrameworkCore;
using MoneyTrack.Api.Models;

namespace MoneyTrack.Api.Data;

public static class CategorySeeder
{
    public static async Task SeedCategoriesAsync(MoneyTrackContext context)
    {
        // Force re-seed if any categories have null OrderIndex
        var categoriesWithoutOrder = await context.Categories.Where(c => c.OrderIndex == null).CountAsync();
        if (categoriesWithoutOrder > 0)
        {
            // Remove all existing categories to re-seed properly
            var allCategories = await context.Categories.ToListAsync();
            context.Categories.RemoveRange(allCategories);
            await context.SaveChangesAsync();
        }
        else if (await context.Categories.AnyAsync())
        {
            return; // Categories already properly seeded
        }

        var categories = new List<Category>();

        foreach (var category in ExpenseCategories)
        {
            category.CreatedAt = DateTime.UtcNow;
            categories.Add(category);
        }
        
        foreach (var category in IncomeCategories)
        {
            category.CreatedAt = DateTime.UtcNow;
            categories.Add(category);
        }

        context.Categories.AddRange(categories);
        await context.SaveChangesAsync();
    }

    public static readonly IReadOnlyCollection<Category> ExpenseCategories =
    [
        new Category { Name = "Groceries", Type = CategoryType.Expense, OrderIndex = 1 },
        new Category { Name = "Eating Out", Type = CategoryType.Expense, OrderIndex = 2 },
        new Category { Name = "Entertainment", Type = CategoryType.Expense, OrderIndex = 3 },
        new Category { Name = "Luda's job", Type = CategoryType.Expense, OrderIndex = 4 },
        new Category { Name = "Beauty", Type = CategoryType.Expense, OrderIndex = 5 },
        new Category { Name = "Clothing & Shoes", Type = CategoryType.Expense, OrderIndex = 6 },
        new Category
        {
            Name = "Home",
            Type = CategoryType.Expense,
            OrderIndex = 7,
            SubCategories =
            [
                new() { Name = "Furniture", Type = CategoryType.Expense, OrderIndex = 8 },
                new() { Name = "Household Goods", Type = CategoryType.Expense, OrderIndex = 9 },
                new() { Name = "Maintenance & Renovation", Type = CategoryType.Expense, OrderIndex = 10 },
                new() { Name = "Rent", Type = CategoryType.Expense, OrderIndex = 11 },
                new() { Name = "Utility", Type = CategoryType.Expense, OrderIndex = 12 },
            ]
        },
        new Category
        {
            Name = "Car",
            Type = CategoryType.Expense,
            OrderIndex = 13,
            SubCategories =
            [
                new() { Name = "Fuel", Type = CategoryType.Expense, OrderIndex = 14 },
                new() { Name = "Car Wash", Type = CategoryType.Expense, OrderIndex = 15 },
                new() { Name = "Parking & Toll roads", Type = CategoryType.Expense, OrderIndex = 16 },
            ]
        },
        new Category
        {
            Name = "Kids",
            Type = CategoryType.Expense,
            OrderIndex = 17,
            SubCategories =
            [
                new() { Name = "Toys", Type = CategoryType.Expense, OrderIndex = 18 },
                new() { Name = "Classes", Type = CategoryType.Expense, OrderIndex = 19 },
                new() { Name = "Baby Clothes", Type = CategoryType.Expense, OrderIndex = 20 },
            ]
        },
        new Category
        {
            Name = "Healthcare",
            Type = CategoryType.Expense,
            OrderIndex = 21,
            SubCategories =
            [
                new() { Name = "Medical Services", Type = CategoryType.Expense, OrderIndex = 22 },
                new() { Name = "Medicines", Type = CategoryType.Expense, OrderIndex = 23 },
            ]
        },
        new Category
        {
            Name = "Communication",
            Type = CategoryType.Expense,
            OrderIndex = 24,
            SubCategories =
            [
                new() { Name = "Cellular", Type = CategoryType.Expense, OrderIndex = 25 },
                new() { Name = "Internet-Services", Type = CategoryType.Expense, OrderIndex = 26 },
            ]
        },
        new Category { Name = "Alcohol", Type = CategoryType.Expense, OrderIndex = 27 },
        new Category
        {
            Name = "Transport",
            Type = CategoryType.Expense,
            OrderIndex = 28,
            SubCategories =
            [
                new() { Name = "Public transport", Type = CategoryType.Expense, OrderIndex = 29 },
                new() { Name = "Taxis", Type = CategoryType.Expense, OrderIndex = 30 },
                new() { Name = "Carsharing", Type = CategoryType.Expense, OrderIndex = 31 },
            ]
        },
        new Category
        {
            Name = "Pets",
            Type = CategoryType.Expense,
            OrderIndex = 32,
            SubCategories =
            [
                new() { Name = "Pet Food", Type = CategoryType.Expense, OrderIndex = 33 },
                new() { Name = "Veterinary Services", Type = CategoryType.Expense, OrderIndex = 34 },
                new() { Name = "Accessories & Toys", Type = CategoryType.Expense, OrderIndex = 35 },
            ]
        },

        new Category { Name = "Education", Type = CategoryType.Expense, OrderIndex = 36 },
        new Category
        {
            Name = "Travel",
            Type = CategoryType.Expense,
            OrderIndex = 37,
            SubCategories =
            [
                new() { Name = "Tickets", Type = CategoryType.Expense, OrderIndex = 38 },
                new() { Name = "Hotel", Type = CategoryType.Expense, OrderIndex = 39 },
            ]
        },
        new Category
        {
            Name = "Etc.",
            Type = CategoryType.Expense,
            OrderIndex = 40,
            SubCategories =
            [
                new Category { Name = "Gifts", Type = CategoryType.Expense, OrderIndex = 41 },
                new Category { Name = "Charity", Type = CategoryType.Expense, OrderIndex = 42 },
            ]
        },

        new Category { Name = "Hardware", Type = CategoryType.Expense, OrderIndex = 43 },
        new Category { Name = "Legalisation", Type = CategoryType.Expense, OrderIndex = 44 },
    ];
    
    public static readonly IReadOnlyCollection<Category> IncomeCategories =
    [
        new Category { Name = "Apique salary", Type = CategoryType.Income, OrderIndex = 1 },
        new Category { Name = "Luda's income", Type = CategoryType.Income, OrderIndex = 2 },
        new Category { Name = "Savings interests", Type = CategoryType.Income, OrderIndex = 3 },
        new Category { Name = "Apique salary Transfer from USD", Type = CategoryType.Income, OrderIndex = 4 },
        new Category { Name = "Rus transfer", Type = CategoryType.Income, OrderIndex = 5 },
        new Category { Name = "Other income", Type = CategoryType.Income, OrderIndex = 6 },
    ];
}