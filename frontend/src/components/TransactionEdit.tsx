import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { Transaction } from '../types';
import { useCategories } from '../hooks/useCategories';
import { useTransactionForm } from '../hooks/useTransactionForm';
import { useStableViewport } from '../hooks/useStableViewport';
import TransactionFormFields from './TransactionFormFields';

interface TransactionEditProps {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (updatedTransaction: Transaction) => void;
  onDelete?: (transactionId: number) => void;
  onError: (error: string) => void;
}

const TransactionEdit: React.FC<TransactionEditProps> = ({
  open,
  transaction,
  onClose,
  onSave,
  onDelete,
  onError,
}) => {
  const { categories } = useCategories();
  const { stableHeight } = useStableViewport();

  const {
    formData,
    loading,
    showDeleteConfirm,
    setFormData,
    setShowDeleteConfirm,
    isFormValid,
    handleSubmit,
    handleDelete,
  } = useTransactionForm(transaction, onSave, onDelete, onError, onClose);

  // Handle keyboard focus to scroll input into view
  useEffect(() => {
    if (!open) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Small delay to let keyboard animation complete
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, [open]);

  const handleClose = () => {
    if (!loading) {
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const handleFormChange = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  if (!transaction) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: {
              xs: `${stableHeight - 16}px`, // Use stable height on mobile to prevent keyboard shift
              sm: '90vh' // Keep 90vh for desktop
            },
            margin: { xs: 1, sm: 2 },
            borderRadius: { xs: '16px', sm: '16px' },
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        <DialogTitle sx={{ flexShrink: 0 }}>
          Edit Transaction
        </DialogTitle>

        <DialogContent
          sx={{
            overflowY: 'auto',
            flexGrow: 1,
            flexShrink: 1,
            pb: 1,
            scrollPaddingBottom: '120px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <TransactionFormFields
            formData={formData}
            categories={categories}
            loading={loading}
            onChange={handleFormChange}
          />
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            pt: 1.5,
            flexShrink: 0,
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            gap: 1
          }}
        >
          <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {onDelete && (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                color="error"
                startIcon={<DeleteIcon />}
                disabled={loading}
                fullWidth
                size="medium"
              >
                Delete
              </Button>
            )}
          </Box>
          <Box sx={{
            display: 'flex',
            gap: 1,
            width: { xs: '100%', sm: 'auto' },
            flexDirection: { xs: 'column-reverse', sm: 'row' }
          }}>
            <Button
              onClick={handleClose}
              disabled={loading}
              fullWidth
              size="medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading || !isFormValid()}
              fullWidth
              size="medium"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <DialogTitle>Delete Transaction</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this transaction?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {transaction && (
              `${transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(2)} ${transaction.currency}`
            )}
          </Typography>
          {transaction?.note && (
            <Typography variant="body2" color="text.secondary">
              {transaction.note}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TransactionEdit;
