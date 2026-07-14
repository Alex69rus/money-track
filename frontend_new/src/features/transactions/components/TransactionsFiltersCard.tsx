import { useMemo } from "react";
import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  tags: string[];
  draft: TransactionFilterDraft;
  activeFiltersCount: number;
  categorySearch: string;
  expanded: boolean;
  optionsLoading: boolean;
  optionsError: string | null;
  isDebouncing: boolean;
  onSetExpanded: (expanded: boolean) => void;
  onDraftChange: (next: TransactionFilterDraft) => void;
  onCategorySearchChange: (value: string) => void;
  onOpenTagSelector: () => void;
  onRetryOptions: () => void;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function toTestIdSegment(value: string): string {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function toggleTag(currentTags: string[], tag: string): string[] {
  const normalizedTag = normalize(tag);
  if (currentTags.some((item) => normalize(item) === normalizedTag)) {
    return currentTags.filter((item) => normalize(item) !== normalizedTag);
  }

  return [...currentTags, tag];
}

export function TransactionsFiltersCard({
  categories,
  tags,
  draft,
  activeFiltersCount,
  categorySearch,
  expanded,
  optionsLoading,
  optionsError,
  isDebouncing,
  onSetExpanded,
  onDraftChange,
  onCategorySearchChange,
  onOpenTagSelector,
  onRetryOptions,
}: TransactionsFiltersCardProps): JSX.Element {
  const filteredCategories = useMemo(() => {
    const query = normalize(categorySearch);
    if (query.length === 0) {
      return categories;
    }

    return categories.filter((category) => {
      return normalize(category.name).includes(query);
    });
  }, [categories, categorySearch]);

  const selectedTagSet = useMemo(() => new Set(draft.tags.map(normalize)), [draft.tags]);
  const selectedTags = useMemo(() => draft.tags.slice(0, 5), [draft.tags]);
  const suggestedTags = useMemo(
    () => tags.filter((tag) => !selectedTagSet.has(normalize(tag))).slice(0, 5),
    [selectedTagSet, tags],
  );

  const selectedCategoryLabel = useMemo(() => {
    if (!draft.categoryId) {
      return undefined;
    }

    const categoryId = Number(draft.categoryId);
    return categories.find((category) => category.id === categoryId)?.name;
  }, [categories, draft.categoryId]);

  const categoriesForSelect = useMemo(() => {
    if (!draft.categoryId) {
      return filteredCategories;
    }

    const selectedCategoryId = Number(draft.categoryId);
    const isPresent = filteredCategories.some((category) => category.id === selectedCategoryId);
    if (isPresent) {
      return filteredCategories;
    }

    const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
    if (!selectedCategory) {
      return filteredCategories;
    }

    return [selectedCategory, ...filteredCategories];
  }, [categories, draft.categoryId, filteredCategories]);

  const onFieldChange = (field: DraftStringField, value: string): void => {
    onDraftChange({
      ...draft,
      [field]: value,
    });
  };

  const onTagToggle = (tag: string): void => {
    onDraftChange({
      ...draft,
      tags: toggleTag(draft.tags, tag),
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
    onCategorySearchChange("");
  };

  return (
    <Card className="rounded-xl border-border/70 bg-card/70 py-0">
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

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="transactions-category-search">
              Category
            </label>

            <Input
              id="transactions-category-search"
              onChange={(event) => onCategorySearchChange(event.target.value)}
              placeholder="Search categories"
              type="search"
              value={categorySearch}
            />

            {optionsLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                onValueChange={(value) => onFieldChange("categoryId", value === "all" ? "" : value)}
                value={draft.categoryId || "all"}
              >
                <SelectTrigger aria-label="Select category" className="w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All categories</SelectItem>
                    {categoriesForSelect.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                    {!optionsLoading && categoriesForSelect.length === 0 ? (
                      <SelectItem disabled value="no-categories-found">
                        No categories found
                      </SelectItem>
                    ) : null}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}

            {selectedCategoryLabel ? (
              <p className="text-xs text-muted-foreground">Selected category: {selectedCategoryLabel}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Tags</p>
              <Button
                className="h-auto px-1 text-xs font-semibold text-primary hover:text-primary"
                data-testid="tx-filter-edit-tags"
                onClick={onOpenTagSelector}
                size="xs"
                type="button"
                variant="ghost"
              >
                Edit tags
              </Button>
            </div>

            {optionsLoading ? (
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="flex flex-col gap-3" data-testid="tx-filter-tags-compact">
                {selectedTags.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedTags.map((tag) => (
                      <Button
                        aria-label={`Remove ${tag} filter tag`}
                        aria-pressed
                        className="max-w-40"
                        data-testid={`tx-filter-selected-tag-${toTestIdSegment(tag)}`}
                        key={tag}
                        onClick={() => onTagToggle(tag)}
                        size="xs"
                        type="button"
                      >
                        <span className="truncate">{tag}</span>
                      </Button>
                    ))}
                    {draft.tags.length > selectedTags.length ? (
                      <Button
                        aria-label={`Edit ${draft.tags.length} selected filter tags`}
                        className="max-w-40"
                        data-testid="tx-filter-selected-tags-count"
                        onClick={onOpenTagSelector}
                        size="xs"
                        type="button"
                        variant="outline"
                      >
                        +{draft.tags.length - selectedTags.length} selected
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {suggestedTags.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Suggested tags</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.map((tag) => (
                        <Button
                          aria-label={`Add ${tag} filter tag`}
                          className="max-w-40"
                          data-testid={`tx-filter-suggested-tag-${toTestIdSegment(tag)}`}
                          key={tag}
                          onClick={() => onTagToggle(tag)}
                          size="xs"
                          type="button"
                          variant="outline"
                        >
                          <span className="truncate">{tag}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No additional tags to suggest.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
