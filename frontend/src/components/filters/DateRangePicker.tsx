import React from 'react';
import { Box, TextField, Typography } from '@mui/material';

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onStartDateChange(value || null);
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onEndDateChange(value || null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Date Range
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          type="date"
          label="From"
          value={startDate || ''}
          onChange={handleStartDateChange}
          size="small"
          InputLabelProps={{
            shrink: true,
          }}
          sx={{ minWidth: 140 }}
        />
        <Typography variant="body2" color="text.secondary">
          to
        </Typography>
        <TextField
          type="date"
          label="To"
          value={endDate || ''}
          onChange={handleEndDateChange}
          size="small"
          InputLabelProps={{
            shrink: true,
          }}
          inputProps={{
            min: startDate || undefined,
          }}
          sx={{ minWidth: 140 }}
        />
      </Box>
    </Box>
  );
};

export default DateRangePicker;