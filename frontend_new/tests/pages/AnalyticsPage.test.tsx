import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import type { CategorySpendingItem, MonthlyTrendItem, TagSpendingItem } from "@/features/analytics/types";
import type { Transaction } from "@/types/transactions";

const categories: CategorySpendingItem[] = Array.from({ length: 7 }, (_, index) => ({
  key: `category-${index + 1}`,
  categoryId: index + 1,
  categoryName: `Category ${index + 1}`,
  amount: `${100 - index}.00`,
  transactionCount: 1,
  share: 0.1,
  icon: index === 0 ? null : "category",
  color: "#2d8cff",
}));
const tags: TagSpendingItem[] = categories.map((category, index) => ({
  key: `tag-${index + 1}`,
  tag: `tag-${index + 1}`,
  amount: category.amount,
  transactionCount: 1,
  share: category.share,
}));
const months: MonthlyTrendItem[] = categories.map((category, index) => ({
  key: `2026-${String(index + 1).padStart(2, "0")}`,
  monthLabel: `Month ${index + 1}`,
  income: "200.00",
  expenses: category.amount,
  balance: `${100 + index}.00`,
}));
const drilldownTransaction: Transaction = {
  id: 2,
  userId: 1,
  transactionDate: new Date("2026-07-12T10:00:00"),
  amount: -99,
  note: "Category 2 expense",
  categoryId: 2,
  tags: ["tag-2"],
  currency: "AED",
  smsText: null,
  messageId: null,
  createdAt: new Date("2026-07-12T10:00:00"),
  category: null,
};

const resource = <T,>(data: T) => ({ data, error: null, loading: false, retry: vi.fn() });

vi.mock("@/features/analytics/hooks/useAnalyticsResources", () => ({
  useTransactionSummary: () => resource({ totalIncome: "300.00", totalExpenses: "679.00", balance: "-379.00", transactionCount: 7 }),
  useCategoryBreakdown: () => resource(categories),
  useTagBreakdown: () => resource(tags),
  useMonthlyBreakdown: () => resource(months),
}));
vi.mock("@/features/transactions/hooks/useTransactionsList", () => ({
  useTransactionsList: () => ({
    transactions: [drilldownTransaction],
    hasMore: false,
    loading: false,
    loadingMore: false,
    error: null,
    loadMoreError: null,
    loadMore: vi.fn(),
    retryInitialLoad: vi.fn(),
    retryLoadMore: vi.fn(),
  }),
}));

function TransactionEditorRouteProbe(): JSX.Element {
  const location = useLocation();
  const state = location.state as { mtReturnPath?: string; transaction?: Transaction } | null;
  return <output data-testid="transaction-editor-route">{`${location.pathname}|${state?.mtReturnPath ?? ""}|${state?.transaction?.id ?? ""}`}</output>;
}

describe("AnalyticsPage", () => {
  it("renders server-provided widget data and omits the retired average statistic", () => {
    render(<MemoryRouter initialEntries={["/analytics"]}><AnalyticsPage /></MemoryRouter>);

    expect(screen.getAllByTestId(/^analytics-category-item-/)).toHaveLength(5);
    expect(screen.getAllByTestId(/^analytics-tag-item-/)).toHaveLength(5);
    expect(screen.getAllByTestId(/^analytics-trend-item-/)).toHaveLength(7);
    expect(screen.getByTestId("analytics-category-icon-category-1")).toHaveTextContent("C");
    expect(screen.queryByText("Average transaction", { exact: false })).not.toBeInTheDocument();
    expect(screen.getByTestId("analytics-balance-value")).toHaveTextContent("-AED");

    fireEvent.click(screen.getByTestId("analytics-category-view-all"));
    expect(screen.getByTestId("analytics-category-breakdown-page")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^analytics-breakdown-item-category-/)).toHaveLength(7);
  });

  it("passes category drilldowns to the paginated transaction route with return context", () => {
    render(<MemoryRouter initialEntries={[{ pathname: "/analytics/category/category-2", state: { mtReturnPath: "/analytics" } }]}><Routes><Route element={<AnalyticsPage />} path="/analytics/*" /><Route element={<TransactionEditorRouteProbe />} path="/transactions/:id/edit" /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByTestId("analytics-drilldown-edit-2"));
    expect(screen.getByTestId("transaction-editor-route")).toHaveTextContent("/transactions/2/edit|/analytics/category/category-2|2");
  });
});
