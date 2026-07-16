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

  it("renders whole-number amounts with two decimals and opens Tags without a redundant plus control", () => {
    const onOpenTagsPage = vi.fn();

    render(
      <TransactionEditDialog
        activeSubpage="none"
        availableTags={[]}
        categories={[]}
        onDeleted={vi.fn()}
        onOpenChange={vi.fn()}
        onOpenTagsPage={onOpenTagsPage}
        onSaved={vi.fn()}
        open
        presentation="page"
        transaction={{ ...transaction, amount: -13 }}
      />,
    );

    expect(screen.getByLabelText("Transaction amount")).toHaveValue("-13.00");
    expect(screen.getByLabelText("Transaction amount")).toHaveAttribute("value", "-13.00");
    expect(screen.getByTestId("tx-edit-save")).toBeDisabled();
    expect(screen.getByTestId("tx-edit-open-tags").querySelector("svg.lucide-circle-plus")).toBeNull();

    fireEvent.change(screen.getByLabelText("Transaction amount"), { target: { value: "-15" } });
    fireEvent.blur(screen.getByLabelText("Transaction amount"));
    expect(screen.getByLabelText("Transaction amount")).toHaveAttribute("value", "-15.00");

    fireEvent.click(screen.getByTestId("tx-edit-open-tags"));
    expect(onOpenTagsPage).toHaveBeenCalledOnce();
  });

  it("normalizes an iPhone decimal comma and exposes income and expense controls", () => {
    render(
      <TransactionEditDialog
        activeSubpage="none"
        availableTags={[]}
        categories={[]}
        onDeleted={vi.fn()}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
        open
        presentation="page"
        transaction={transaction}
      />,
    );

    const amountInput = screen.getByLabelText("Transaction amount");
    expect(amountInput).toHaveAttribute("type", "text");
    expect(amountInput).toHaveAttribute("inputmode", "decimal");

    fireEvent.change(amountInput, { target: { value: "12,32" } });
    expect(amountInput).toHaveValue("12.32");
    fireEvent.click(screen.getByTestId("tx-edit-sign-expense"));
    expect(amountInput).toHaveValue("-12.32");
    expect(screen.getByTestId("tx-edit-sign-expense")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByTestId("tx-edit-sign-income"));
    expect(amountInput).toHaveValue("12.32");
    expect(screen.getByTestId("tx-edit-sign-income")).toHaveAttribute("aria-pressed", "true");
  });

  it("uses the editor's dark surface for destructive confirmation", () => {
    render(
      <TransactionEditDialog
        activeSubpage="none"
        availableTags={[]}
        categories={[]}
        onDeleted={vi.fn()}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
        open
        presentation="page"
        transaction={transaction}
      />,
    );

    fireEvent.click(screen.getByTestId("tx-edit-delete-trigger"));
    expect(screen.getByTestId("tx-edit-delete-confirm-dialog")).toHaveClass("bg-[#171923]");
    expect(screen.getByTestId("tx-edit-delete-confirm")).toHaveClass("bg-[#ff5465]");
  });
});
