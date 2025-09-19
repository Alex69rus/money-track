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
  IconButton,
  Snackbar,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { Transaction, ApiError, TransactionFilters, Category, UpdateTransactionRequest } from '../types';
import ApiService from '../services/api';
import { MockApiService } from '../services/mockApi';
import { formatDateTime, formatCurrency, getCurrencyColor } from '../utils/formatters';
import EmptyState from './EmptyState';
import TransactionEdit from './TransactionEdit';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

interface TransactionListProps {
  refreshTrigger?: number;
  filters?: TransactionFilters;
}

const TransactionList: React.FC<TransactionListProps> = ({ refreshTrigger = 0, filters }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [updatingCategory, setUpdatingCategory] = useState(false);
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

      // Amount range filter (ignore sign - filter by absolute value)
      if (filters.minAmount !== undefined && Math.abs(transaction.amount) < filters.minAmount) return false;
      if (filters.maxAmount !== undefined && Math.abs(transaction.amount) > filters.maxAmount) return false;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, filters]);

  const handleRetry = () => {
    fetchTransactions();
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditTransaction(transaction);
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setDeleteTransaction(transaction);
  };

  const handleEditClose = () => {
    setEditTransaction(null);
  };

  const handleDeleteClose = () => {
    setDeleteTransaction(null);
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
        { id: 1, name: 'Groceries', type: 'expense' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Salary', type: 'income' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 3, name: 'Entertainment', type: 'expense' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 4, name: 'Transportation', type: 'expense' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 5, name: 'Utilities', type: 'expense' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 6, name: 'Healthcare', type: 'expense' as const, createdAt: '2024-01-01T00:00:00Z' },
      ];
      setCategories(mockCategories);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleQuickCategoryClick = (event: React.MouseEvent<HTMLElement>, transactionId: number) => {
    setCategoryMenuAnchor(event.currentTarget);
    setSelectedTransactionId(transactionId);
  };

  const handleCategoryMenuClose = () => {
    setCategoryMenuAnchor(null);
    setSelectedTransactionId(null);
  };

  const handleCategorySelect = async (categoryId: number) => {
    if (!selectedTransactionId) return;

    // Find the current transaction to get all its fields
    const currentTransaction = transactions.find(t => t.id === selectedTransactionId);
    if (!currentTransaction) return;

    try {
      setUpdatingCategory(true);
      const apiService = ApiService.getInstance();
      
      // Create the update request object with ALL required fields - backend doesn't support partial updates
      const updateRequest: UpdateTransactionRequest = {
        transactionDate: currentTransaction.transactionDate,
        amount: currentTransaction.amount,
        note: currentTransaction.note,
        categoryId: categoryId,
        tags: currentTransaction.tags,
        currency: currentTransaction.currency
      };
      
      // Update the transaction with the selected category
      const updatedTransaction = await apiService.updateTransaction(selectedTransactionId, updateRequest);
      
      // Update the local state with the full updated transaction
      setTransactions(prev => 
        prev.map(t => 
          t.id === selectedTransactionId ? updatedTransaction : t
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
      handleCategoryMenuClose();
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
    <Card key={transaction.id} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(transaction.transactionDate)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography 
              variant="h6" 
              color={getCurrencyColor(transaction.amount)}
              sx={{ fontWeight: 'bold' }}
            >
              {transaction.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), transaction.currency)}
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => handleEditClick(transaction)}
              sx={{ color: 'primary.main' }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleDeleteClick(transaction)}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        {transaction.category ? (
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Category:</strong> {transaction.category.name}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Category:</strong>
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => handleQuickCategoryClick(e, transaction.id)}
              sx={{ 
                bgcolor: 'primary.main',
                color: 'white',
                width: 24,
                height: 24,
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
              disabled={updatingCategory && selectedTransactionId === transaction.id}
            >
              {updatingCategory && selectedTransactionId === transaction.id ? (
                <CircularProgress size={12} sx={{ color: 'white' }} />
              ) : (
                <CategoryIcon fontSize="small" />
              )}
            </IconButton>
          </Box>
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
                  color={getCurrencyColor(transaction.amount)}
                  sx={{ fontWeight: 'bold' }}
                >
                  {transaction.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                </Typography>
              </TableCell>
              <TableCell>
                {transaction.category ? (
                  <Typography variant="body2">
                    {transaction.category.name}
                  </Typography>
                ) : (
                  <IconButton
                    size="small"
                    onClick={(e) => handleQuickCategoryClick(e, transaction.id)}
                    sx={{ 
                      bgcolor: 'primary.main',
                      color: 'white',
                      width: 24,
                      height: 24,
                      '&:hover': {
                        bgcolor: 'primary.dark'
                      }
                    }}
                    disabled={updatingCategory && selectedTransactionId === transaction.id}
                  >
                    {updatingCategory && selectedTransactionId === transaction.id ? (
                      <CircularProgress size={12} sx={{ color: 'white' }} />
                    ) : (
                      <CategoryIcon fontSize="small" />
                    )}
                  </IconButton>
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
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton 
                    size="small" 
                    onClick={() => handleEditClick(transaction)}
                    sx={{ color: 'primary.main' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDeleteClick(transaction)}
                    sx={{ color: 'error.main' }}
                  >
                    <DeleteIcon fontSize="small" />
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
        onError={handleError}
      />
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!deleteTransaction}
        transaction={deleteTransaction}
        onClose={handleDeleteClose}
        onDelete={handleTransactionDeleted}
        onError={handleError}
      />
      
      {/* Category Selection Menu */}
      <Menu
        anchorEl={categoryMenuAnchor}
        open={Boolean(categoryMenuAnchor)}
        onClose={handleCategoryMenuClose}
        PaperProps={{
          style: {
            maxHeight: 300,
            width: '20ch',
          },
        }}
      >
        {categories.map((category) => (
          <MenuItem
            key={category.id}
            onClick={() => handleCategorySelect(category.id)}
            disabled={updatingCategory}
          >
            <Typography variant="body2">
              {category.name}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
      
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