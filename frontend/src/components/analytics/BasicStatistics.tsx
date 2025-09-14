import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import { 
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  AccountBalance as BalanceIcon,
  ShowChart as AvgIcon
} from '@mui/icons-material';
import { Transaction } from '../../types';
import { calculateBasicStats, formatCurrency } from '../../utils/analyticsHelpers';

interface BasicStatisticsProps {
  transactions: Transaction[];
  loading?: boolean;
}

const BasicStatistics: React.FC<BasicStatisticsProps> = ({ transactions, loading = false }) => {
  const stats = calculateBasicStats(transactions);

  const statCards = [
    {
      label: 'Total Income',
      value: stats.totalIncome,
      color: 'success.main',
      icon: <IncomeIcon />,
      sign: '+'
    },
    {
      label: 'Total Expenses', 
      value: stats.totalExpenses,
      color: 'error.main',
      icon: <ExpenseIcon />,
      sign: '-'
    },
    {
      label: 'Balance',
      value: stats.balance,
      color: stats.balance >= 0 ? 'success.main' : 'error.main',
      icon: <BalanceIcon />,
      sign: stats.balance >= 0 ? '+' : ''
    },
    {
      label: 'Avg Transaction',
      value: stats.avgTransaction,
      color: 'primary.main',
      icon: <AvgIcon />,
      sign: ''
    },
  ];

  if (loading) {
    return (
      <Grid container spacing={2}>
        {[...Array(4)].map((_, index) => (
          <Grid item xs={6} md={3} key={index}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Skeleton variant="circular" width={40} height={40} sx={{ mx: 'auto', mb: 1 }} />
                <Skeleton variant="text" width={80} height={32} sx={{ mx: 'auto', mb: 1 }} />
                <Skeleton variant="text" width={100} height={20} sx={{ mx: 'auto' }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No transaction data available for statistics
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={2}>
      {statCards.map((stat, index) => (
        <Grid item xs={6} md={3} key={index}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, color: stat.color }}>
                {stat.icon}
              </Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: stat.color, 
                  fontWeight: 'bold',
                  fontSize: { xs: '1.2rem', md: '1.5rem' }
                }}
              >
                {stat.sign}{formatCurrency(stat.value).split(' ')[0]}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
              >
                {stat.label}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.disabled"
                sx={{ display: 'block', mt: 0.5 }}
              >
                AED
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default BasicStatistics;