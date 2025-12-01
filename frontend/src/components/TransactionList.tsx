import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Skeleton,
  Alert,
  Button,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Stack,
  Snackbar,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { Transaction, TransactionFilters, Category } from '../types';
import EmptyState from './EmptyState';
import TransactionEdit from './TransactionEdit';
import TransactionMobileCard from './TransactionMobileCard';
import TransactionDesktopTable from './TransactionDesktopTable';
import { useTransactions } from '../hooks/useTransactions';
import { useQuickUpdate } from '../hooks/useQuickUpdate';

interface TransactionListProps {
  refreshTrigger?: number;
  filters?: TransactionFilters;
  categories: Category[];
}

const TransactionList: React.FC<TransactionListProps> = ({ refreshTrigger = 0, filters, categories }) => {
  const { transactions, loading, error, setTransactions, refetch } = useTransactions(filters, refreshTrigger);
  const { updateCategory, updateTags, updatingCategory, updatingTags, selectedTransactionId } = useQuickUpdate();

  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleRetry = () => {
    refetch();
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditTransaction(transaction);
  };

  const handleEditClose = () => {
    setEditTransaction(null);
  };

  const handleCategorySelect = async (categoryId: string | number | number[], transactionId: number) => {
    try {
      const updatedTransaction = await updateCategory(categoryId, transactionId, transactions);
      if (updatedTransaction) {
        setTransactions(prev =>
          prev.map(t => t.id === transactionId ? updatedTransaction : t)
        );
        setSnackbarMessage('Category updated successfully');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage('Failed to update category');
      setSnackbarOpen(true);
    }
  };

  const handleQuickTagUpdate = async (transactionId: number, newTags: string[]) => {
    try {
      const updatedTransaction = await updateTags(transactionId, newTags, transactions);
      if (updatedTransaction) {
        setTransactions(prev =>
          prev.map(t => t.id === transactionId ? updatedTransaction : t)
        );
        setSnackbarMessage('Tags updated successfully');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage('Failed to update tags');
      setSnackbarOpen(true);
      throw error; // Re-throw for QuickTagSelector error handling
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
            aria-label="Retry loading transactions"
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

  return (
    <Box>
      {isMobile ? (
        <Stack spacing={0}>
          {transactions.map((transaction) => (
            <TransactionMobileCard
              key={transaction.id}
              transaction={transaction}
              categories={categories}
              onEditClick={handleEditClick}
              onCategorySelect={handleCategorySelect}
              onTagsUpdate={handleQuickTagUpdate}
              updatingCategory={updatingCategory}
              updatingTags={updatingTags}
              selectedTransactionId={selectedTransactionId}
            />
          ))}
        </Stack>
      ) : (
        <TransactionDesktopTable
          transactions={transactions}
          categories={categories}
          onEditClick={handleEditClick}
          onCategorySelect={handleCategorySelect}
          onTagsUpdate={handleQuickTagUpdate}
          updatingCategory={updatingCategory}
          updatingTags={updatingTags}
          selectedTransactionId={selectedTransactionId}
        />
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
