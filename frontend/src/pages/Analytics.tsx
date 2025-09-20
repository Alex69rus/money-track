import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Alert,
  Button,
  Box
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { Transaction, ApiError } from '../types';
import ApiService from '../services/api';
import { MockApiService } from '../services/mockApi';
import { DateFilter, filterTransactionsByDate } from '../utils/analyticsHelpers';
import BasicStatistics from '../components/analytics/BasicStatistics';
import SpendingByCategory from '../components/analytics/SpendingByCategory';
import SpendingTrends from '../components/analytics/SpendingTrends';
import SpendingByTags from '../components/analytics/SpendingByTags';
import DateRangeFilter from '../components/analytics/DateRangeFilter';

const Analytics: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Set default to current month
  const getCurrentMonthDates = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Format as YYYY-MM-DD in local timezone
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatLocalDate(startOfMonth),
      endDate: formatLocalDate(endOfMonth)
    };
  };

  const [dateFilter, setDateFilter] = useState<DateFilter>(getCurrentMonthDates());

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch from API first
      try {
        const apiService = ApiService.getInstance();
        const data = await apiService.getTransactions();
        setTransactions(data);
      } catch (apiError) {
        console.log('Backend not available, using mock data for analytics');
        // Fallback to mock data when API is not available
        const mockData = await MockApiService.getTransactions();
        setTransactions(mockData);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleRetry = () => {
    fetchTransactions();
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Analytics
        </Typography>
        <Alert 
          severity="error"
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRetry}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  // Apply date filter to transactions
  const filteredTransactions = filterTransactionsByDate(transactions, dateFilter);

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        Analytics
      </Typography>

      {/* Date Range Filter */}
      <DateRangeFilter
        startDate={dateFilter.startDate}
        endDate={dateFilter.endDate}
        onDateChange={setDateFilter}
      />

      {/* Basic Statistics */}
      <Box sx={{ mb: 4 }}>
        <BasicStatistics transactions={filteredTransactions} loading={loading} />
      </Box>

      <Grid container spacing={3}>
        {/* Category Breakdown */}
        <Grid item xs={12} md={6}>
          <SpendingByCategory transactions={filteredTransactions} loading={loading} />
        </Grid>

        {/* Tags Breakdown */}
        <Grid item xs={12} md={6}>
          <SpendingByTags transactions={filteredTransactions} loading={loading} />
        </Grid>

        {/* Monthly Trends */}
        <Grid item xs={12}>
          <SpendingTrends transactions={filteredTransactions} loading={loading} />
        </Grid>
      </Grid>

      {/* Data Source Indicator */}
      {!loading && transactions.length > 0 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Analytics based on {filteredTransactions.length} of {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            {filteredTransactions.length !== transactions.length && (
              <> (filtered by date range)</>
            )}
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default Analytics;