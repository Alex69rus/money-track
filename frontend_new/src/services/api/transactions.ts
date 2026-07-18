import {
  apiRequest,
  canUseControlledFallbackMode,
  isNetworkApiRequestError,
} from "@/services/api/client";
import type { PaginatedTransactionsDto, TransactionDto } from "@/services/api/dto";
import { listFallbackTransactions } from "@/services/api/fallback-data";
import { activateFallbackMode } from "@/services/api/fallback-mode";
import { mapPaginatedTransactions, mapTransaction } from "@/services/api/mappers";
import type {
  PaginatedTransactions,
  Transaction,
  TransactionsQueryFilters,
  UpdateTransactionPayload,
} from "@/types/transactions";

interface ListTransactionsParams extends TransactionsQueryFilters {
  skip?: number;
  take?: number;
}

function appendNumberParam(params: URLSearchParams, key: string, value?: number): void {
  if (value === undefined || Number.isNaN(value)) {
    return;
  }

  params.set(key, value.toString());
}

export async function listTransactions(
  options: ListTransactionsParams,
  signal?: AbortSignal,
): Promise<PaginatedTransactions> {
  const params = new URLSearchParams();

  params.set("skip", String(options.skip ?? 0));
  params.set("take", String(options.take ?? 50));

  if (options.fromDate) {
    params.set("fromDate", options.fromDate);
  }

  if (options.toDate) {
    params.set("toDate", options.toDate);
  }

  if (options.categoryId !== undefined) {
    params.set("categoryId", String(options.categoryId));
  }

  if (options.uncategorized) {
    params.set("uncategorized", "true");
  }

  if (options.text) {
    params.set("text", options.text);
  }

  appendNumberParam(params, "minAmount", options.minAmount);
  appendNumberParam(params, "maxAmount", options.maxAmount);

  if (options.tags && options.tags.length > 0) {
    params.set("tags", options.tags.join(","));
  }

  if (options.tag) {
    params.set("tag", options.tag);
  }

  if (options.flow) {
    params.set("flow", options.flow);
  }

  if (options.calculationCurrencyOnly) {
    params.set("calculationCurrencyOnly", "true");
  }

  try {
    const response = await apiRequest<PaginatedTransactionsDto>(`/api/transactions?${params.toString()}`, {
      signal,
    });

    return mapPaginatedTransactions(response);
  } catch (error) {
    if (canUseControlledFallbackMode() && isNetworkApiRequestError(error)) {
      activateFallbackMode("Backend is unreachable. Showing local fallback data.");
      return listFallbackTransactions(options);
    }

    throw error;
  }
}

export async function updateTransaction(
  transactionId: number,
  payload: UpdateTransactionPayload,
  signal?: AbortSignal,
): Promise<Transaction> {
  const response = await apiRequest<TransactionDto>(`/api/transactions/${transactionId}`, {
    body: JSON.stringify(payload),
    method: "PUT",
    signal,
  });

  return mapTransaction(response);
}

export async function deleteTransaction(transactionId: number, signal?: AbortSignal): Promise<void> {
  await apiRequest<void>(`/api/transactions/${transactionId}`, {
    method: "DELETE",
    signal,
  });
}
