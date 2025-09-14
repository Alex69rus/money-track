import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Autocomplete,
  Chip,
  InputAdornment,
} from '@mui/material';
import { Transaction, Category, UpdateTransactionRequest, ApiError } from '../types';
import ApiService from '../services/api';
import { MockApiService } from '../services/mockApi';

interface TransactionEditProps {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (updatedTransaction: Transaction) => void;
  onError: (error: string) => void;
}

const TransactionEdit: React.FC<TransactionEditProps> = ({
  open,
  transaction,
  onClose,
  onSave,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    transactionDate: '',
    amount: '',
    note: '',
    categoryId: '',
    tags: [] as string[],
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
        amount: Math.abs(transaction.amount).toString(),
        note: transaction.note || '',
        categoryId: transaction.categoryId?.toString() || '',
        tags: transaction.tags || [],
      });
    }
  }, [transaction]);

  const handleSubmit = async () => {
    if (!transaction) return;

    try {
      setLoading(true);

      const updateRequest: UpdateTransactionRequest = {
        transactionDate: formData.transactionDate ? new Date(formData.transactionDate).toISOString() : undefined,
        amount: parseFloat(formData.amount) * (transaction.amount < 0 ? -1 : 1), // Preserve sign
        note: formData.note || undefined,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
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
      onClose();
    }
  };

  const isFormValid = () => {
    return formData.transactionDate && 
           formData.amount && 
           !isNaN(parseFloat(formData.amount)) &&
           parseFloat(formData.amount) > 0;
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Transaction
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Original: {transaction.amount >= 0 ? '+' : '-'}
            {Math.abs(transaction.amount).toFixed(2)} {transaction.currency}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Date/Time */}
            <TextField
              label="Transaction Date & Time"
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

            {/* Amount */}
            <TextField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              fullWidth
              size="small"
              error={!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0}
              helperText={
                !formData.amount ? 'Amount is required' :
                isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0 ? 'Amount must be a positive number' : ''
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {transaction.currency}
                  </InputAdornment>
                ),
              }}
            />

            {/* Category */}
            <FormControl size="small" fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.categoryId}
                label="Category"
                onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
              >
                <MenuItem value="">
                  <em>Uncategorized</em>
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Tags */}
            <Autocomplete
              multiple
              freeSolo
              options={[]} // Could be populated with existing tags from API
              value={formData.tags}
              onChange={(_, newValue) => setFormData(prev => ({ ...prev, tags: newValue }))}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    size="small"
                    {...getTagProps({ index })}
                    key={index}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Add tags..."
                  size="small"
                  helperText="Press Enter to add a tag"
                />
              )}
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

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !isFormValid()}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
  );
};

export default TransactionEdit;