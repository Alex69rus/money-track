namespace MoneyTrack.Api.Models;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public CategoryType Type { get; set; }
    public string? Color { get; set; }
    public string? Icon { get; set; }
    public int? ParentCategoryId { get; set; }
    public int? OrderIndex { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public ICollection<Transaction> Transactions { get; set; } = [];
    public Category? ParentCategory { get; set; }
    public ICollection<Category> SubCategories { get; set; } = [];
}