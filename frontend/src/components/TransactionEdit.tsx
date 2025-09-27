import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { Transaction, Category, UpdateTransactionRequest, ApiError } from '../types';
import ApiService from '../services/api';
import { MockApiService } from '../services/mockApi';
import SearchableSelect from './SearchableSelect';
import TagAutocomplete from './TagAutocomplete';

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
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    transactionDate: '',
    amount: '',
    note: '',
    categoryId: '',
    tags: [] as string[],
    currency: '',
  });

  // Helper function to convert Date to datetime-local format
  const formatDateTimeLocal = (date: string | Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const apiService = ApiService.getInstance();
        const data = await apiService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Backend not available, using mock categories:', error);
        // Fallback to mock data when API is not available
        const mockData = await MockApiService.getCategories();
        setCategories(mockData);
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open]);

  // Initialize form data when transaction changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        transactionDate: formatDateTimeLocal(transaction.transactionDate),
        amount: transaction.amount.toString(),
        note: transaction.note || '',
        categoryId: transaction.categoryId?.toString() || '',
        tags: transaction.tags || [],
        currency: transaction.currency || 'AED',
      });
    }
  }, [transaction]);

  const handleSubmit = async () => {
    if (!transaction) return;

    try {
      setLoading(true);

      const updateRequest: UpdateTransactionRequest = {
        transactionDate: formData.transactionDate ? new Date(formData.transactionDate).toISOString() : transaction.transactionDate,
        amount: parseFloat(formData.amount),
        note: formData.note || undefined,
        categoryId: formData.categoryId && formData.categoryId !== '0' ? parseInt(formData.categoryId) : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        currency: formData.currency, // Use currency from form
      };

      const apiService = ApiService.getInstance();
      const updatedTransaction = await apiService.updateTransaction(transaction.id, updateRequest);
      
      onSave(updatedTransaction);
      onClose();
    } catch (error) {
      const apiError = error as ApiError;
      onError(apiError.message || 'Failed to update transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transaction || !onDelete) return;

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
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const isFormValid = () => {
    return formData.transactionDate &&
           formData.amount &&
           !isNaN(parseFloat(formData.amount)) &&
           parseFloat(formData.amount) !== 0;
  };

  if (!transaction) return null;

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Transaction
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Date/Time */}
            <TextField
              label="Date & Time"
              type="datetime-local"
              value={formData.transactionDate}
              onChange={(e) => setFormData(prev => ({ ...prev, transactionDate: e.target.value }))}
              fullWidth
              size="small"
              error={!formData.transactionDate}
              helperText={!formData.transactionDate ? 'Date and time are required' : ''}
              InputLabelProps={{
                shrink: true,
              }}
            />

            {/* Amount and Currency */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel id="currency-label">Currency</InputLabel>
                <Select
                  labelId="currency-label"
                  id="currency-select"
                  value={formData.currency}
                  label="Currency"
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  disabled={loading}
                >
                  <MenuItem value="AED">AED</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="RUB">RUB</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                size="small"
                error={!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) === 0}
                helperText={
                  !formData.amount ? 'Amount is required' :
                  isNaN(parseFloat(formData.amount)) ? 'Amount must be a valid number' :
                  parseFloat(formData.amount) === 0 ? 'Amount cannot be zero' : ''
                }
                sx={{ flex: 1 }}
              />
            </Box>

            {/* Category */}
            <SearchableSelect
              categories={[{ id: 0, name: 'Uncategorized', type: 'Expense', createdAt: '' }, ...categories]}
              value={formData.categoryId}
              onChange={(value) => setFormData(prev => ({ ...prev, categoryId: value as string }))}
              placeholder="Search categories..."
              label="Category"
              size="small"
              loading={loading}
              transactionAmount={parseFloat(formData.amount) || 0}
            />

            {/* Tags */}
            <TagAutocomplete
              value={formData.tags}
              onChange={(newTags) => setFormData(prev => ({ ...prev, tags: newTags }))}
              placeholder="Add tags..."
              disabled={loading}
              size="small"
              label="Tags"
            />

            {/* Note */}
            <TextField
              label="Note"
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              size="small"
              placeholder="Add a note about this transaction..."
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2, justifyContent: 'space-between' }}>
          <Box>
            {onDelete && (
              <Button
                onClick={handleDeleteClick}
                color="error"
                startIcon={<DeleteIcon />}
                disabled={loading}
              >
                Delete
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading || !isFormValid()}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onClose={handleDeleteCancel}>
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
          <Button onClick={handleDeleteCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
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