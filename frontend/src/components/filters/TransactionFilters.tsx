import React, { useState } from 'react';
import {
  Box,
  Card,
  Button,
  Collapse,
  Typography,
  IconButton,
  Chip,
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
import { useFilters } from '../../hooks/useFilters';
import FilterSummaryChips from './FilterSummaryChips';
import FilterControls from './FilterControls';

interface TransactionFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onApplyFilters: (filters: TTransactionFilters) => void;
  categories: Category[];
}

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters: initialFilters,
  onFiltersChange,
  onApplyFilters,
  categories,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showSearch, setShowSearch] = useState(!!initialFilters.searchText);

  const {
    filters,
    updateFilters,
    clearAllFilters,
    getActiveFiltersCount,
  } = useFilters(initialFilters, onApplyFilters);

  // Sync internal filters with parent
  React.useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const handleClearAll = () => {
    clearAllFilters();
    setShowSearch(false);
  };

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

          {/* Right: Search + Expand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Search icon/field */}
            {!showSearch ? (
              <IconButton
                onClick={() => setShowSearch(true)}
                size="small"
                aria-label="Toggle search"
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
                        aria-label="Clear search"
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

            <IconButton onClick={handleToggle} size="small" aria-label="Toggle filters">
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Row 2 (mobile only): Active filter chips + Clear button */}
        <FilterSummaryChips
          filters={filters}
          onUpdateFilters={updateFilters}
          onClearAll={handleClearAll}
        />
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 0 }}>
          <FilterControls
            filters={filters}
            categories={categories}
            onUpdateFilters={updateFilters}
          />
        </Box>
      </Collapse>
    </Card>
  );
};

export default TransactionFilters;
