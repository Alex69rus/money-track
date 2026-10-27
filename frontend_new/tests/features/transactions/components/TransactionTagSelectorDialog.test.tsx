import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionTagSelectorDialog } from "@/features/transactions/components/TransactionTagSelectorDialog";

describe("TransactionTagSelectorDialog", () => {
  it("preserves first spelling, deduplicates case-insensitively, and confirms selections after search", () => {
    const onConfirm = vi.fn();
    render(<TransactionTagSelectorDialog
      availableTags={[" Travel ", "travel", "FOOD", "food", " "]}
      initialTags={["TRAVEL", " travel "]}
      description="Choose tags" error={null} onConfirm={onConfirm} onOpenChange={vi.fn()}
      open pending={false} presentation="page" title="Tags"
    />);

    expect(screen.getAllByTestId("tx-tag-option-travel")).toHaveLength(1);
    expect(screen.getByTestId("tx-tag-option-travel")).toHaveTextContent("Travel");
    expect(screen.getByTestId("tx-tag-option-travel")).toHaveAccessibleName("Remove Travel tag");
    fireEvent.change(screen.getByLabelText("Search tags"), { target: { value: "foo" } });
    fireEvent.click(screen.getByRole("button", { name: "Add FOOD tag" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm selected tags" }));
    expect(onConfirm).toHaveBeenCalledWith(["TRAVEL", "FOOD"]);
  });

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
