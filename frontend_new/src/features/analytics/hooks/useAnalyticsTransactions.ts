import { useCallback, useEffect, useState } from "react";
import { ApiRequestError } from "@/services/api/client";
import { fetchAnalyticsTransactions } from "@/services/api/analytics";
import type { AnalyticsDateRange } from "@/features/analytics/types";
import type { Transaction } from "@/types/transactions";

interface UseAnalyticsTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useAnalyticsTransactions(dateRange: AnalyticsDateRange): UseAnalyticsTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryIndex, setRetryIndex] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();

    const loadAnalytics = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchAnalyticsTransactions(
          {
            fromDate: dateRange.fromDate,
            toDate: dateRange.toDate,
          },
          abortController.signal,
        );

        if (abortController.signal.aborted) {
          return;
        }

        setTransactions(data);
      } catch (requestError) {
        if (isAbortError(requestError)) {
          return;
        }

        if (!abortController.signal.aborted) {
          setTransactions([]);
          setError(toErrorMessage(requestError, "Failed to load analytics. Please retry."));
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadAnalytics();

    return () => {
      abortController.abort();
    };
  }, [dateRange.fromDate, dateRange.toDate, retryIndex]);

  const retry = useCallback(() => {
    setRetryIndex((current) => current + 1);
  }, []);

  return {
    transactions,
    loading,
    error,
    retry,
  };
}
