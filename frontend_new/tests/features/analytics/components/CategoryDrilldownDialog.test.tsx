import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoryDrilldownDialog } from "@/features/analytics/components/CategoryDrilldownDialog";
import type { AnalyticsDrilldownItem } from "@/features/analytics/types";

const category: AnalyticsDrilldownItem = {
  kind: "category",
  item: {
    key: "category-7",
    categoryId: 7,
    categoryName: "Food & Drinks",
    amount: 450,
    transactionCount: 1,
    share: 1,
    icon: "restaurant",
    color: "#2d8cff",
    transactions: [
      {
        id: 91,
        userId: 1,
        transactionDate: new Date("2026-07-12T08:45:00"),
        amount: -6.5,
        note: "Morning coffee",
        categoryId: 7,
        tags: ["coffee", "morning"],
        currency: "AED",
        smsText: null,
        messageId: null,
        createdAt: new Date("2026-07-12T08:45:00"),
        category: {
          id: 7,
          name: "Food & Drinks",
          type: "EXPENSE",
          color: "#2d8cff",
          icon: "restaurant",
          parentCategoryId: null,
          orderIndex: null,
          createdAt: new Date("2026-07-12T08:45:00"),
        },
      },
    ],
  },
};

const tag: AnalyticsDrilldownItem = {
  kind: "tag",
  item: {
    key: "coffee",
    tag: "coffee",
    amount: 6.5,
    transactionCount: 1,
    share: 1,
    transactions: category.item.transactions,
  },
};

describe("CategoryDrilldownDialog", () => {
  it("renders the draft-aligned category summary and dense transaction metadata as a Telegram page", () => {
    render(
      <CategoryDrilldownDialog
        currency="AED"
        drilldown={category}
        onClose={() => undefined}
        presentation="page"
        rangeLabel="Jul 1 - Jul 31, 2026"
      />,
    );

    expect(screen.getByTestId("analytics-drilldown-page")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-drilldown-icon")).toHaveTextContent("restaurant");
    expect(screen.getByTestId("analytics-drilldown-subject")).toHaveTextContent("Food & Drinks");
    expect(screen.getByTestId("analytics-drilldown-total")).toHaveTextContent("-AED");
    expect(screen.getByTestId("analytics-drilldown-range")).toHaveTextContent("Jul 1 - Jul 31, 2026");
    expect(screen.getByTestId("analytics-drilldown-item-91")).toHaveTextContent("Morning coffee");
    expect(screen.getByTestId("analytics-drilldown-transaction-category-91")).toHaveAccessibleName("Category Food & Drinks");
    expect(screen.getByTestId("analytics-drilldown-tag-coffee")).toHaveTextContent("#coffee");
    expect(screen.queryByTestId("analytics-drilldown-close")).not.toBeInTheDocument();
  });

  it("keeps an explicit close action for dialog fallback", () => {
    render(
      <CategoryDrilldownDialog
        currency="AED"
        drilldown={category}
        onClose={() => undefined}
        rangeLabel="Jul 1 - Jul 31, 2026"
      />,
    );

    expect(screen.getByTestId("analytics-drilldown-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-drilldown-close")).toHaveAccessibleName("Close analytics drilldown");
  });

  it("renders tag drilldowns with the same category-aware transaction row", () => {
    render(
      <CategoryDrilldownDialog
        currency="AED"
        drilldown={tag}
        onClose={() => undefined}
        presentation="page"
        rangeLabel="Jul 1 - Jul 31, 2026"
      />,
    );

    expect(screen.getByTestId("analytics-drilldown-label")).toHaveTextContent("Spendings by Tag");
    expect(screen.getByTestId("analytics-drilldown-subject")).toHaveTextContent("#coffee");
    expect(screen.getByTestId("analytics-drilldown-transaction-category-91")).toHaveAccessibleName("Category Food & Drinks");
  });

  it("exposes an explicit edit action for each drilldown transaction", () => {
    const onEditTransaction = vi.fn();

    render(
      <CategoryDrilldownDialog
        currency="AED"
        drilldown={category}
        onClose={() => undefined}
        onEditTransaction={onEditTransaction}
        presentation="page"
        rangeLabel="Jul 1 - Jul 31, 2026"
      />,
    );

    fireEvent.click(screen.getByTestId("analytics-drilldown-edit-91"));
    expect(onEditTransaction).toHaveBeenCalledWith(category.item.transactions[0]);
  });
});
