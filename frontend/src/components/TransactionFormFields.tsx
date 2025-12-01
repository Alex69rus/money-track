import React from 'react';
import {
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SearchableSelect from './SearchableSelect';
import TagAutocomplete from './TagAutocomplete';
import { Category } from '../types';

interface TransactionFormData {
  transactionDate: string;
  amount: string;
  note: string;
  categoryId: string;
  tags: string[];
  currency: string;
}

interface TransactionFormFieldsProps {
  formData: TransactionFormData;
  categories: Category[];
  loading: boolean;
  onChange: (updates: Partial<TransactionFormData>) => void;
}

const TransactionFormFields: React.FC<TransactionFormFieldsProps> = ({
  formData,
  categories,
  loading,
  onChange,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
      {/* Date/Time */}
      <TextField
        label="Date & Time"
        type="datetime-local"
        value={formData.transactionDate}
        onChange={(e) => onChange({ transactionDate: e.target.value })}
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
            onChange={(e) => onChange({ currency: e.target.value })}
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
          onChange={(e) => onChange({ amount: e.target.value })}
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
        onChange={(value) => onChange({ categoryId: value as string })}
        placeholder="Search categories..."
        label="Category"
        size="small"
        loading={loading}
        transactionAmount={parseFloat(formData.amount) || 0}
      />

      {/* Tags */}
      <TagAutocomplete
        value={formData.tags}
        onChange={(newTags) => onChange({ tags: newTags })}
        placeholder="Add tags..."
        disabled={loading}
        size="small"
        label="Tags"
      />

      {/* Note */}
      <TextField
        label="Note"
        value={formData.note}
        onChange={(e) => onChange({ note: e.target.value })}
        fullWidth
        multiline
        rows={2}
        size="small"
        placeholder="Add a note about this transaction..."
      />
    </Box>
  );
};

export default TransactionFormFields;
