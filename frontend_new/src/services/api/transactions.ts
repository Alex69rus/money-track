import { apiRequest } from "@/services/api/client";
import type { PaginatedTransactionsDto } from "@/services/api/dto";
import { mapPaginatedTransactions } from "@/services/api/mappers";
import type { PaginatedTransactions, TransactionsQueryFilters } from "@/types/transactions";

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

  if (options.text) {
    params.set("text", options.text);
  }

  appendNumberParam(params, "minAmount", options.minAmount);
  appendNumberParam(params, "maxAmount", options.maxAmount);

  if (options.tags && options.tags.length > 0) {
    params.set("tags", options.tags.join(","));
  }

  const response = await apiRequest<PaginatedTransactionsDto>(`/api/transactions?${params.toString()}`, {
    signal,
  });

  return mapPaginatedTransactions(response);
}
