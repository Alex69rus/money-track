import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const Transactions: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        Transactions
      </Typography>
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Transaction list will be implemented in the next iteration
        </Typography>
      </Box>
    </Container>
  );
};

export default Transactions;