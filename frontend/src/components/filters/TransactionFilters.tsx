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
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { FilterState, TransactionFilters as TTransactionFilters, Category } from '../../types';
import DateRangePicker from './DateRangePicker';
import CategoryFilter from './CategoryFilter';
import AmountFilter from './AmountFilter';
import TagsFilter from './TagsFilter';

interface TransactionFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onApplyFilters: (filters: TTransactionFilters) => void;
  categories: Category[];
}

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  categories,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showSearch, setShowSearch] = useState(!!filters.searchText);
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
  // Skip initial mount to prevent unnecessary API calls
  const [isInitialMount, setIsInitialMount] = useState(true);

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

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card sx={{ mb: 2 }}>
      <Box sx={{ p: 2, pb: expanded ? 1 : 2 }}>
        {/* Row 1: Title + controls */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: 40,
          }}
        >
          {/* Left: Icon + Title + Count badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon />
            <Typography variant="h6">Filters</Typography>
            {activeFiltersCount > 0 && (
              <Chip label={activeFiltersCount} size="small" color="primary" />
            )}
          </Box>

          {/* Right: Search + Expand (no Clear All here on mobile) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Search icon/field */}
            {!showSearch ? (
              <IconButton
                onClick={() => setShowSearch(true)}
                size="small"
                sx={{ color: filters.searchText ? 'primary.main' : 'inherit' }}
              >
                <SearchIcon />
              </IconButton>
            ) : (
              <TextField
                size="small"
                placeholder="Search..."
                value={filters.searchText}
                onChange={(e) => updateFilters({ searchText: e.target.value })}
                onBlur={() => !filters.searchText && setShowSearch(false)}
                autoFocus
                sx={{ width: { xs: 120, sm: 250 } }}
                InputProps={{
                  endAdornment: filters.searchText && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          updateFilters({ searchText: '' });
                          setShowSearch(false);
                        }}
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}

            {/* Clear All - only show on desktop in header row */}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
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
            </Box>

            <IconButton onClick={handleToggle} size="small">
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Row 2 (mobile only): Active filter chips + Clear button */}
        {activeFiltersCount > 0 && (
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
                onDelete={() => updateFilters({ categories: [] })}
                variant="outlined"
              />
            )}
            {filters.tags.length > 0 && (
              <Chip
                label={`${filters.tags.length} ${filters.tags.length === 1 ? 'Tag' : 'Tags'}`}
                size="small"
                onDelete={() => updateFilters({ tags: [] })}
                variant="outlined"
              />
            )}
            {(filters.dateRange.startDate || filters.dateRange.endDate) && (
              <Chip
                label="Date range"
                size="small"
                onDelete={() => updateFilters({ dateRange: { startDate: null, endDate: null } })}
                variant="outlined"
              />
            )}
            {(filters.amountRange.min !== null || filters.amountRange.max !== null) && (
              <Chip
                label="Amount"
                size="small"
                onDelete={() => updateFilters({ amountRange: { min: null, max: null } })}
                variant="outlined"
              />
            )}
            {filters.searchText && (
              <Chip
                label={`Search: "${filters.searchText}"`}
                size="small"
                onDelete={() => updateFilters({ searchText: '' })}
                variant="outlined"
              />
            )}

            {/* Clear All button on mobile */}
            <Button
              size="small"
              onClick={handleClearAll}
              color="secondary"
              sx={{ ml: 'auto' }}
            >
              Clear All
            </Button>
          </Box>
        )}
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
                categories={categories}
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
                categories={categories}
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