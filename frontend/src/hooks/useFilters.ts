import { useState, useEffect } from 'react';
import { FilterState, TransactionFilters } from '../types';

interface UseFiltersReturn {
  filters: FilterState;
  updateFilters: (updates: Partial<FilterState>) => void;
  clearAllFilters: () => void;
  getActiveFiltersCount: () => number;
  convertToApiFilters: () => TransactionFilters;
}

const INITIAL_FILTERS: FilterState = {
  dateRange: { startDate: null, endDate: null },
  categories: [],
  tags: [],
  amountRange: { min: null, max: null },
  searchText: '',
};

export const useFilters = (
  initialFilters: FilterState,
  onApplyFilters: (filters: TransactionFilters) => void
): UseFiltersReturn => {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isInitialMount, setIsInitialMount] = useState(true);

  const updateFilters = (updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  const clearAllFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (filters.dateRange.startDate || filters.dateRange.endDate) count++;
    if (filters.categories.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.amountRange.min !== null || filters.amountRange.max !== null) count++;
    if (filters.searchText.trim()) count++;
    return count;
  };

  const convertToApiFilters = (): TransactionFilters => {
    return {
      startDate: filters.dateRange.startDate || undefined,
      endDate: filters.dateRange.endDate || undefined,
      categoryIds: filters.categories.length > 0 ? filters.categories : undefined,
      tags: filters.tags.length > 0 ? filters.tags : undefined,
      minAmount: filters.amountRange.min || undefined,
      maxAmount: filters.amountRange.max || undefined,
      searchText: filters.searchText.trim() || undefined,
    };
  };

  // Auto-apply filters when they change (debounced)
  // Skip initial mount to prevent unnecessary API calls
  useEffect(() => {
    if (isInitialMount) {
      setIsInitialMount(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      onApplyFilters(convertToApiFilters());
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return {
    filters,
    updateFilters,
    clearAllFilters,
    getActiveFiltersCount,
    convertToApiFilters,
  };
};
