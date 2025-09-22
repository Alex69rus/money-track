import React, { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  CircularProgress,
  Box,
} from '@mui/material';
import ApiService from '../services/api';

interface TagAutocompleteProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  label?: string;
}

const TagAutocomplete: React.FC<TagAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Add tags...",
  disabled = false,
  size = 'small',
  label = 'Tags'
}) => {
  const [allTags, setAllTags] = useState<string[]>([]);
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Fetch all user tags on component mount
  useEffect(() => {
    const fetchAllTags = async () => {
      try {
        setLoading(true);
        const apiService = ApiService.getInstance();
        const tags = await apiService.getUserTags();
        setAllTags(tags);
        setFilteredTags(tags);
      } catch (error) {
        console.error('Failed to fetch user tags:', error);
        setAllTags([]);
        setFilteredTags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllTags();
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (searchText: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (searchText.trim() === '') {
            // Show all tags when input is empty
            setFilteredTags(allTags.filter(tag => !value.includes(tag)));
          } else {
            // Filter tags based on search text (case-insensitive)
            const lowerSearch = searchText.toLowerCase();
            const filtered = allTags.filter(
              tag => tag.toLowerCase().includes(lowerSearch) && !value.includes(tag)
            );
            setFilteredTags(filtered);
          }
        }, 300); // 300ms debounce delay
      };
    })(),
    [allTags, value]
  );

  // Handle input change
  const handleInputChange = (event: React.SyntheticEvent, newInputValue: string) => {
    setInputValue(newInputValue);
    debouncedSearch(newInputValue);
  };

  // Handle value change
  const handleChange = (event: React.SyntheticEvent, newValue: string[]) => {
    onChange(newValue);
    // Update filtered tags to exclude newly selected tags
    if (inputValue.trim() === '') {
      setFilteredTags(allTags.filter(tag => !newValue.includes(tag)));
    }
  };

  // Handle opening the dropdown
  const handleOpen = () => {
    if (inputValue.trim() === '') {
      setFilteredTags(allTags.filter(tag => !value.includes(tag)));
    }
  };

  return (
    <Autocomplete
      multiple
      freeSolo
      size={size}
      disabled={disabled}
      options={filteredTags}
      value={value}
      inputValue={inputValue}
      onChange={handleChange}
      onInputChange={handleInputChange}
      onOpen={handleOpen}
      loading={loading}
      noOptionsText={
        inputValue.trim() === ''
          ? 'No existing tags'
          : `No tags match "${inputValue}". Press Enter to create new tag.`
      }
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            variant="outlined"
            label={option}
            size="small"
            {...getTagProps({ index })}
            key={index}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText="Type to search existing tags or press Enter to create new"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {loading && <CircularProgress color="inherit" size={20} />}
                {params.InputProps.endAdornment}
              </Box>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option}>
          {option}
        </li>
      )}
    />
  );
};

export default TagAutocomplete;