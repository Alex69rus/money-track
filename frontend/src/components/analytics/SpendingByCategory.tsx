import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  LinearProgress,
  Skeleton,
  Chip
} from '@mui/material';
import { PieChart as CategoryIcon } from '@mui/icons-material';
import { Transaction } from '../../types';
import { calculateSpendingByCategory, formatCurrency } from '../../utils/analyticsHelpers';

interface SpendingByCategoryProps {
  transactions: Transaction[];
  loading?: boolean;
}

const SpendingByCategory: React.FC<SpendingByCategoryProps> = ({ 
  transactions, 
  loading = false 
}) => {
  const categoryData = calculateSpendingByCategory(transactions);
  const hasExpenses = categoryData.length > 0;

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Spending by Category</Typography>
          </Box>
          {[...Array(4)].map((_, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Skeleton variant="text" width={100} />
                <Skeleton variant="text" width={80} />
              </Box>
              <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 4 }} />
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!hasExpenses) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Spending by Category</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No expense data available
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const maxAmount = Math.max(...categoryData.map(item => item.amount));

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Spending by Category</Typography>
        </Box>
        
        <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
          {categoryData.map((item, index) => (
            <Box key={item.category} sx={{ mb: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 1 
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ fontWeight: index < 3 ? 'bold' : 'normal' }}
                  >
                    {item.category}
                  </Typography>
                  <Chip 
                    label={`${item.count} txn${item.count !== 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    color={index < 3 ? 'error.main' : 'text.primary'}
                  >
                    {formatCurrency(item.amount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.percentage.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(item.amount / maxAmount) * 100}
                sx={{ 
                  height: 6, 
                  borderRadius: 3,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: index < 3 ? 'error.main' : 'primary.main'
                  }
                }}
              />
            </Box>
          ))}
        </Box>
        
        {categoryData.length > 5 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Showing all {categoryData.length} categories
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default SpendingByCategory;