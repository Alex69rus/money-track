import React, { useState } from 'react';
import { Container, Typography, Box } from '@mui/material';
import TransactionList from '../components/TransactionList';
import TransactionFilters from '../components/filters/TransactionFilters';
import { FilterState, TransactionFilters as TTransactionFilters } from '../types';

const Transactions: React.FC = () => {
  const [filterState, setFilterState] = useState<FilterState>({
    dateRange: { startDate: null, endDate: null },
    categories: [],
    tags: [],
    amountRange: { min: null, max: null },
    searchText: '',
  });

  const [appliedFilters, setAppliedFilters] = useState<TTransactionFilters>({});

  const handleFiltersChange = (filters: FilterState) => {
    setFilterState(filters);
  };

  const handleApplyFilters = (filters: TTransactionFilters) => {
    setAppliedFilters(filters);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        Transactions
      </Typography>

      <Box sx={{ mt: 3 }}>
        <TransactionFilters
          filters={filterState}
          onFiltersChange={handleFiltersChange}
          onApplyFilters={handleApplyFilters}
        />
        <TransactionList filters={appliedFilters} />
      </Box>
    </Container>
  );
};

export default Transactions;