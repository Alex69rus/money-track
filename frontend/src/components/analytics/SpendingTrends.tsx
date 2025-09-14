import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Skeleton,
  Grid,
  Divider
} from '@mui/material';
import { 
  Timeline as TrendIcon,
  TrendingUp as UpIcon,
  TrendingDown as DownIcon 
} from '@mui/icons-material';
import { Transaction } from '../../types';
import { calculateMonthlySpending, formatCurrency } from '../../utils/analyticsHelpers';

interface SpendingTrendsProps {
  transactions: Transaction[];
  loading?: boolean;
}

const SpendingTrends: React.FC<SpendingTrendsProps> = ({ 
  transactions, 
  loading = false 
}) => {
  const monthlyData = calculateMonthlySpending(transactions);
  const hasData = monthlyData.length > 0;

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TrendIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Monthly Spending Trends</Typography>
          </Box>
          <Grid container spacing={2}>
            {[...Array(3)].map((_, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Skeleton variant="text" width={80} height={20} />
                <Skeleton variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
                <Skeleton variant="text" width={120} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TrendIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Monthly Spending Trends</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No monthly data available
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const maxExpenses = Math.max(...monthlyData.map(item => item.expenses));
  const maxIncome = Math.max(...monthlyData.map(item => item.income));
  const maxValue = Math.max(maxExpenses, maxIncome);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <TrendIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Monthly Spending Trends</Typography>
        </Box>

        <Grid container spacing={3}>
          {monthlyData.map((month, index) => (
            <Grid item xs={12} sm={6} md={4} key={month.month}>
              <Box 
                sx={{ 
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 2,
                  height: '100%'
                }}
              >
                <Typography 
                  variant="subtitle1" 
                  fontWeight="bold" 
                  sx={{ mb: 2, textAlign: 'center' }}
                >
                  {month.month}
                </Typography>

                {/* Income Bar */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="success.main">
                      Income
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      +{formatCurrency(month.income)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={maxValue > 0 ? (month.income / maxValue) * 100 : 0}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'success.light',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'success.main'
                      }
                    }}
                  />
                </Box>

                {/* Expenses Bar */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="error.main">
                      Expenses
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="error.main">
                      -{formatCurrency(month.expenses)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={maxValue > 0 ? (month.expenses / maxValue) * 100 : 0}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'error.light',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'error.main'
                      }
                    }}
                  />
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* Net Balance */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {month.net >= 0 ? (
                      <UpIcon sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
                    ) : (
                      <DownIcon sx={{ color: 'error.main', fontSize: 16, mr: 0.5 }} />
                    )}
                    <Typography variant="body2">
                      Net
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    color={month.net >= 0 ? 'success.main' : 'error.main'}
                  >
                    {month.net >= 0 ? '+' : ''}{formatCurrency(month.net)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {monthlyData.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Showing last {monthlyData.length} months with transaction data
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default SpendingTrends;