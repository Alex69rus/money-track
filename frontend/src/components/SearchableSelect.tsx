import React, { useState, useMemo, useRef } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Category } from '../types';
import { useCategoryFilter } from '../hooks/useCategoryFilter';
import CategoryGroupHeader from './CategoryGroupHeader';

interface SearchableSelectProps {
  categories: Category[];
  value: string | number | number[];
  onChange: (value: string | number | number[]) => void;
  multiple?: boolean;
  placeholder?: string;
  loading?: boolean;
  label?: string;
  size?: 'small' | 'medium';
  error?: boolean;
  helperText?: string;
  transactionAmount?: number; // For filtering categories by transaction type
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  categories,
  value,
  onChange,
  multiple = false,
  placeholder = "Search categories...",
  loading = false,
  label = "Category",
  size = "small",
  error = false,
  helperText,
  transactionAmount
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Mobile detection for proactive dropdown placement
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Filter categories using custom hook
  const { filteredCategories } = useCategoryFilter(categories, searchTerm, transactionAmount);

  // Convert value to appropriate format for Autocomplete
  const autocompleteValue = useMemo(() => {
    if (multiple) {
      const ids = Array.isArray(value) ? value : [];
      return categories.filter(cat => ids.includes(cat.id));
    } else {
      const id = typeof value === 'string' ? parseInt(value) : (typeof value === 'number' ? value : null);
      if (!id) return null;
      return categories.find(cat => cat.id === id) || null;
    }
  }, [categories, value, multiple]);

  const handleChange = (_event: any, newValue: Category | Category[] | null) => {
    if (multiple) {
      const selectedCategories = Array.isArray(newValue) ? newValue : [];
      const ids = selectedCategories.map(cat => cat.id);
      onChange(ids);
    } else {
      const selectedCategory = newValue as Category | null;
      onChange(selectedCategory ? selectedCategory.id.toString() : '');
    }
  };

  const handleCloseDropdown = () => {
    if (autocompleteRef.current) {
      const input = autocompleteRef.current.querySelector('input');
      if (input) {
        input.blur();
      }
    }
  };

  return (
    <Autocomplete
      ref={autocompleteRef}
      multiple={multiple}
      options={filteredCategories}
      value={autocompleteValue}
      onChange={handleChange}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      loading={loading}
      loadingText="Loading categories..."
      noOptionsText={searchTerm.trim() ? `No categories found for "${searchTerm}"` : "No categories found"}
      slotProps={{
        popper: {
          placement: 'bottom-start',
          modifiers: [
            {
              name: 'flip',
              enabled: true,
              options: {
                fallbackPlacements: ['top-start'],
                padding: 8,
              },
            },
            {
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 8,
              },
            },
            {
              name: 'offset',
              options: {
                offset: [0, 4],
              },
            },
          ],
          style: { maxHeight: 300, zIndex: 1400 },
        },
        paper: {
          sx: {
            minWidth: 300,
            maxHeight: 300,
            overflow: 'auto',
          },
        },
      }}
      groupBy={(option) => {
        // If this category has a parent, group it under the parent's name
        if (option.parentCategoryId) {
          const parentCategory = categories.find(cat => cat.id === option.parentCategoryId);
          return parentCategory ? parentCategory.name : 'Other';
        }
        // Parent categories go to empty group (no header)
        return '';
      }}
      renderGroup={(params) => (
        <li key={params.key}>
          <CategoryGroupHeader
            group={params.group}
            categories={categories}
            onSelect={(category) => handleChange(null, category)}
            onClose={handleCloseDropdown}
          />
          <ul style={{
            listStyle: 'none',
            padding: params.group ? '0 0 0 8px' : 0,
            margin: 0
          }}>
            {params.children}
          </ul>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size={size}
          error={error}
          helperText={helperText}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? <div>Loading...</div> : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            variant="outlined"
            label={option.name}
            size="small"
            {...getTagProps({ index })}
            key={option.id}
          />
        ))
      }
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 'normal',
              color: 'text.primary'
            }}
          >
            {option.name}
          </Typography>
        </Box>
      )}
      // Allow searching while typing
      filterOptions={(options) => options}
      onInputChange={(_, newInputValue, reason) => {
        if (reason === 'input') {
          setSearchTerm(newInputValue);
        }
      }}
      onOpen={() => {
        // Scroll input into view on mobile to keep dropdown visible
        if (isMobile && autocompleteRef.current) {
          setTimeout(() => {
            const inputElement = autocompleteRef.current?.querySelector('input');
            if (inputElement) {
              inputElement.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
              });
            }
          }, 300); // Wait for keyboard animation (iOS ~250-300ms)
        }
      }}
      // Clear search when selection is made
      onClose={() => {
        setSearchTerm('');
      }}
    />
  );
};

export default SearchableSelect;
