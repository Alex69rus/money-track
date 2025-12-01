import { useState, useEffect } from 'react';
import { Transaction, ApiError, TransactionFilters } from '../types';
import ApiService from '../services/api';
import { MockApiService } from '../services/mockApi';

interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  refetch: () => Promise<void>;
}

export const useTransactions = (
  filters?: TransactionFilters,
  refreshTrigger?: number
): UseTransactionsResult => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      // Use mock data for testing when backend is not available
      try {
        const apiService = ApiService.getInstance();
        const data = await apiService.getTransactions(filters);
        setTransactions(data);
      } catch (apiError) {
        console.log('Backend not available, using mock data for testing filters');
        const mockData = await MockApiService.getTransactions(filters);
        setTransactions(mockData);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions on mount and when filters change
  useEffect(() => {
    const abortController = new AbortController();

    const loadTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        // Use mock data for testing when backend is not available
        try {
          const apiService = ApiService.getInstance();
          const data = await apiService.getTransactions(filters);
          if (!abortController.signal.aborted) {
            setTransactions(data);
          }
        } catch (apiError) {
          if (!abortController.signal.aborted) {
            console.log('Backend not available, using mock data for testing filters');
            const mockData = await MockApiService.getTransactions(filters);
            setTransactions(mockData);
          }
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          const apiError = err as ApiError;
          setError(apiError.message || 'Failed to load transactions');
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadTransactions();
    return () => abortController.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, filters]);

  return {
    transactions,
    loading,
    error,
    setTransactions,
    refetch: fetchTransactions
  };
};
