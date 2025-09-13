import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Autocomplete,
  TextField,
  Chip,
  Typography
} from '@mui/material';

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

  // Mock available tags - in real app, this would come from API
  useEffect(() => {
    const mockTags = [
      'groceries', 'food', 'weekly', 'monthly', 'salary', 'income',
      'entertainment', 'cinema', 'weekend', 'transport', 'taxi', 'work',
      'lunch', 'coffee', 'shopping', 'utilities', 'rent', 'bills'
    ];
    setAvailableTags(mockTags);
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