import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyticsDateRange, AnalyticsSummaryStats, CategorySpendingItem, MonthlyTrendItem, TagSpendingItem } from "@/features/analytics/types";
import {
  fetchCategoryBreakdown,
  fetchMonthlyBreakdown,
  fetchTagBreakdown,
  fetchTransactionSummary,
} from "@/services/api/analytics";
import { ApiRequestError } from "@/services/api/client";

interface AnalyticsResourceResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

type AnalyticsLoader<T> = (dateRange: AnalyticsDateRange, signal?: AbortSignal) => Promise<T>;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to load analytics. Please retry.";
}

function useAnalyticsResource<T>(
  dateRange: AnalyticsDateRange,
  load: AnalyticsLoader<T>,
  emptyData: T,
): AnalyticsResourceResult<T> {
  const [data, setData] = useState<T>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryIndex, setRetryIndex] = useState(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    activeAbortControllerRef.current?.abort();
    activeAbortControllerRef.current = abortController;

    const request = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const response = await load(
          { fromDate: dateRange.fromDate, toDate: dateRange.toDate },
          abortController.signal,
        );
        if (!abortController.signal.aborted && activeAbortControllerRef.current === abortController) {
          setData(response);
        }
      } catch (requestError) {
        if (
          !isAbortError(requestError) &&
          !abortController.signal.aborted &&
          activeAbortControllerRef.current === abortController
        ) {
          setData(emptyData);
          setError(toErrorMessage(requestError));
        }
      } finally {
        if (activeAbortControllerRef.current === abortController) {
          setLoading(false);
          activeAbortControllerRef.current = null;
        }
      }
    };

    void request();
    return () => {
      abortController.abort();
    };
  }, [dateRange.fromDate, dateRange.toDate, emptyData, load, retryIndex]);

  const retry = useCallback(() => setRetryIndex((current) => current + 1), []);
  return { data, loading, error, retry };
}

const EMPTY_SUMMARY: AnalyticsSummaryStats = {
  totalIncome: "0.00",
  totalExpenses: "0.00",
  balance: "0.00",
  transactionCount: 0,
};
const EMPTY_CATEGORIES: CategorySpendingItem[] = [];
const EMPTY_TAGS: TagSpendingItem[] = [];
const EMPTY_MONTHS: MonthlyTrendItem[] = [];

export function useTransactionSummary(dateRange: AnalyticsDateRange): AnalyticsResourceResult<AnalyticsSummaryStats> {
  return useAnalyticsResource(dateRange, fetchTransactionSummary, EMPTY_SUMMARY);
}

export function useCategoryBreakdown(dateRange: AnalyticsDateRange): AnalyticsResourceResult<CategorySpendingItem[]> {
  return useAnalyticsResource(dateRange, fetchCategoryBreakdown, EMPTY_CATEGORIES);
}

export function useTagBreakdown(dateRange: AnalyticsDateRange): AnalyticsResourceResult<TagSpendingItem[]> {
  return useAnalyticsResource(dateRange, fetchTagBreakdown, EMPTY_TAGS);
}

export function useMonthlyBreakdown(dateRange: AnalyticsDateRange): AnalyticsResourceResult<MonthlyTrendItem[]> {
  return useAnalyticsResource(dateRange, fetchMonthlyBreakdown, EMPTY_MONTHS);
}
