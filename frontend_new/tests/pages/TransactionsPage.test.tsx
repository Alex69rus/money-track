import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionsPage } from "@/pages/TransactionsPage";
import type { Category, Transaction } from "@/types/transactions";

const { fetchCategories, fetchTags, useTransactionSummary } = vi.hoisted(() => ({
  fetchCategories: vi.fn(),
  fetchTags: vi.fn(),
  useTransactionSummary: vi.fn(),
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

const categories: Category[] = [
  {
    id: 11,
    name: "Groceries",
    type: "EXPENSE",
    color: "#22c55e",
    icon: "shopping_cart",
    parentCategoryId: null,
    orderIndex: 1,
    createdAt: new Date("2026-07-12T09:15:00"),
  },
  {
    id: 12,
    name: "Salary",
    type: "INCOME",
    color: "#2d8cff",
    icon: "payments",
    parentCategoryId: null,
    orderIndex: 2,
    createdAt: new Date("2026-07-12T09:15:00"),
  },
];

vi.mock("@/features/analytics/hooks/useAnalyticsResources", () => ({
  useTransactionSummary,
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

vi.mock("@/services/api/categories", () => ({ fetchCategories }));
vi.mock("@/services/api/tags", () => ({ fetchTags }));

describe("TransactionsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00"));
    fetchCategories.mockReset();
    fetchCategories.mockImplementation(() => new Promise<never>(() => undefined));
    fetchTags.mockReset();
    fetchTags.mockImplementation(() => new Promise<never>(() => undefined));
    useTransactionSummary.mockReset();
    useTransactionSummary.mockReturnValue({
      data: {
        totalIncome: "100.00",
        totalExpenses: "25.50",
        balance: "74.50",
        transactionCount: 2,
      },
      error: null,
      loading: false,
      retry: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the shared backend current-month summary for the snapshot and omits the retired list header", () => {
    render(
      <MemoryRouter initialEntries={["/transactions"]}>
        <TransactionsPage />
      </MemoryRouter>,
    );

    expect(useTransactionSummary).toHaveBeenCalledWith({ fromDate: "2026-07-01", toDate: "2026-07-31" });
    expect(screen.getByTestId("transactions-balance-value")).toHaveTextContent("74.50");
    expect(screen.getByTestId("transactions-monthly-income")).toHaveTextContent("100.00");
    expect(screen.getByTestId("transactions-monthly-expense")).toHaveTextContent("25.50");
    expect(screen.queryByText("Recent Transactions", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("2392 records", { exact: true })).not.toBeInTheDocument();
  });

  it("limits quick category updates to the transaction direction", async () => {
    vi.useRealTimers();
    fetchCategories.mockResolvedValue(categories);
    fetchTags.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={["/transactions/1/category"]}>
        <TransactionsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("tx-category-option-11")).toHaveTextContent("Groceries");
    });

    expect(screen.queryByTestId("tx-category-option-12")).not.toBeInTheDocument();
  });
});
