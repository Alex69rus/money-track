import React from 'react';
import { Box } from '@mui/material';
import { Category } from '../types';

interface CategoryGroupHeaderProps {
  group: string;
  categories: Category[];
  onSelect: (category: Category) => void;
  onClose: () => void;
}

const CategoryGroupHeader: React.FC<CategoryGroupHeaderProps> = ({
  group,
  categories,
  onSelect,
  onClose,
}) => {
  if (!group) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Find the parent category by name and select it
    const parentCategory = categories.find(cat => cat.name === group);
    if (parentCategory) {
      onSelect(parentCategory);
      // Close the dropdown after selection
      setTimeout(() => {
        onClose();
      }, 0);
    }
  };

  return (
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
      onClick={handleClick}
    >
      {group}
    </Box>
  );
};

export default CategoryGroupHeader;
