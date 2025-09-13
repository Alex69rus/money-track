import React, { useState, useEffect } from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip,
  Typography,
  SelectChangeEvent,
  OutlinedInput
} from '@mui/material';
import { Category } from '../../types';
import ApiService from '../../services/api';

interface CategoryFilterProps {
  selectedCategories: number[];
  onCategoriesChange: (categoryIds: number[]) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategories,
  onCategoriesChange,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const apiService = ApiService.getInstance();
        const data = await apiService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    onCategoriesChange(typeof value === 'string' ? [] : value as number[]);
  };


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Categories
      </Typography>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>Select Categories</InputLabel>
        <Select
          multiple
          value={selectedCategories}
          onChange={handleChange}
          input={<OutlinedInput label="Select Categories" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as number[]).map((value) => {
                const category = categories.find(cat => cat.id === value);
                return (
                  <Chip 
                    key={value} 
                    label={category?.name || `Category ${value}`} 
                    size="small" 
                  />
                );
              })}
            </Box>
          )}
          disabled={loading}
        >
          {categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default CategoryFilter;