import React, { useState, useEffect } from 'react';
import {
  Box,
  Autocomplete,
  TextField,
  Chip,
  Typography
} from '@mui/material';
import ApiService from '../../services/api';

interface TagsFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const TagsFilter: React.FC<TagsFilterProps> = ({
  selectedTags,
  onTagsChange,
}) => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Fetch available tags from API
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const apiService = ApiService.getInstance();
        const tagsData = await apiService.getUserTags();
        setAvailableTags(tagsData);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
        // Fallback to empty array if API fails
        setAvailableTags([]);
      }
    };

    fetchTags();
  }, []);

  const handleTagsChange = (event: any, newTags: string[]) => {
    onTagsChange(newTags);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Tags
      </Typography>
      <Autocomplete
        multiple
        size="small"
        options={availableTags}
        value={selectedTags}
        onChange={handleTagsChange}
        inputValue={inputValue}
        onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
        freeSolo
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
            style: { maxHeight: 200, zIndex: 1400 },
          },
          paper: {
            sx: {
              maxHeight: 200,
              overflow: 'auto',
            },
          },
        }}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              variant="outlined"
              label={option}
              {...getTagProps({ index })}
              size="small"
              key={option}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={selectedTags.length === 0 ? "Select or type tags..." : ""}
            sx={{ minWidth: 200 }}
          />
        )}
        sx={{ minWidth: 200 }}
      />
    </Box>
  );
};

export default TagsFilter;