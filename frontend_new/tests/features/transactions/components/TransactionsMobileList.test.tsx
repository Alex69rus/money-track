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
  createdAt: new Date("2026-07-12T09:15:00"),
  category: null,
};

describe("TransactionsMobileList", () => {
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
});
