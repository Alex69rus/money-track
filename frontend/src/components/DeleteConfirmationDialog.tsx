import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { Transaction, ApiError } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import ApiService from '../services/api';

interface DeleteConfirmationDialogProps {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onDelete: (transactionId: number) => void;
  onError: (error: string) => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  transaction,
  onClose,
  onDelete,
  onError,
}) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!transaction) return;

    try {
      setLoading(true);
      const apiService = ApiService.getInstance();
      await apiService.deleteTransaction(transaction.id);
      
      onDelete(transaction.id);
      onClose();
    } catch (error) {
      const apiError = error as ApiError;
      onError(apiError.message || 'Failed to delete transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <WarningIcon color="warning" />
        Delete Transaction
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          This action cannot be undone. The transaction will be permanently deleted.
        </Alert>

        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: 1, borderColor: 'grey.200' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Transaction Details:
          </Typography>
          
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              <strong>Date:</strong> {formatDateTime(transaction.transactionDate)}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              <strong>Amount:</strong> {transaction.amount >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
            </Typography>
            {transaction.category && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <strong>Category:</strong> {transaction.category.name}
              </Typography>
            )}
            {transaction.note && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <strong>Note:</strong> {transaction.note}
              </Typography>
            )}
            {transaction.tags && transaction.tags.length > 0 && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <strong>Tags:</strong> {transaction.tags.join(', ')}
              </Typography>
            )}
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Are you sure you want to delete this transaction?
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={loading}
        >
          {loading ? 'Deleting...' : 'Delete Transaction'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;