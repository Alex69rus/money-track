import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionTagSelectorDialog } from "@/features/transactions/components/TransactionTagSelectorDialog";

describe("TransactionTagSelectorDialog", () => {
  it("disables tag creation when reused as a transaction filter selector", () => {
    render(
      <TransactionTagSelectorDialog
        allowCreate={false}
        availableTags={[
          "commute",
          "very-long-system-generated-filter-tag-that-must-not-overflow-the-phone-screen",
        ]}
        description="Choose filter tags"
        error={null}
        initialTags={[]}
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
        open
        pending={false}
        presentation="page"
        title="Filter tags"
      />,
    );

    fireEvent.change(screen.getByTestId("tx-tags-search"), { target: { value: "new-filter-tag" } });
    expect(screen.queryByTestId("tx-tags-add-from-search")).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId("tx-tags-search"), {
      target: { value: "very-long-system-generated-filter-tag" },
    });
    expect(screen.getByText("very-long-system-generated-filter-tag-that-must-not-overflow-the-phone-screen")).toHaveClass(
      "truncate",
    );
  });
});
