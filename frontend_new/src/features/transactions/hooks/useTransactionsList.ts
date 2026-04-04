import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiRequestError } from "@/services/api/client";
import { listTransactions } from "@/services/api/transactions";
import type { Transaction, TransactionsQueryFilters } from "@/types/transactions";

const PAGE_SIZE = 50;

interface UseTransactionsListResult {
  transactions: Transaction[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  retryInitialLoad: () => void;
  retryLoadMore: () => void;
  loadMore: () => Promise<void>;
  replaceTransaction: (transaction: Transaction) => void;
  removeTransaction: (transactionId: number) => void;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function toErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export function useTransactionsList(filters: TransactionsQueryFilters): UseTransactionsListResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const [retryIndex, setRetryIndex] = useState(0);

  const initialAbortRef = useRef<AbortController | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);

  const normalizedFilters = useMemo<TransactionsQueryFilters>(() => {
    const tagFilters = (filters.tags ?? []).filter((tag) => tag.trim().length > 0);

    return {
      text: filters.text,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      categoryId: filters.categoryId,
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount,
      tags: tagFilters.length > 0 ? tagFilters : undefined,
    };
  }, [
    filters.categoryId,
    filters.fromDate,
    filters.maxAmount,
    filters.minAmount,
    filters.tags,
    filters.text,
    filters.toDate,
  ]);

  const loadInitialPage = useCallback(async (): Promise<void> => {
    initialAbortRef.current?.abort();
    loadMoreAbortRef.current?.abort();

    const abortController = new AbortController();
    initialAbortRef.current = abortController;

    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setLoadMoreError(null);

    try {
      const response = await listTransactions(
        {
          ...normalizedFilters,
          skip: 0,
          take: PAGE_SIZE,
        },
        abortController.signal,
      );

      if (abortController.signal.aborted) {
        return;
      }

      setTransactions(response.data);
      setTotalCount(response.totalCount);
      setHasMore(response.hasMore);
      setSkip(response.skip + response.data.length);
    } catch (requestError) {
      if (isAbortError(requestError)) {
        if (initialAbortRef.current === abortController) {
          setError("Request was interrupted. Please retry.");
          setTransactions([]);
          setTotalCount(0);
          setHasMore(false);
          setSkip(0);
        }
        return;
      }

      setTransactions([]);
      setTotalCount(0);
      setHasMore(false);
      setSkip(0);
      setError(toErrorMessage(requestError, "Failed to load transactions."));
    } finally {
      if (initialAbortRef.current === abortController) {
        setLoading(false);
        initialAbortRef.current = null;
      }
    }
  }, [normalizedFilters]);

  useEffect(() => {
    void loadInitialPage();

    return () => {
      initialAbortRef.current?.abort();
      loadMoreAbortRef.current?.abort();
    };
  }, [loadInitialPage, retryIndex]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    loadMoreAbortRef.current?.abort();

    const abortController = new AbortController();
    loadMoreAbortRef.current = abortController;

    setLoadMoreError(null);
    setLoadingMore(true);

    try {
      const response = await listTransactions(
        {
          ...normalizedFilters,
          skip,
          take: PAGE_SIZE,
        },
        abortController.signal,
      );

      if (abortController.signal.aborted) {
        return;
      }

      setTransactions((previous) => [...previous, ...response.data]);
      setTotalCount(response.totalCount);
      setHasMore(response.hasMore);
      setSkip(response.skip + response.data.length);
    } catch (requestError) {
      if (isAbortError(requestError)) {
        if (loadMoreAbortRef.current === abortController) {
          setLoadMoreError("Loading more was interrupted. Please retry.");
        }
        return;
      }

      setLoadMoreError(toErrorMessage(requestError, "Failed to load more transactions."));
    } finally {
      if (loadMoreAbortRef.current === abortController) {
        setLoadingMore(false);
        loadMoreAbortRef.current = null;
      }
    }
  }, [hasMore, loading, loadingMore, normalizedFilters, skip]);

  const retryInitialLoad = useCallback(() => {
    setRetryIndex((current) => current + 1);
  }, []);

  const retryLoadMore = useCallback(() => {
    void loadMore();
  }, [loadMore]);

  const replaceTransaction = useCallback((updatedTransaction: Transaction): void => {
    setTransactions((current) => {
      let found = false;
      const next = current.map((transaction) => {
        if (transaction.id !== updatedTransaction.id) {
          return transaction;
        }

        found = true;
        return updatedTransaction;
      });

      if (!found) {
        return current;
      }

      return next;
    });
  }, []);

  const removeTransaction = useCallback((transactionId: number): void => {
    setTransactions((current) => current.filter((transaction) => transaction.id !== transactionId));
    setTotalCount((current) => Math.max(0, current - 1));
  }, []);

  return {
    transactions,
    totalCount,
    hasMore,
    loading,
    loadingMore,
    error,
    loadMoreError,
    retryInitialLoad,
    retryLoadMore,
    loadMore,
    replaceTransaction,
    removeTransaction,
  };
}
