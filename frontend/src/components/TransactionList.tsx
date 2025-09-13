import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  Skeleton,
  Alert,
  Button,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { Transaction, ApiError, TransactionFilters } from '../types';
import ApiService from '../services/api';
import { MockApiService } from '../services/mockApi';
import { formatDateTime, formatCurrency, getCurrencyColor } from '../utils/formatters';
import EmptyState from './EmptyState';

interface TransactionListProps {
  refreshTrigger?: number;
  filters?: TransactionFilters;
}

const TransactionList: React.FC<TransactionListProps> = ({ refreshTrigger = 0, filters }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Client-side filtering for testing purposes
  const applyFilters = (data: Transaction[], filters?: TransactionFilters): Transaction[] => {
    if (!filters) return data;

    return data.filter(transaction => {
      // Date range filter
      if (filters.startDate) {
        const transactionDate = new Date(transaction.transactionDate).toISOString().split('T')[0];
        if (transactionDate < filters.startDate) return false;
      }
      if (filters.endDate) {
        const transactionDate = new Date(transaction.transactionDate).toISOString().split('T')[0];
        if (transactionDate > filters.endDate) return false;
      }

      // Category filter
      if (filters.categoryIds && filters.categoryIds.length > 0) {
        if (!transaction.categoryId || !filters.categoryIds.includes(transaction.categoryId)) {
          return false;
        }
      }

      // Amount range filter
      if (filters.minAmount !== undefined && transaction.amount < filters.minAmount) return false;
      if (filters.maxAmount !== undefined && transaction.amount > filters.maxAmount) return false;

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(filterTag => 
          transaction.tags.some(transactionTag => 
            transactionTag.toLowerCase().includes(filterTag.toLowerCase())
          )
        );
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use mock data for testing when backend is not available
      try {
        const apiService = ApiService.getInstance();
        const data = await apiService.getTransactions(filters);
        setTransactions(data);
      } catch (apiError) {
        console.log('Backend not available, using mock data for testing filters');
        const mockData = await MockApiService.getTransactions();
        // Apply client-side filtering for testing
        const filteredData = applyFilters(mockData, filters);
        setTransactions(filteredData);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [refreshTrigger, filters]);

  const handleRetry = () => {
    fetchTransactions();
  };

  if (loading) {
    return (
      <Box>
        {isMobile ? (
          <Stack spacing={2}>
            {[...Array(5)].map((_, index) => (
              <Card key={index}>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="rectangular" width={80} height={24} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date/Time</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell>Tags</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...Array(5)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton variant="text" width={140} /></TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={60} height={24} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (transactions.length === 0) {
    return <EmptyState />;
  }

  const renderMobileCard = (transaction: Transaction) => (
    <Card key={transaction.id} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(transaction.transactionDate)}
          </Typography>
          <Typography 
            variant="h6" 
            color={getCurrencyColor(transaction.amount)}
            sx={{ fontWeight: 'bold' }}
          >
            {transaction.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), transaction.currency)}
          </Typography>
        </Box>
        
        {transaction.category && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Category:</strong> {transaction.category.name}
          </Typography>
        )}
        
        {transaction.note && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Note:</strong> {transaction.note}
          </Typography>
        )}
        
        {transaction.tags && transaction.tags.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {transaction.tags.map((tag, index) => (
              <Chip 
                key={index} 
                label={tag} 
                size="small" 
                variant="outlined"
              />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  const renderDesktopTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date/Time</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Note</TableCell>
            <TableCell>Tags</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {formatDateTime(transaction.transactionDate)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography 
                  variant="body2" 
                  color={getCurrencyColor(transaction.amount)}
                  sx={{ fontWeight: 'bold' }}
                >
                  {transaction.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {transaction.category?.name || 'Uncategorized'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    maxWidth: 200, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={transaction.note || ''}
                >
                  {transaction.note || '-'}
                </Typography>
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {transaction.tags && transaction.tags.length > 0 ? (
                    transaction.tags.map((tag, index) => (
                      <Chip 
                        key={index} 
                        label={tag} 
                        size="small" 
                        variant="outlined"
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.disabled">-</Typography>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      {isMobile ? (
        <Stack spacing={0}>
          {transactions.map(renderMobileCard)}
        </Stack>
      ) : (
        renderDesktopTable()
      )}
    </Box>
  );
};

export default TransactionList;