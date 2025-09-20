import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Grid
} from '@mui/material';
import { DateRange as DateRangeIcon, Clear as ClearIcon } from '@mui/icons-material';

interface DateFilter {
  startDate: string;
  endDate: string;
}

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onDateChange: (filter: DateFilter) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onDateChange
}) => {
  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = event.target.value;
    onDateChange({
      startDate: newStartDate,
      endDate
    });
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = event.target.value;
    onDateChange({
      startDate,
      endDate: newEndDate
    });
  };

  const handleClear = () => {
    onDateChange({
      startDate: '',
      endDate: ''
    });
  };

  // Validate that start date is not after end date
  const isValidDateRange = !startDate || !endDate || startDate <= endDate;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <DateRangeIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Date Range Filter
          </Typography>
        </Box>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
              error={!isValidDateRange}
              helperText={!isValidDateRange ? 'Start date must be before end date' : ''}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
              error={!isValidDateRange}
              helperText={!isValidDateRange ? 'End date must be after start date' : ''}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <Button
              variant="outlined"
              onClick={handleClear}
              startIcon={<ClearIcon />}
              disabled={!startDate && !endDate}
              fullWidth
              sx={{ height: '56px' }}
            >
              Clear Filter
            </Button>
          </Grid>
        </Grid>

        {(startDate || endDate) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {startDate && endDate
                ? `Showing data from ${startDate} to ${endDate}`
                : startDate
                ? `Showing data from ${startDate} onwards`
                : `Showing data up to ${endDate}`
              }
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DateRangeFilter;