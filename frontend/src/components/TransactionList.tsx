import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  IconButton,
  Snackbar,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { Transaction, ApiError, TransactionFilters, Category, UpdateTransactionRequest } from '../types';
import ApiService from '../services/api';
import { MockApiService } from '../services/mockApi';
import { formatDateTime, formatCurrency, getCurrencyColor } from '../utils/formatters';
import EmptyState from './EmptyState';
import TransactionEdit from './TransactionEdit';
import SearchableSelect from './SearchableSelect';
import QuickTagSelector from './QuickTagSelector';

interface TransactionListProps {
  refreshTrigger?: number;
  filters?: TransactionFilters;
}

const TransactionList: React.FC<TransactionListProps> = ({ refreshTrigger = 0, filters }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [updatingTags, setUpdatingTags] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  // Force rebuild


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
        const mockData = await MockApiService.getTransactions(filters);
        setTransactions(mockData);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, filters]);

  const handleRetry = () => {
    fetchTransactions();
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditTransaction(transaction);
  };


  const handleEditClose = () => {
    setEditTransaction(null);
  };


  // Load categories for quick selector
  const fetchCategories = async () => {
    try {
      const apiService = ApiService.getInstance();
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Backend not available, using mock categories:', error);
      // Use mock categories for testing
      const mockCategories: Category[] = [
        { id: 1, name: 'Groceries', type: 'Expense' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Salary', type: 'Income' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 3, name: 'Entertainment', type: 'Expense' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 4, name: 'Transportation', type: 'Expense' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 5, name: 'Utilities', type: 'Expense' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 6, name: 'Healthcare', type: 'Expense' as const, createdAt: '2024-01-01T00:00:00Z' },
      ];
      setCategories(mockCategories);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);


  const handleCategorySelect = async (categoryId: string | number | number[], transactionId: number) => {
    if (Array.isArray(categoryId)) return;

    const finalCategoryId = typeof categoryId === 'string' ? parseInt(categoryId) : categoryId;
    if (isNaN(finalCategoryId)) return;

    // Find the current transaction to get all its fields
    const currentTransaction = transactions.find(t => t.id === transactionId);
    if (!currentTransaction) return;

    try {
      setUpdatingCategory(true);
      setSelectedTransactionId(transactionId);
      const apiService = ApiService.getInstance();

      // Create the update request object with ALL required fields - backend doesn't support partial updates
      const updateRequest: UpdateTransactionRequest = {
        transactionDate: currentTransaction.transactionDate,
        amount: currentTransaction.amount,
        note: currentTransaction.note,
        categoryId: finalCategoryId,
        tags: currentTransaction.tags,
        currency: currentTransaction.currency
      };

      // Update the transaction with the selected category
      const updatedTransaction = await apiService.updateTransaction(transactionId, updateRequest);

      // Update the local state with the full updated transaction
      setTransactions(prev =>
        prev.map(t =>
          t.id === transactionId ? updatedTransaction : t
        )
      );

      setSnackbarMessage('Category updated successfully');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to update category:', error);
      setSnackbarMessage('Failed to update category');
      setSnackbarOpen(true);
    } finally {
      setUpdatingCategory(false);
      setSelectedTransactionId(null);
    }
  };

  const handleTransactionUpdated = (updatedTransaction: Transaction) => {
    setTransactions(prev => 
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
    );
    setSnackbarMessage('Transaction updated successfully');
    setSnackbarOpen(true);
  };

  const handleTransactionDeleted = (deletedTransactionId: number) => {
    setTransactions(prev => prev.filter(t => t.id !== deletedTransactionId));
    setSnackbarMessage('Transaction deleted successfully');
    setSnackbarOpen(true);
  };

  const handleError = (errorMessage: string) => {
    setSnackbarMessage(errorMessage);
    setSnackbarOpen(true);
  };

  const handleQuickTagUpdate = async (transactionId: number, newTags: string[]) => {
    setUpdatingTags(true);
    setSelectedTransactionId(transactionId);

    try {
      const apiService = ApiService.getInstance();
      const currentTransaction = transactions.find(t => t.id === transactionId);

      if (!currentTransaction) {
        throw new Error('Transaction not found');
      }

      const updateRequest: UpdateTransactionRequest = {
        transactionDate: currentTransaction.transactionDate,
        amount: currentTransaction.amount,
        note: currentTransaction.note,
        categoryId: currentTransaction.categoryId,
        tags: newTags,
        currency: currentTransaction.currency
      };

      const updatedTransaction = await apiService.updateTransaction(transactionId, updateRequest);

      setTransactions(prev =>
        prev.map(t => t.id === transactionId ? updatedTransaction : t)
      );

      setSnackbarMessage('Tags updated successfully');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to update tags:', error);
      setSnackbarMessage('Failed to update tags');
      setSnackbarOpen(true);
      throw error; // Re-throw for QuickTagSelector error handling
    } finally {
      setUpdatingTags(false);
      setSelectedTransactionId(null);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
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
                    <TableCell><Skeleton variant="rectangular" width={80} height={32} /></TableCell>
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
    <Card key={transaction.id} sx={{ mb: 2, position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            {transaction.category ? (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  color: 'primary.main'
                }}
              >
                {transaction.category.name}
              </Typography>
            ) : (
              <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                <SearchableSelect
                  categories={categories}
                  value=""
                  onChange={(value) => handleCategorySelect(value, transaction.id)}
                  placeholder="Select category..."
                  label=""
                  size="small"
                  loading={updatingCategory && selectedTransactionId === transaction.id}
                  transactionAmount={transaction.amount}
                />
              </Box>
            )}
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              color: getCurrencyColor(transaction.amount)
            }}
          >
            {transaction.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), transaction.currency)}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {formatDateTime(transaction.transactionDate)}
        </Typography>

        {transaction.note && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Note:</strong> {transaction.note}
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <QuickTagSelector
            transaction={transaction}
            onTagsUpdate={handleQuickTagUpdate}
            disabled={updatingTags && selectedTransactionId === transaction.id}
          />
          <IconButton
            size="small"
            onClick={() => handleEditClick(transaction)}
            sx={{
              color: 'primary.main',
              ml: 1,
              flexShrink: 0
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
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
            <TableCell align="center">Actions</TableCell>
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
                  sx={{
                    fontWeight: 'bold',
                    color: getCurrencyColor(transaction.amount)
                  }}
                >
                  {transaction.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                </Typography>
              </TableCell>
              <TableCell>
                {transaction.category ? (
                  <Typography variant="body2">
                    {transaction.category.name}
                  </Typography>
                ) : (
                  <Box sx={{ minWidth: 140, maxWidth: 160 }}>
                    <SearchableSelect
                      categories={categories}
                      value=""
                      onChange={(value) => handleCategorySelect(value, transaction.id)}
                      placeholder="Select..."
                      label=""
                      size="small"
                      loading={updatingCategory && selectedTransactionId === transaction.id}
                      transactionAmount={transaction.amount}
                    />
                  </Box>
                )}
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
                <QuickTagSelector
                  transaction={transaction}
                  onTagsUpdate={handleQuickTagUpdate}
                  disabled={updatingTags && selectedTransactionId === transaction.id}
                />
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleEditClick(transaction)}
                    sx={{ color: 'primary.main' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
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
      
      {/* Edit Dialog */}
      <TransactionEdit
        open={!!editTransaction}
        transaction={editTransaction}
        onClose={handleEditClose}
        onSave={handleTransactionUpdated}
        onDelete={handleTransactionDeleted}
        onError={handleError}
      />
      
      
      
      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
    </Box>
  );
};

export default TransactionList;