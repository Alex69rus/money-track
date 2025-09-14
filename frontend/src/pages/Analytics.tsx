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
import BasicStatistics from '../components/analytics/BasicStatistics';
import SpendingByCategory from '../components/analytics/SpendingByCategory';
import SpendingTrends from '../components/analytics/SpendingTrends';
import SpendingByTags from '../components/analytics/SpendingByTags';

const Analytics: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        Analytics
      </Typography>
      
      {/* Basic Statistics */}
      <Box sx={{ mb: 4 }}>
        <BasicStatistics transactions={transactions} loading={loading} />
      </Box>

      <Grid container spacing={3}>
        {/* Category Breakdown */}
        <Grid item xs={12} md={6}>
          <SpendingByCategory transactions={transactions} loading={loading} />
        </Grid>

        {/* Tags Breakdown */}
        <Grid item xs={12} md={6}>
          <SpendingByTags transactions={transactions} loading={loading} />
        </Grid>

        {/* Monthly Trends */}
        <Grid item xs={12}>
          <SpendingTrends transactions={transactions} loading={loading} />
        </Grid>
      </Grid>

      {/* Data Source Indicator */}
      {!loading && transactions.length > 0 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Analytics based on {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default Analytics;