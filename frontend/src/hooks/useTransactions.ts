import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, ApiError, TransactionFilters } from '../types';
import ApiService from '../services/api';
import { MockApiService } from '../services/mockApi';

interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export const useTransactions = (
  filters?: TransactionFilters,
  refreshTrigger?: number
): UseTransactionsResult => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreAbortControllerRef = useRef<AbortController | null>(null);

  const PAGE_SIZE = 50;

  // Refetch from beginning (used when filters change or manual refetch)
  const fetchTransactions = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setSkip(0);
      // Use mock data for testing when backend is not available
      try {
        const apiService = ApiService.getInstance();
        const response = await apiService.getTransactions(filters, 0, PAGE_SIZE);
        setTransactions(response.data);
        setHasMore(response.hasMore);
        setSkip(PAGE_SIZE);
      } catch (apiError) {
        console.log('Backend not available, using mock data for testing filters');
        const mockData = await MockApiService.getTransactions(filters);
        setTransactions(mockData);
        setHasMore(false);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Load more transactions (infinite scroll)
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || loadingMore || loading) {
      return;
    }

    // Cancel any pending loadMore request
    if (loadMoreAbortControllerRef.current) {
      loadMoreAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    loadMoreAbortControllerRef.current = abortController;

    try {
      setLoadingMore(true);
      setError(null);

      const apiService = ApiService.getInstance();
      const response = await apiService.getTransactions(filters, skip, PAGE_SIZE, abortController.signal);

      if (!abortController.signal.aborted) {
        setTransactions(prev => [...prev, ...response.data]);
        setHasMore(response.hasMore);
        setSkip(prev => prev + PAGE_SIZE);
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to load more transactions');
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoadingMore(false);
      }
      loadMoreAbortControllerRef.current = null;
    }
  }, [hasMore, loadingMore, loading, skip, filters]);

  // Fetch transactions on mount and when filters change
  useEffect(() => {
    // Cancel any pending loadMore request when filters change
    if (loadMoreAbortControllerRef.current) {
      loadMoreAbortControllerRef.current.abort();
      loadMoreAbortControllerRef.current = null;
    }

    const abortController = new AbortController();

    const loadTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        setSkip(0);
        // Use mock data for testing when backend is not available
        try {
          const apiService = ApiService.getInstance();
          const response = await apiService.getTransactions(filters, 0, PAGE_SIZE, abortController.signal);
          if (!abortController.signal.aborted) {
            setTransactions(response.data);
            setHasMore(response.hasMore);
            setSkip(PAGE_SIZE);
          }
        } catch (apiError) {
          if (!abortController.signal.aborted) {
            console.log('Backend not available, using mock data for testing filters');
            const mockData = await MockApiService.getTransactions(filters);
            setTransactions(mockData);
            setHasMore(false);
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
    return () => {
      abortController.abort();
      // Also abort any pending loadMore requests
      if (loadMoreAbortControllerRef.current) {
        loadMoreAbortControllerRef.current.abort();
        loadMoreAbortControllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, filters]);

  return {
    transactions,
    loading,
    loadingMore,
    error,
    hasMore,
    setTransactions,
    refetch: fetchTransactions,
    loadMore
  };
};
