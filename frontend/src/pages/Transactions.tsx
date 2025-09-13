import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import TransactionList from '../components/TransactionList';

const Transactions: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        Transactions
      </Typography>
      
      <Box sx={{ mt: 3 }}>
        <TransactionList />
      </Box>
    </Container>
  );
};

export default Transactions;