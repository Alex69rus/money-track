import React from 'react';
import {
  Box,
  Typography
} from '@mui/material';
import { Category } from '../../types';
import SearchableSelect from '../SearchableSelect';

interface CategoryFilterProps {
  selectedCategories: number[];
  onCategoriesChange: (categoryIds: number[]) => void;
  categories: Category[];
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategories,
  onCategoriesChange,
  categories,
}) => {

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
        loading={false}
      />
    </Box>
  );
};

export default CategoryFilter;