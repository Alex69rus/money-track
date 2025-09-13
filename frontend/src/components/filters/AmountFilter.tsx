import React from 'react';
import { Box, TextField, Typography, InputAdornment } from '@mui/material';

interface AmountFilterProps {
  minAmount: number | null;
  maxAmount: number | null;
  onMinAmountChange: (amount: number | null) => void;
  onMaxAmountChange: (amount: number | null) => void;
}

const AmountFilter: React.FC<AmountFilterProps> = ({
  minAmount,
  maxAmount,
  onMinAmountChange,
  onMaxAmountChange,
}) => {
  const handleMinAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === '') {
      onMinAmountChange(null);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        onMinAmountChange(numValue);
      }
    }
  };

  const handleMaxAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === '') {
      onMaxAmountChange(null);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        onMaxAmountChange(numValue);
      }
    }
  };

  const isMaxAmountError = minAmount !== null && maxAmount !== null && maxAmount < minAmount;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Amount Range
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          type="number"
          label="Min Amount"
          value={minAmount?.toString() || ''}
          onChange={handleMinAmountChange}
          size="small"
          InputProps={{
            startAdornment: <InputAdornment position="start">AED</InputAdornment>,
            inputProps: { min: 0, step: 0.01 }
          }}
          sx={{ minWidth: 120 }}
        />
        <Typography variant="body2" color="text.secondary">
          to
        </Typography>
        <TextField
          type="number"
          label="Max Amount"
          value={maxAmount?.toString() || ''}
          onChange={handleMaxAmountChange}
          size="small"
          error={isMaxAmountError}
          helperText={isMaxAmountError ? 'Max must be greater than min' : ''}
          InputProps={{
            startAdornment: <InputAdornment position="start">AED</InputAdornment>,
            inputProps: { min: minAmount || 0, step: 0.01 }
          }}
          sx={{ minWidth: 120 }}
        />
      </Box>
    </Box>
  );
};

export default AmountFilter;