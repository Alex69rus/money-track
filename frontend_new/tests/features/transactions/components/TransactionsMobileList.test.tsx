import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionsMobileList } from "@/features/transactions/components/TransactionsMobileList";
import type { Transaction } from "@/types/transactions";

const uncategorizedTransaction: Transaction = {
  id: 77,
  userId: 1,
  transactionDate: new Date("2026-07-12T09:15:00"),
  amount: -12000,
  note: "Long note that should never turn into a fake category initial",
  categoryId: null,
  tags: ["qa"],
  currency: "AED",
  smsText: null,
  messageId: null,
  refunds: [],
  createdAt: new Date("2026-07-12T09:15:00"),
  category: null,
};

const selectedCategoryWithoutIconTransaction: Transaction = {
  ...uncategorizedTransaction,
  id: 78,
  categoryId: 4,
  note: "Transaction with a selected category",
  category: {
    id: 4,
    name: "Clothing & Shoes",
    type: "EXPENSE",
    color: "#dcaf83",
    icon: null,
    parentCategoryId: null,
    orderIndex: 4,
    createdAt: new Date("2026-07-12T09:15:00"),
  },
};

describe("TransactionsMobileList", () => {
  it("discloses tags beyond the three shown and reflects changed records", () => {
    const props = {
      onEditCategory: vi.fn(), onEditTags: vi.fn(), onEditTransaction: vi.fn(),
      transactions: [{ ...uncategorizedTransaction, tags: ["one", "two", "three", "four", "five"] }],
    };
    const { rerender } = render(<TransactionsMobileList {...props} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.queryByText("#four")).not.toBeInTheDocument();

    rerender(<TransactionsMobileList {...props} transactions={[{ ...uncategorizedTransaction, amount: -5, tags: ["one"] }]} />);
    expect(screen.queryByText("+2")).not.toBeInTheDocument();
    expect(screen.getByTestId("tx-mobile-amount-77")).toHaveTextContent("5.00");
  });

  it("uses an explicit uncategorized affordance, keeps the amount intact, and makes the card the edit target", () => {
    const onEditCategory = vi.fn();
    const onEditTags = vi.fn();
    const onEditTransaction = vi.fn();

    render(
      <TransactionsMobileList
        onEditCategory={onEditCategory}
        onEditTags={onEditTags}
        onEditTransaction={onEditTransaction}
        transactions={[uncategorizedTransaction]}
      />,
    );

    const categoryControl = screen.getByTestId("tx-mobile-category-77");
    const amount = screen.getByTestId("tx-mobile-amount-77");
    const editSurface = screen.getByTestId("tx-mobile-edit-77");

    expect(categoryControl).toHaveAccessibleName("Choose category for transaction 77");
    expect(categoryControl).toHaveTextContent("?");
    expect(categoryControl).toHaveClass("size-11", "rounded-2xl");
    expect(amount).toHaveTextContent("-AED");
    expect(amount).toHaveClass("whitespace-nowrap");
    expect(screen.queryByText("Edit", { exact: true })).not.toBeInTheDocument();

    fireEvent.click(categoryControl);
    expect(onEditCategory).toHaveBeenCalledWith(uncategorizedTransaction);
    expect(onEditTransaction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("tx-mobile-tags-77"));
    expect(onEditTags).toHaveBeenCalledWith(uncategorizedTransaction);
    expect(onEditTransaction).not.toHaveBeenCalled();

    fireEvent.click(editSurface);
    expect(onEditTransaction).toHaveBeenCalledWith(uncategorizedTransaction);
  });

  it("uses friendly category initials instead of the uncategorized glyph when a selected category has no icon", () => {
    render(
      <TransactionsMobileList
        onEditCategory={vi.fn()}
        onEditTags={vi.fn()}
        onEditTransaction={vi.fn()}
        transactions={[selectedCategoryWithoutIconTransaction]}
      />,
    );

    const categoryControl = screen.getByTestId("tx-mobile-category-78");

    expect(categoryControl).toHaveAccessibleName("Change category for transaction 78");
    expect(categoryControl).toHaveTextContent("CS");
    expect(categoryControl).toHaveClass("size-11", "rounded-2xl");
    expect(categoryControl).toHaveStyle({
      backgroundColor: "rgba(220, 175, 131, 0.16)",
      color: "rgb(220, 175, 131)",
    });
    expect(screen.getByTestId("tx-mobile-category-initials-78")).toHaveTextContent("CS");
  });
});
