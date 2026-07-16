import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  type TransactionFilterDraft,
  TransactionsFiltersCard,
} from "@/features/transactions/components/TransactionsFiltersCard";

const tags = Array.from({ length: 7 }, (_, index) => `tag-${index + 1}`);
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
  it("opens dedicated category and tag selectors instead of combining search, chips, and native selects", () => {
    const onDraftChange = vi.fn();
    const onOpenCategorySelector = vi.fn();
    const onOpenTagSelector = vi.fn();

    render(
      <TransactionsFiltersCard
        activeFiltersCount={1}
        categories={[{ id: 12, name: "Groceries", type: "EXPENSE", color: "#2d8cff", icon: null, parentCategoryId: null, orderIndex: 0, createdAt: new Date() }]}
        draft={{ ...draft, categoryId: "12" }}
        expanded
        isDebouncing={false}
        onDraftChange={onDraftChange}
        onOpenCategorySelector={onOpenCategorySelector}
        onOpenTagSelector={onOpenTagSelector}
        onRetryOptions={vi.fn()}
        onSetExpanded={vi.fn()}
        optionsError={null}
        optionsLoading={false}
      />,
    );

    expect(screen.getByTestId("tx-filter-open-category")).toHaveTextContent("Groceries");
    expect(screen.getByTestId("tx-filter-open-tags")).toHaveTextContent("7 tags selected");
    expect(screen.getByTestId("transactions-filters-toggle")).toHaveTextContent("Filters");
    expect(screen.queryByTestId("transactions-category-search")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tx-filter-tags-compact")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tx-filter-open-category"));
    fireEvent.click(screen.getByTestId("tx-filter-open-tags"));
    expect(onOpenCategorySelector).toHaveBeenCalledOnce();
    expect(onOpenTagSelector).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Clear category filter" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear tag filters" }));
    expect(onDraftChange).toHaveBeenNthCalledWith(1, { ...draft, categoryId: "", tags: draft.tags });
    expect(onDraftChange).toHaveBeenNthCalledWith(2, { ...draft, categoryId: "12", tags: [] });
  });

  it("wraps each native date input in its own containment owner", () => {
    const onDraftChange = vi.fn();

    render(
      <TransactionsFiltersCard
        activeFiltersCount={0}
        categories={[]}
        draft={draft}
        expanded
        isDebouncing={false}
        onDraftChange={onDraftChange}
        onOpenCategorySelector={vi.fn()}
        onOpenTagSelector={vi.fn()}
        onRetryOptions={vi.fn()}
        onSetExpanded={vi.fn()}
        optionsError={null}
        optionsLoading={false}
      />,
    );

    const fromDateControl = screen.getByTestId("transactions-from-date-control");
    const toDateControl = screen.getByTestId("transactions-to-date-control");

    expect(fromDateControl).toHaveAttribute("data-native-date-control");
    expect(toDateControl).toHaveAttribute("data-native-date-control");
    expect(fromDateControl).toHaveClass("relative");
    expect(toDateControl).toHaveClass("relative");
    expect(fromDateControl).toContainElement(screen.getByLabelText("From date"));
    expect(toDateControl).toContainElement(screen.getByLabelText("To date"));
    expect(screen.getByTestId("transactions-from-date-display")).toHaveTextContent("Select date");
    expect(screen.getByTestId("transactions-to-date-display")).toHaveTextContent("Select date");
    expect(screen.getByLabelText("From date")).toHaveClass("opacity-0");
    expect(screen.getByLabelText("To date")).toHaveClass("opacity-0");
    expect(screen.getByLabelText("From date")).toHaveAttribute("data-skip-focus-position", "true");
    expect(screen.getByLabelText("To date")).toHaveAttribute("data-skip-focus-position", "true");

    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-07-03" } });
    expect(onDraftChange).toHaveBeenCalledWith({ ...draft, fromDate: "2026-07-03" });
  });

  it("clears each populated date independently through an app-owned control", () => {
    const onDraftChange = vi.fn();
    const populatedDraft = { ...draft, fromDate: "2026-07-01", toDate: "2026-07-31" };

    render(
      <TransactionsFiltersCard
        activeFiltersCount={2}
        categories={[]}
        draft={populatedDraft}
        expanded
        isDebouncing={false}
        onDraftChange={onDraftChange}
        onOpenCategorySelector={vi.fn()}
        onOpenTagSelector={vi.fn()}
        onRetryOptions={vi.fn()}
        onSetExpanded={vi.fn()}
        optionsError={null}
        optionsLoading={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear From date" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear To date" }));

    expect(onDraftChange).toHaveBeenCalledWith({ ...populatedDraft, fromDate: "" });
    expect(onDraftChange).toHaveBeenCalledWith({ ...populatedDraft, toDate: "" });
  });
});
