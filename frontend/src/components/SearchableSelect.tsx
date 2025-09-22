import React, { useState, useMemo, useRef } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  Typography,
  Popper,
  Paper
} from '@mui/material';
import { Category } from '../types';

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
  const autocompleteRef = useRef<any>(null);

  // Filter categories based on search term and transaction amount
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

  // Custom popper to add "no results" message
  const CustomPopper = (props: any) => (
    <Popper {...props} style={{ minWidth: 300 }}>
      <Paper>
        {filteredCategories.length === 0 && searchTerm.trim() ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No categories found for "{searchTerm}"
            </Typography>
          </Box>
        ) : (
          props.children
        )}
      </Paper>
    </Popper>
  );

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
      noOptionsText="No categories found"
      PopperComponent={CustomPopper}
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
          {params.group && (
            <Box
              component="div"
              sx={{
                p: 1,
                fontWeight: 'bold',
                color: 'primary.main',
                borderBottom: '1px solid #e0e0e0',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: '#f5f5f5'
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Find the parent category by name and select it
                const parentCategory = categories.find(cat => cat.name === params.group);
                if (parentCategory) {
                  handleChange(e, parentCategory);
                  // Close the dropdown by blurring the input
                  setTimeout(() => {
                    if (autocompleteRef.current) {
                      const input = autocompleteRef.current.querySelector('input');
                      if (input) {
                        input.blur();
                      }
                    }
                  }, 0);
                }
              }}
            >
              {params.group}
            </Box>
          )}
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
      // Clear search when selection is made
      onClose={() => {
        setSearchTerm('');
      }}
    />
  );
};

export default SearchableSelect;