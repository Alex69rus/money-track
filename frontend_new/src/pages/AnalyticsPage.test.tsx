import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import type { Category, Transaction } from "@/types/transactions";

const createdAt = new Date("2026-07-12T10:00:00");
const categories: Category[] = Array.from({ length: 7 }, (_, index) => ({
  id: index + 1,
  name: `Category ${index + 1}`,
  type: "EXPENSE",
  color: "#2d8cff",
  icon: "category",
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

describe("AnalyticsPage", () => {
  it("keeps overview widgets to five rows and exposes every item through full-page breakdowns", () => {
    render(
      <MemoryRouter initialEntries={["/analytics"]}>
        <AnalyticsPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByTestId(/^analytics-category-item-/)).toHaveLength(5);
    expect(screen.getAllByTestId(/^analytics-tag-item-/)).toHaveLength(5);
    expect(screen.getByTestId("analytics-date-presets")).toHaveClass("[scrollbar-width:none]");
    expect(screen.getByTestId("analytics-trend-summary")).toBeInTheDocument();
    expect(screen.getByText("Selected month")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-date-range-card")).toHaveClass("overflow-hidden");
    expect(screen.getByTestId("analytics-from-date")).toHaveClass("max-w-full");
    expect(screen.getByTestId("analytics-summary-card")).not.toHaveClass("min-h-[21rem]");
    expect(screen.getByTestId("analytics-trends-card")).not.toHaveClass("min-h-[18rem]");

    fireEvent.click(screen.getByTestId("analytics-trend-item-2026-06"));
    expect(screen.getByTestId("analytics-trend-item-2026-06")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("analytics-trend-summary-month")).toHaveTextContent("Jun 2026");
    expect(screen.getByTestId("analytics-trend-summary-income")).toHaveTextContent("AED");
    expect(screen.getByTestId("analytics-trend-summary-expense")).toHaveTextContent("AED");

    fireEvent.click(screen.getByTestId("analytics-category-view-all"));
    expect(screen.getByTestId("analytics-category-breakdown-page")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^analytics-breakdown-item-category-/)).toHaveLength(7);

    fireEvent.click(screen.getByTestId("analytics-breakdown-close"));
    fireEvent.click(screen.getByTestId("analytics-tag-view-all"));
    expect(screen.getByTestId("analytics-tag-breakdown-page")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^analytics-breakdown-item-tag-/)).toHaveLength(7);
  });
});
