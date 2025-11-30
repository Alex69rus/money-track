import React, { useState, useEffect } from 'react';
import { Container, Typography, Box } from '@mui/material';
import TransactionList from '../components/TransactionList';
import TransactionFilters from '../components/filters/TransactionFilters';
import { FilterState, TransactionFilters as TTransactionFilters, Category } from '../types';
import ApiService from '../services/api';

const Transactions: React.FC = () => {
  const [filterState, setFilterState] = useState<FilterState>({
    dateRange: { startDate: null, endDate: null },
    categories: [],
    tags: [],
    amountRange: { min: null, max: null },
    searchText: '',
  });

  const [appliedFilters, setAppliedFilters] = useState<TTransactionFilters>({});
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch categories once at the page level
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const apiService = ApiService.getInstance();
        const data = await apiService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

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
          categories={categories}
        />
        <TransactionList filters={appliedFilters} categories={categories} />
      </Box>
    </Container>
  );
};

export default Transactions;