import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography
} from '@mui/material';
import { Category } from '../../types';
import ApiService from '../../services/api';
import { MockApiService } from '../../services/mockApi';
import SearchableSelect from '../SearchableSelect';

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
        console.error('Backend not available, using mock categories:', error);
        // Fallback to mock data when API is not available
        const mockData = await MockApiService.getCategories();
        setCategories(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Categories
      </Typography>
      <SearchableSelect
        categories={categories}
        value={selectedCategories}
        onChange={(value) => onCategoriesChange(value as number[])}
        multiple={true}
        placeholder="Search categories..."
        label="Select Categories"
        size="small"
        loading={loading}
      />
    </Box>
  );
};

export default CategoryFilter;