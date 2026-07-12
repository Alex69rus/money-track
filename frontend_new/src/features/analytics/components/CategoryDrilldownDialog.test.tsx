import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryDrilldownDialog } from "@/features/analytics/components/CategoryDrilldownDialog";
import type { CategorySpendingItem } from "@/features/analytics/types";

const category: CategorySpendingItem = {
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
      category: null,
    },
  ],
};

describe("CategoryDrilldownDialog", () => {
  it("renders the draft-aligned category summary and dense transaction metadata as a Telegram page", () => {
    render(
      <CategoryDrilldownDialog
        category={category}
        currency="AED"
        onClose={() => undefined}
        presentation="page"
        rangeLabel="Jul 1 - Jul 31, 2026"
      />,
    );

    expect(screen.getByTestId("analytics-drilldown-page")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-drilldown-category-icon")).toHaveTextContent("restaurant");
    expect(screen.getByTestId("analytics-drilldown-total")).toHaveTextContent("-AED");
    expect(screen.getByTestId("analytics-drilldown-range")).toHaveTextContent("Jul 1 - Jul 31, 2026");
    expect(screen.getByTestId("analytics-drilldown-item-91")).toHaveTextContent("Morning coffee");
    expect(screen.getByTestId("analytics-drilldown-tag-coffee")).toHaveTextContent("#coffee");
    expect(screen.queryByTestId("analytics-drilldown-close")).not.toBeInTheDocument();
  });

  it("keeps an explicit close action for dialog fallback", () => {
    render(
      <CategoryDrilldownDialog
        category={category}
        currency="AED"
        onClose={() => undefined}
        rangeLabel="Jul 1 - Jul 31, 2026"
      />,
    );

    expect(screen.getByTestId("analytics-drilldown-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-drilldown-close")).toHaveAccessibleName("Close category drilldown");
  });
});
