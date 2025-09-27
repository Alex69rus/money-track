import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Skeleton,
  Grid
} from '@mui/material';
import { LocalOffer as TagIcon } from '@mui/icons-material';
import { Transaction } from '../../types';
import { calculateSpendingByTags, formatCurrency } from '../../utils/analyticsHelpers';

interface SpendingByTagsProps {
  transactions: Transaction[];
  loading?: boolean;
}

const SpendingByTags: React.FC<SpendingByTagsProps> = ({ 
  transactions, 
  loading = false 
}) => {
  const tagData = calculateSpendingByTags(transactions);
  const hasData = tagData.length > 0;

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TagIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Top Spending Tags</Typography>
          </Box>
          <Grid container spacing={1}>
            {[...Array(6)].map((_, index) => (
              <Grid item xs={6} md={4} key={index}>
                <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TagIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Top Spending Tags</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No tagged expenses available
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const maxAmount = Math.max(...tagData.map(item => item.amount));

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TagIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Top Spending Tags</Typography>
        </Box>

        <Grid container spacing={2}>
          {tagData.map((item, index) => (
            <Grid item xs={12} sm={6} md={4} key={item.tag}>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 2.5,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 90
                }}
              >
                {/* Tag Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Chip 
                    label={item.tag}
                    size="small"
                    color={index < 3 ? 'primary' : 'default'}
                    sx={{ 
                      fontSize: '0.7rem',
                      height: 24,
                      fontWeight: index < 3 ? 'bold' : 'normal'
                    }}
                  />
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ ml: 'auto' }}
                  >
                    #{index + 1}
                  </Typography>
                </Box>

                {/* Amount and Progress */}
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      color={index < 3 ? 'error.main' : 'text.primary'}
                    >
                      {formatCurrency(item.amount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.count} txn{item.count !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(item.amount / maxAmount) * 100}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: index < 3 ? 'error.main' : 'primary.main'
                      }
                    }}
                  />
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {tagData.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Showing top {tagData.length} spending tags
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default SpendingByTags;