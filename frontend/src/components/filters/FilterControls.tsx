import React from 'react';
import { Box, Stack, useTheme, useMediaQuery } from '@mui/material';
import { FilterState, Category } from '../../types';
import DateRangePicker from './DateRangePicker';
import CategoryFilter from './CategoryFilter';
import AmountFilter from './AmountFilter';
import TagsFilter from './TagsFilter';

interface FilterControlsProps {
  filters: FilterState;
  categories: Category[];
  onUpdateFilters: (updates: Partial<FilterState>) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  categories,
  onUpdateFilters,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return isMobile ? (
    <Stack spacing={3}>
      <DateRangePicker
        startDate={filters.dateRange.startDate}
        endDate={filters.dateRange.endDate}
        onStartDateChange={(date) =>
          onUpdateFilters({
            dateRange: { ...filters.dateRange, startDate: date }
          })
        }
        onEndDateChange={(date) =>
          onUpdateFilters({
            dateRange: { ...filters.dateRange, endDate: date }
          })
        }
      />
      <CategoryFilter
        selectedCategories={filters.categories}
        onCategoriesChange={(categories) => onUpdateFilters({ categories })}
        categories={categories}
      />
      <AmountFilter
        minAmount={filters.amountRange.min}
        maxAmount={filters.amountRange.max}
        onMinAmountChange={(min) =>
          onUpdateFilters({
            amountRange: { ...filters.amountRange, min }
          })
        }
        onMaxAmountChange={(max) =>
          onUpdateFilters({
            amountRange: { ...filters.amountRange, max }
          })
        }
      />
      <TagsFilter
        selectedTags={filters.tags}
        onTagsChange={(tags) => onUpdateFilters({ tags })}
      />
    </Stack>
  ) : (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 3,
        alignItems: 'start'
      }}
    >
      <DateRangePicker
        startDate={filters.dateRange.startDate}
        endDate={filters.dateRange.endDate}
        onStartDateChange={(date) =>
          onUpdateFilters({
            dateRange: { ...filters.dateRange, startDate: date }
          })
        }
        onEndDateChange={(date) =>
          onUpdateFilters({
            dateRange: { ...filters.dateRange, endDate: date }
          })
        }
      />
      <CategoryFilter
        selectedCategories={filters.categories}
        onCategoriesChange={(categories) => onUpdateFilters({ categories })}
        categories={categories}
      />
      <AmountFilter
        minAmount={filters.amountRange.min}
        maxAmount={filters.amountRange.max}
        onMinAmountChange={(min) =>
          onUpdateFilters({
            amountRange: { ...filters.amountRange, min }
          })
        }
        onMaxAmountChange={(max) =>
          onUpdateFilters({
            amountRange: { ...filters.amountRange, max }
          })
        }
      />
      <TagsFilter
        selectedTags={filters.tags}
        onTagsChange={(tags) => onUpdateFilters({ tags })}
      />
    </Box>
  );
};

export default FilterControls;
