import React, { useState, useMemo } from 'react';
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
  helperText
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return categories;
    }

    return categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

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
          <Typography variant="body2">
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