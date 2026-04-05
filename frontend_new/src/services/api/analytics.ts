import { listTransactions } from "@/services/api/transactions";
import type { Transaction } from "@/types/transactions";

interface AnalyticsTransactionsRequest {
  fromDate: string;
  toDate: string;
}

const PAGE_SIZE = 500;

export async function fetchAnalyticsTransactions(
  request: AnalyticsTransactionsRequest,
  signal?: AbortSignal,
): Promise<Transaction[]> {
  const collected: Transaction[] = [];
  let skip = 0;

  while (true) {
    const page = await listTransactions(
      {
        fromDate: request.fromDate,
        toDate: request.toDate,
        skip,
        take: PAGE_SIZE,
      },
      signal,
    );

    collected.push(...page.data);

    if (!page.hasMore || page.data.length === 0) {
      break;
    }

    skip = page.skip + page.data.length;
  }

  return collected;
}
