import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionCategorySelectorDialog } from "@/features/transactions/components/TransactionCategorySelectorDialog";
import type { Category } from "@/types/transactions";

const createdAt = new Date("2026-07-12T09:15:00");
const categories: Category[] = [
  {
    id: 1,
    name: "Grouped parent",
    type: "EXPENSE",
    color: "#2d8cff",
    icon: "category",
    parentCategoryId: null,
    orderIndex: 1,
    createdAt,
  },
  {
    id: 2,
    name: "Grouped child",
    type: "EXPENSE",
    color: "#2d8cff",
    icon: "category",
    parentCategoryId: 1,
    orderIndex: 2,
    createdAt,
  },
  {
    id: 3,
    name: "Leaf category",
    type: "EXPENSE",
    color: "#22c55e",
    icon: "shopping_cart",
    parentCategoryId: null,
    orderIndex: 3,
    createdAt,
  },
];

describe("TransactionCategorySelectorDialog", () => {
  it("keeps expansion controls only on category groups and leaves a selected leaf without a chevron", () => {
    render(
      <TransactionCategorySelectorDialog
        categories={categories}
        currentCategoryId={3}
        description="Select one"
        error={null}
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
        open
        pending={false}
        presentation="page"
        title="Category"
      />,
    );

    expect(screen.getByTestId("tx-category-expand-1")).toHaveAccessibleName("Collapse Grouped parent group");
    expect(screen.queryByTestId("tx-category-expand-3")).not.toBeInTheDocument();
    expect(screen.getByTestId("tx-category-selection-marker-3")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("tx-category-search"), { target: { value: "Leaf" } });
    expect(screen.queryByTestId("tx-category-expand-3")).not.toBeInTheDocument();
    expect(screen.getByTestId("tx-category-selection-marker-3")).toBeInTheDocument();
  });

  it("can label the empty selector state as all categories for filtering", () => {
    render(
      <TransactionCategorySelectorDialog
        categories={categories}
        currentCategoryId={null}
        description="Filter categories"
        error={null}
        nullOptionLabel="All categories"
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
        open
        pending={false}
        presentation="page"
        title="Filter category"
      />,
    );

    expect(screen.getByTestId("tx-category-option-uncategorized")).toHaveTextContent("All categories");
    expect(screen.getByTestId("tx-category-option-uncategorized")).toHaveAccessibleName("Clear category filter");
  });
});
