import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionsPage } from "@/pages/TransactionsPage";
import type { Transaction } from "@/types/transactions";

const { useAnalyticsTransactions } = vi.hoisted(() => ({
  useAnalyticsTransactions: vi.fn(),
}));

const listedTransaction: Transaction = {
  id: 1,
  userId: 1,
  transactionDate: new Date("2026-06-30T20:00:00"),
  amount: -900,
  note: "Older list item",
  categoryId: null,
  tags: [],
  currency: "AED",
  smsText: null,
  messageId: null,
  createdAt: new Date("2026-06-30T20:00:00"),
  category: null,
};

const listedTransactions: Transaction[] = [listedTransaction];

const currentMonthTransactions: Transaction[] = [
  {
    ...listedTransaction,
    id: 2,
    transactionDate: new Date("2026-07-01T12:00:00"),
    amount: 100,
  },
  {
    ...listedTransaction,
    id: 3,
    transactionDate: new Date("2026-07-02T12:00:00"),
    amount: -25.5,
  },
];

vi.mock("@/features/analytics/hooks/useAnalyticsTransactions", () => ({
  useAnalyticsTransactions,
}));

vi.mock("@/features/transactions/hooks/useTransactionsList", () => ({
  useTransactionsList: () => ({
    error: null,
    hasMore: false,
    loadMore: vi.fn(),
    loadMoreError: null,
    loading: false,
    loadingMore: false,
    removeTransaction: vi.fn(),
    replaceTransaction: vi.fn(),
    retryInitialLoad: vi.fn(),
    retryLoadMore: vi.fn(),
    totalCount: 2392,
    transactions: listedTransactions,
  }),
}));

vi.mock("@/services/api/categories", () => ({ fetchCategories: vi.fn(() => new Promise<never>(() => undefined)) }));
vi.mock("@/services/api/tags", () => ({ fetchTags: vi.fn(() => new Promise<never>(() => undefined)) }));

describe("TransactionsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00"));
    useAnalyticsTransactions.mockReset();
    useAnalyticsTransactions.mockReturnValue({
      error: null,
      loading: false,
      retry: vi.fn(),
      transactions: currentMonthTransactions,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the Analytics current-month model for the snapshot and omits the retired list header", () => {
    render(
      <MemoryRouter initialEntries={["/transactions"]}>
        <TransactionsPage />
      </MemoryRouter>,
    );

    expect(useAnalyticsTransactions).toHaveBeenCalledWith({ fromDate: "2026-07-01", toDate: "2026-07-31" });
    expect(screen.getByTestId("transactions-balance-value")).toHaveTextContent("74.50");
    expect(screen.getByTestId("transactions-monthly-income")).toHaveTextContent("100.00");
    expect(screen.getByTestId("transactions-monthly-expense")).toHaveTextContent("25.50");
    expect(screen.queryByText("Recent Transactions", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("2392 records", { exact: true })).not.toBeInTheDocument();
  });
});
