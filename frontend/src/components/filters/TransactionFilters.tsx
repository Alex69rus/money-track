import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Collapse,
  Typography,
  IconButton,
  Chip,
  useTheme,
  useMediaQuery,
  Stack,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { FilterState, TransactionFilters as TTransactionFilters } from '../../types';
import DateRangePicker from './DateRangePicker';
import CategoryFilter from './CategoryFilter';
import AmountFilter from './AmountFilter';
import TagsFilter from './TagsFilter';

interface TransactionFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onApplyFilters: (filters: TTransactionFilters) => void;
}

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
}) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates };
    onFiltersChange(newFilters);
  };

  const handleClearAll = () => {
    const clearedFilters: FilterState = {
      dateRange: { startDate: null, endDate: null },
      categories: [],
      tags: [],
      amountRange: { min: null, max: null },
      searchText: '',
    };
    onFiltersChange(clearedFilters);
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

  const convertToApiFilters = (): TTransactionFilters => {
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
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onApplyFilters(convertToApiFilters());
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card sx={{ mb: 2 }}>
      <Box sx={{ p: 2, pb: expanded ? 1 : 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon />
            <Typography variant="h6">Filters</Typography>
            {activeFiltersCount > 0 && (
              <Chip 
                label={activeFiltersCount} 
                size="small" 
                color="primary" 
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {activeFiltersCount > 0 && (
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearAll}
                color="secondary"
              >
                Clear All
              </Button>
            )}
            <IconButton onClick={handleToggle} size="small">
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <CardContent sx={{ pt: 0 }}>
          {isMobile ? (
            <Stack spacing={3}>
              <DateRangePicker
                startDate={filters.dateRange.startDate}
                endDate={filters.dateRange.endDate}
                onStartDateChange={(date) => updateFilters({ 
                  dateRange: { ...filters.dateRange, startDate: date } 
                })}
                onEndDateChange={(date) => updateFilters({ 
                  dateRange: { ...filters.dateRange, endDate: date } 
                })}
              />
              <CategoryFilter
                selectedCategories={filters.categories}
                onCategoriesChange={(categories) => updateFilters({ categories })}
              />
              <AmountFilter
                minAmount={filters.amountRange.min}
                maxAmount={filters.amountRange.max}
                onMinAmountChange={(min) => updateFilters({ 
                  amountRange: { ...filters.amountRange, min } 
                })}
                onMaxAmountChange={(max) => updateFilters({ 
                  amountRange: { ...filters.amountRange, max } 
                })}
              />
              <TagsFilter
                selectedTags={filters.tags}
                onTagsChange={(tags) => updateFilters({ tags })}
              />
            </Stack>
          ) : (
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 3,
              alignItems: 'start'
            }}>
              <DateRangePicker
                startDate={filters.dateRange.startDate}
                endDate={filters.dateRange.endDate}
                onStartDateChange={(date) => updateFilters({ 
                  dateRange: { ...filters.dateRange, startDate: date } 
                })}
                onEndDateChange={(date) => updateFilters({ 
                  dateRange: { ...filters.dateRange, endDate: date } 
                })}
              />
              <CategoryFilter
                selectedCategories={filters.categories}
                onCategoriesChange={(categories) => updateFilters({ categories })}
              />
              <AmountFilter
                minAmount={filters.amountRange.min}
                maxAmount={filters.amountRange.max}
                onMinAmountChange={(min) => updateFilters({ 
                  amountRange: { ...filters.amountRange, min } 
                })}
                onMaxAmountChange={(max) => updateFilters({ 
                  amountRange: { ...filters.amountRange, max } 
                })}
              />
              <TagsFilter
                selectedTags={filters.tags}
                onTagsChange={(tags) => updateFilters({ tags })}
              />
            </Box>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default TransactionFilters;