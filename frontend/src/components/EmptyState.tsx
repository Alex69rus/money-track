import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Receipt } from '@mui/icons-material';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  title = "No transactions found",
  message = "Start by forwarding your bank SMS messages to get transaction data.",
  icon = <Receipt sx={{ fontSize: 64, color: 'text.disabled' }} />
}) => {
  return (
    <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
      <Box sx={{ mb: 2 }}>
        {icon}
      </Box>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.disabled">
        {message}
      </Typography>
    </Paper>
  );
};

export default EmptyState;