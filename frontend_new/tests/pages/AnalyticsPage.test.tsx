import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import type { Category, Transaction } from "@/types/transactions";

const createdAt = new Date("2026-07-12T10:00:00");
const categories: Category[] = Array.from({ length: 7 }, (_, index) => ({
  id: index + 1,
  name: `Category ${index + 1}`,
  type: "EXPENSE",
  color: "#2d8cff",
  icon: index === 0 ? null : "category",
  parentCategoryId: null,
  orderIndex: index,
  createdAt,
}));
const transactions: Transaction[] = categories.map((category, index) => ({
  id: index + 1,
  userId: 1,
  transactionDate: index === 0 ? new Date("2026-06-12T10:00:00") : createdAt,
  amount: -(100 - index),
  note: `Expense ${index + 1}`,
  categoryId: category.id,
  tags: [`tag-${index + 1}`],
  currency: "AED",
  smsText: null,
  messageId: null,
  createdAt,
  category,
}));

vi.mock("@/features/analytics/hooks/useAnalyticsTransactions", () => ({
  useAnalyticsTransactions: () => ({
    error: null,
    loading: false,
    retry: vi.fn(),
    transactions,
  }),
}));

function TransactionEditorRouteProbe(): JSX.Element {
  const location = useLocation();
  const state = location.state as { mtReturnPath?: string; transaction?: Transaction } | null;

  return (
    <output data-testid="transaction-editor-route">
      {`${location.pathname}|${state?.mtReturnPath ?? ""}|${state?.transaction?.id ?? ""}`}
    </output>
  );
}

describe("AnalyticsPage", () => {
  it("keeps overview widgets to five rows and exposes every item through full-page breakdowns", () => {
    render(
      <MemoryRouter initialEntries={["/analytics"]}>
        <AnalyticsPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByTestId(/^analytics-category-item-/)).toHaveLength(5);
    expect(screen.getAllByTestId(/^analytics-tag-item-/)).toHaveLength(5);
    expect(screen.getByTestId("analytics-category-icon-category-1")).toHaveTextContent("C");
    expect(screen.getByTestId("analytics-date-presets")).toHaveClass("[scrollbar-width:none]");
    expect(screen.getByTestId("analytics-trend-summary")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-date-range-card")).toHaveClass("overflow-hidden");
    expect(screen.getByTestId("analytics-from-date")).toHaveClass("max-w-full");
    expect(screen.getByTestId("analytics-summary-card")).not.toHaveClass("min-h-[21rem]");
    expect(screen.getByTestId("analytics-trends-card")).not.toHaveClass("min-h-[18rem]");
    expect(screen.getAllByTestId(/^analytics-trend-item-/).map((item) => item.dataset.testid)).toEqual([
      "analytics-trend-item-2026-06",
      "analytics-trend-item-2026-07",
    ]);

    fireEvent.click(screen.getByTestId("analytics-trend-item-2026-06"));
    expect(screen.getByTestId("analytics-trend-item-2026-06")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("analytics-trend-summary-month")).toHaveTextContent("Jun 2026");
    expect(screen.getByTestId("analytics-trend-summary-net")).toHaveTextContent(/-AED\s*100\.00/);
    expect(screen.getByTestId("analytics-trend-summary-net")).not.toHaveTextContent("Net");
    expect(screen.getByTestId("analytics-trend-summary-header")).toHaveClass("justify-between");
    expect(screen.getByTestId("analytics-trend-summary-header").firstElementChild).toBe(
      screen.getByTestId("analytics-trend-summary-month"),
    );
    expect(screen.getByTestId("analytics-trend-summary-header").lastElementChild).toBe(
      screen.getByTestId("analytics-trend-summary-net"),
    );
    expect(screen.getByTestId("analytics-trend-summary-income")).toHaveTextContent("AED");
    expect(screen.getByTestId("analytics-trend-summary-expense")).toHaveTextContent("AED");

    fireEvent.click(screen.getByTestId("analytics-category-view-all"));
    expect(screen.getByTestId("analytics-category-breakdown-page")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^analytics-breakdown-item-category-/)).toHaveLength(7);
    expect(screen.getByTestId("analytics-breakdown-category-icon-category-1")).toHaveTextContent("C");

    fireEvent.click(screen.getByTestId("analytics-breakdown-close"));
    fireEvent.click(screen.getByTestId("analytics-tag-view-all"));
    expect(screen.getByTestId("analytics-tag-breakdown-page")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^analytics-breakdown-item-tag-/)).toHaveLength(7);
  });

  it("wraps each native date input in its own containment owner", () => {
    render(
      <MemoryRouter initialEntries={["/analytics"]}>
        <AnalyticsPage />
      </MemoryRouter>,
    );

    const fromDateControl = screen.getByTestId("analytics-from-date-control");
    const toDateControl = screen.getByTestId("analytics-to-date-control");

    expect(fromDateControl).toHaveAttribute("data-native-date-control");
    expect(toDateControl).toHaveAttribute("data-native-date-control");
    expect(fromDateControl).toHaveClass("relative");
    expect(toDateControl).toHaveClass("relative");
    expect(fromDateControl).toContainElement(screen.getByTestId("analytics-from-date"));
    expect(toDateControl).toContainElement(screen.getByTestId("analytics-to-date"));
    expect(screen.getByTestId("analytics-from-date-display")).toHaveTextContent("Jul 1, 2026");
    expect(screen.getByTestId("analytics-to-date-display")).toHaveTextContent("Jul 31, 2026");
    expect(screen.getByTestId("analytics-from-date")).toHaveClass("opacity-0");
    expect(screen.getByTestId("analytics-to-date")).toHaveClass("opacity-0");
    expect(screen.getByTestId("analytics-from-date")).toHaveAttribute("data-skip-focus-position", "true");
    expect(screen.getByTestId("analytics-to-date")).toHaveAttribute("data-skip-focus-position", "true");

    fireEvent.change(screen.getByTestId("analytics-from-date"), { target: { value: "2026-07-02" } });
    expect(screen.getByTestId("analytics-from-date-display")).toHaveTextContent("Jul 2, 2026");
  });

  it("clears one Analytics date without changing its companion date", () => {
    render(
      <MemoryRouter initialEntries={["/analytics"]}>
        <AnalyticsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear Analytics from date" }));
    expect(screen.getByTestId("analytics-from-date-display")).toHaveTextContent("Select date");
    expect(screen.getByTestId("analytics-to-date-display")).toHaveTextContent("Jul 31, 2026");
  });

  it("opens the existing transaction editor from a category drilldown with return context", () => {
    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/analytics/category/category-2", state: { mtReturnPath: "/analytics" } }]}
      >
        <Routes>
          <Route element={<AnalyticsPage />} path="/analytics/*" />
          <Route element={<TransactionEditorRouteProbe />} path="/transactions/:id/edit" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId("analytics-drilldown-edit-2"));
    expect(screen.getByTestId("transaction-editor-route")).toHaveTextContent(
      "/transactions/2/edit|/analytics/category/category-2|2",
    );
  });
});
