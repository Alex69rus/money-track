import React from 'react';
import { Box, Chip, Button } from '@mui/material';
import { FilterState } from '../../types';

interface FilterSummaryChipsProps {
  filters: FilterState;
  onUpdateFilters: (updates: Partial<FilterState>) => void;
  onClearAll: () => void;
}

const FilterSummaryChips: React.FC<FilterSummaryChipsProps> = ({
  filters,
  onUpdateFilters,
  onClearAll,
}) => {
  const activeFiltersCount =
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.tags.length > 0 ? 1 : 0) +
    (filters.dateRange.startDate || filters.dateRange.endDate ? 1 : 0) +
    (filters.amountRange.min !== null || filters.amountRange.max !== null ? 1 : 0) +
    (filters.searchText ? 1 : 0);

  if (activeFiltersCount === 0) return null;

  return (
    <Box
      sx={{
        display: { xs: 'flex', sm: 'none' },
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        mt: 1.5,
        pt: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Show active filter chips */}
      {filters.categories.length > 0 && (
        <Chip
          label={`${filters.categories.length} ${filters.categories.length === 1 ? 'Category' : 'Categories'}`}
          size="small"
          onDelete={() => onUpdateFilters({ categories: [] })}
          variant="outlined"
        />
      )}
      {filters.tags.length > 0 && (
        <Chip
          label={`${filters.tags.length} ${filters.tags.length === 1 ? 'Tag' : 'Tags'}`}
          size="small"
          onDelete={() => onUpdateFilters({ tags: [] })}
          variant="outlined"
        />
      )}
      {(filters.dateRange.startDate || filters.dateRange.endDate) && (
        <Chip
          label="Date range"
          size="small"
          onDelete={() => onUpdateFilters({ dateRange: { startDate: null, endDate: null } })}
          variant="outlined"
        />
      )}
      {(filters.amountRange.min !== null || filters.amountRange.max !== null) && (
        <Chip
          label="Amount"
          size="small"
          onDelete={() => onUpdateFilters({ amountRange: { min: null, max: null } })}
          variant="outlined"
        />
      )}
      {filters.searchText && (
        <Chip
          label={`Search: "${filters.searchText}"`}
          size="small"
          onDelete={() => onUpdateFilters({ searchText: '' })}
          variant="outlined"
        />
      )}

      {/* Clear All button on mobile */}
      <Button
        size="small"
        onClick={onClearAll}
        color="secondary"
        sx={{ ml: 'auto' }}
      >
        Clear All
      </Button>
    </Box>
  );
};

export default FilterSummaryChips;
