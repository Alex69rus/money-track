import React, { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  CircularProgress,
  Box,
} from '@mui/material';
import { useUserTags } from '../hooks/useUserTags';

interface TagAutocompleteProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  label?: string;
  autoFocus?: boolean;
}

const TagAutocomplete: React.FC<TagAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Add tags...",
  disabled = false,
  size = 'small',
  label = 'Tags',
  autoFocus = false
}) => {
  const { tags: allTags, loading } = useUserTags();
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Update filtered tags when allTags change
  useEffect(() => {
    setFilteredTags(allTags);
  }, [allTags]);

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
  const handleChange = (_event: React.SyntheticEvent, newValue: string[]) => {
    onChange(newValue);
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
      size={size}
      disabled={disabled}
      options={filteredTags}
      value={value}
      onChange={handleChange}
      loading={loading}
      freeSolo
      openOnFocus
      onOpen={handleOpen}
      noOptionsText="No existing tags"
      slotProps={{
        popper: {
          placement: 'bottom-start',
          modifiers: [
            {
              name: 'flip',
              enabled: true,
              options: {
                fallbackPlacements: ['top-start', 'bottom-start'],
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
          style: { maxHeight: 250, zIndex: 1400 },
        },
        paper: {
          sx: {
            maxHeight: 250,
            overflow: 'auto',
          },
        },
      }}
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
          autoFocus={autoFocus}
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