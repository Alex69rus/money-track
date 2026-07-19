import { useMemo } from "react";
import { ChevronRightIcon, FolderIcon, SearchIcon, SlidersHorizontalIcon, TagsIcon, XIcon } from "lucide-react";
import { getCategoryIconPalette } from "@/components/category-color";
import { CategoryIconGlyph } from "@/components/category-icon-glyph";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeDateField } from "@/components/ui/native-date-field";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/transactions";

export interface TransactionFilterDraft {
  text: string;
  fromDate: string;
  toDate: string;
  categoryId: string;
  minAmount: string;
  maxAmount: string;
  tags: string[];
}

type DraftStringField = Exclude<keyof TransactionFilterDraft, "tags">;

interface TransactionsFiltersCardProps {
  categories: Category[];
  draft: TransactionFilterDraft;
  activeFiltersCount: number;
  expanded: boolean;
  optionsLoading: boolean;
  optionsError: string | null;
  isDebouncing: boolean;
  onSetExpanded: (expanded: boolean) => void;
  onDraftChange: (next: TransactionFilterDraft) => void;
  onOpenCategorySelector: () => void;
  onOpenTagSelector: () => void;
  onRetryOptions: () => void;
}

export function TransactionsFiltersCard({
  categories,
  draft,
  activeFiltersCount,
  expanded,
  optionsLoading,
  optionsError,
  isDebouncing,
  onSetExpanded,
  onDraftChange,
  onOpenCategorySelector,
  onOpenTagSelector,
  onRetryOptions,
}: TransactionsFiltersCardProps): JSX.Element {
  const selectedCategory = useMemo(() => {
    if (!draft.categoryId) {
      return undefined;
    }

    const categoryId = Number(draft.categoryId);
    return categories.find((category) => category.id === categoryId);
  }, [categories, draft.categoryId]);
  const selectedCategoryLabel = selectedCategory?.name;
  const categoryPalette = getCategoryIconPalette(selectedCategory?.color, 0.16);

  const onFieldChange = (field: DraftStringField, value: string): void => {
    onDraftChange({
      ...draft,
      [field]: value,
    });
  };

  const clearAll = (): void => {
    onDraftChange({
      text: "",
      fromDate: "",
      toDate: "",
      categoryId: "",
      minAmount: "",
      maxAmount: "",
      tags: [],
    });
  };

  return (
    <Card className="rounded-xl border-border/70 bg-card/70 py-0" data-testid="transactions-filters-card">
      <CardHeader className="gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 p-1.5">
          <Button
            aria-label={expanded ? "Hide filters" : "Show filters"}
            className="h-9 flex-1 justify-start rounded-lg px-3"
            data-testid="transactions-filters-toggle"
            onClick={() => onSetExpanded(!expanded)}
            size="sm"
            type="button"
            variant={expanded ? "default" : "outline"}
          >
            <SlidersHorizontalIcon aria-hidden data-icon="inline-start" />
            <span className="truncate text-xs font-semibold">Filters</span>
          </Button>
          <div className="flex items-center gap-1">
            {activeFiltersCount > 0 ? (
              <Badge className="h-6 rounded-full px-2 text-[10px]" variant="secondary">
                {activeFiltersCount}
              </Badge>
            ) : null}
            {activeFiltersCount > 0 ? (
              <Button aria-label="Clear all filters" onClick={clearAll} size="icon-sm" type="button" variant="ghost">
                <XIcon aria-hidden />
              </Button>
            ) : null}
          </div>
        </div>

        <span aria-live="polite" className="sr-only">
          {isDebouncing ? "Applying filters" : ""}
        </span>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Search transactions"
            className="rounded-xl border-border/80 bg-background/80 pl-9"
            id="transactions-search-text"
            name="transactionsSearchText"
            onChange={(event) => onFieldChange("text", event.target.value)}
            placeholder="Search transactions"
            type="search"
            value={draft.text}
          />
        </div>

      </CardHeader>

      <CardContent className={cn("flex flex-col gap-4 px-4 pb-4", expanded ? "pt-0" : "hidden")}>
        {optionsError ? (
          <Alert variant="destructive">
            <AlertTitle>Failed to load filter options</AlertTitle>
            <AlertDescription className="gap-2">
              <p>{optionsError}</p>
              <Button onClick={onRetryOptions} size="sm" type="button" variant="outline">
                Retry options
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="transactions-from-date">
                From date
              </label>
              <NativeDateField
                ariaLabel="From date"
                id="transactions-from-date"
                inputTestId="transactions-from-date"
                onChange={(event) => onFieldChange("fromDate", event.target.value)}
                onClear={() => onFieldChange("fromDate", "")}
                value={draft.fromDate}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="transactions-to-date">
                To date
              </label>
              <NativeDateField
                ariaLabel="To date"
                id="transactions-to-date"
                inputTestId="transactions-to-date"
                onChange={(event) => onFieldChange("toDate", event.target.value)}
                onClear={() => onFieldChange("toDate", "")}
                value={draft.toDate}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="transactions-min-amount">
                Min amount
              </label>
              <Input
                id="transactions-min-amount"
                inputMode="decimal"
                onChange={(event) => onFieldChange("minAmount", event.target.value)}
                placeholder="0.00"
                type="number"
                value={draft.minAmount}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="transactions-max-amount">
                Max amount
              </label>
              <Input
                id="transactions-max-amount"
                inputMode="decimal"
                onChange={(event) => onFieldChange("maxAmount", event.target.value)}
                placeholder="0.00"
                type="number"
                value={draft.maxAmount}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Category</p>
                {draft.categoryId ? (
                  <Button
                    aria-label="Clear category filter"
                    className="size-7 rounded-full text-muted-foreground"
                    onClick={() => onFieldChange("categoryId", "")}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <XIcon aria-hidden />
                  </Button>
                ) : null}
              </div>
              {optionsLoading ? (
                <Skeleton className="h-14 w-full rounded-xl" />
              ) : (
                <button
                  aria-label="Choose category filter"
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border/80 bg-background/80 px-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="tx-filter-open-category"
                  onClick={onOpenCategorySelector}
                  type="button"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: categoryPalette.backgroundColor,
                      color: categoryPalette.foregroundColor,
                    }}
                  >
                    {selectedCategory ? (
                      <CategoryIconGlyph
                        category={selectedCategory}
                        className="material-symbols-outlined text-[1rem] leading-none"
                        fallbackClassName="text-xs font-semibold"
                      />
                    ) : (
                      <FolderIcon aria-hidden className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {selectedCategoryLabel ?? "All categories"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {selectedCategoryLabel ? "Tap to change category" : "Choose one category"}
                    </span>
                  </span>
                  <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Tags</p>
                {draft.tags.length > 0 ? (
                  <Button
                    aria-label="Clear tag filters"
                    className="size-7 rounded-full text-muted-foreground"
                    onClick={() => onDraftChange({ ...draft, tags: [] })}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <XIcon aria-hidden />
                  </Button>
                ) : null}
              </div>
              {optionsLoading ? (
                <Skeleton className="h-14 w-full rounded-xl" />
              ) : (
                <button
                  aria-label="Choose tag filters"
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border/80 bg-background/80 px-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="tx-filter-open-tags"
                  onClick={onOpenTagSelector}
                  type="button"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <TagsIcon aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {draft.tags.length === 0
                        ? "All tags"
                        : `${draft.tags.length} ${draft.tags.length === 1 ? "tag" : "tags"} selected`}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {draft.tags.length > 0 ? draft.tags.join(", ") : "Choose one or more tags"}
                    </span>
                  </span>
                  <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
