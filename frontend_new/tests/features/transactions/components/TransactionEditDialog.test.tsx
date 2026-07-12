import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionEditDialog } from "@/features/transactions/components/TransactionEditDialog";
import type { Transaction } from "@/types/transactions";

const transaction: Transaction = {
  id: 91,
  userId: 123456789,
  transactionDate: new Date("2026-07-12T09:15:00Z"),
  amount: -12.5,
  note: "Initial note",
  categoryId: null,
  tags: [],
  currency: "AED",
  smsText: null,
  messageId: null,
  createdAt: new Date("2026-07-12T09:15:00Z"),
  category: null,
};

describe("TransactionEditDialog", () => {
  it("keeps an in-progress edit when the same transaction is refreshed from the list", () => {
    const props = {
      activeSubpage: "none" as const,
      availableTags: [],
      categories: [],
      onDeleted: vi.fn(),
      onOpenChange: vi.fn(),
      onSaved: vi.fn(),
      open: true,
      presentation: "page" as const,
    };
    const { rerender } = render(<TransactionEditDialog {...props} transaction={transaction} />);

    const note = screen.getByLabelText("Transaction note");
    fireEvent.change(note, { target: { value: "Edited from Analytics" } });

    rerender(
      <TransactionEditDialog
        {...props}
        transaction={{ ...transaction }}
      />,
    );

    expect(screen.getByLabelText("Transaction note")).toHaveValue("Edited from Analytics");
    expect(screen.getByTestId("tx-edit-save")).toBeEnabled();
  });
});
