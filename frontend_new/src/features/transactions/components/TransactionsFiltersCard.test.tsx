import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  type TransactionFilterDraft,
  TransactionsFiltersCard,
} from "@/features/transactions/components/TransactionsFiltersCard";

const tags = Array.from({ length: 100 }, (_, index) =>
  index === 20 ? "very-long-system-generated-tag-that-must-not-overflow-the-phone-filter-card" : `tag-${index + 1}`,
);
const draft: TransactionFilterDraft = {
  categoryId: "",
  fromDate: "",
  maxAmount: "",
  minAmount: "",
  tags: tags.slice(0, 7),
  text: "",
  toDate: "",
};

describe("TransactionsFiltersCard", () => {
  it("bounds default tag chips while preserving a route to edit all selected and available tags", () => {
    const onDraftChange = vi.fn();
    const onOpenTagSelector = vi.fn();

    render(
      <TransactionsFiltersCard
        activeFiltersCount={1}
        categories={[]}
        categorySearch=""
        draft={draft}
        expanded
        isDebouncing={false}
        onCategorySearchChange={vi.fn()}
        onDraftChange={onDraftChange}
        onOpenTagSelector={onOpenTagSelector}
        onRetryOptions={vi.fn()}
        onSetExpanded={vi.fn()}
        optionsError={null}
        optionsLoading={false}
        tags={tags}
      />,
    );

    expect(screen.getAllByTestId(/^tx-filter-selected-tag-/)).toHaveLength(5);
    expect(screen.getAllByTestId(/^tx-filter-suggested-tag-/)).toHaveLength(5);
    expect(screen.getByTestId("tx-filter-selected-tags-count")).toHaveTextContent("+2 selected");
    expect(screen.getByTestId("transactions-filters-toggle")).toHaveTextContent("Filters");
    expect(screen.queryByText("Changes apply automatically after a short debounce.")).not.toBeInTheDocument();
    expect(screen.queryByText("tag-100", { exact: true })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tx-filter-selected-tag-tag-1"));
    expect(onDraftChange).toHaveBeenCalledWith({ ...draft, tags: tags.slice(1, 7) });

    fireEvent.click(screen.getByTestId("tx-filter-selected-tags-count"));
    fireEvent.click(screen.getByTestId("tx-filter-edit-tags"));
    expect(onOpenTagSelector).toHaveBeenCalledTimes(2);
  });
});
