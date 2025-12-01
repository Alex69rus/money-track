import { useMemo } from 'react';
import { Category } from '../types';

interface UseCategoryFilterReturn {
  filteredCategories: Category[];
}

export const useCategoryFilter = (
  categories: Category[],
  searchTerm: string,
  transactionAmount?: number
): UseCategoryFilterReturn => {
  const filteredCategories = useMemo(() => {
    let filtered = categories;

    // Filter by transaction amount if provided
    if (transactionAmount !== undefined) {
      const targetType = transactionAmount < 0 ? 'Expense' : 'Income';
      filtered = filtered.filter(category => category.type === targetType);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by OrderIndex to maintain proper order
    filtered = filtered.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    // Remove parent categories that have children in the filtered set
    // This prevents duplicates since parent categories will appear as group headers
    const parentCategoriesWithChildren = new Set(
      filtered.filter(cat => cat.parentCategoryId).map(cat => cat.parentCategoryId)
    );

    const finalFiltered = filtered.filter(category => {
      // Keep all child categories (they have parentCategoryId)
      if (category.parentCategoryId) return true;

      // Keep parent categories that DON'T have children in our filtered set
      return !parentCategoriesWithChildren.has(category.id);
    });

    return finalFiltered;
  }, [categories, searchTerm, transactionAmount]);

  return { filteredCategories };
};
