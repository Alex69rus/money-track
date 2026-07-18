import { apiRequest } from "@/services/api/client";
import type {
  CategoryBreakdownDto,
  MonthlyBreakdownDto,
  TagBreakdownDto,
  TransactionSummaryDto,
} from "@/services/api/dto";
import {
  mapCategoryBreakdown,
  mapMonthlyBreakdown,
  mapTagBreakdown,
  mapTransactionSummary,
} from "@/services/api/mappers";
import type {
  AnalyticsSummaryStats,
  CategorySpendingItem,
  MonthlyTrendItem,
  TagSpendingItem,
} from "@/features/analytics/types";

interface AnalyticsTransactionsRequest {
  fromDate: string;
  toDate: string;
}

function toSearchParams(request: AnalyticsTransactionsRequest): URLSearchParams {
  const params = new URLSearchParams();

  if (request.fromDate) {
    params.set("fromDate", request.fromDate);
  }

  if (request.toDate) {
    params.set("toDate", request.toDate);
  }

  return params;
}

function analyticsPath(resource: string, request: AnalyticsTransactionsRequest): string {
  const query = toSearchParams(request).toString();
  return `/api/transactions/${resource}${query ? `?${query}` : ""}`;
}

export async function fetchTransactionSummary(
  request: AnalyticsTransactionsRequest,
  signal?: AbortSignal,
): Promise<AnalyticsSummaryStats> {
  const response = await apiRequest<TransactionSummaryDto>(analyticsPath("summary", request), { signal });
  return mapTransactionSummary(response);
}

export async function fetchCategoryBreakdown(
  request: AnalyticsTransactionsRequest,
  signal?: AbortSignal,
): Promise<CategorySpendingItem[]> {
  const response = await apiRequest<CategoryBreakdownDto>(analyticsPath("by-categories", request), { signal });
  return mapCategoryBreakdown(response);
}

export async function fetchTagBreakdown(
  request: AnalyticsTransactionsRequest,
  signal?: AbortSignal,
): Promise<TagSpendingItem[]> {
  const response = await apiRequest<TagBreakdownDto>(analyticsPath("by-tags", request), { signal });
  return mapTagBreakdown(response);
}

export async function fetchMonthlyBreakdown(
  request: AnalyticsTransactionsRequest,
  signal?: AbortSignal,
): Promise<MonthlyTrendItem[]> {
  const response = await apiRequest<MonthlyBreakdownDto>(analyticsPath("by-months", request), { signal });
  return mapMonthlyBreakdown(response);
}
