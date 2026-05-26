import { useMemo } from "react";
import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  tagSearch: string;
  expanded: boolean;
  optionsLoading: boolean;
  optionsError: string | null;
  isDebouncing: boolean;
  onSetExpanded: (expanded: boolean) => void;
  onDraftChange: (next: TransactionFilterDraft) => void;
  onCategorySearchChange: (value: string) => void;
  onTagSearchChange: (value: string) => void;
  onRetryOptions: () => void;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function toTestIdSegment(value: string): string {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function toggleTag(currentTags: string[], tag: string): string[] {
  if (currentTags.includes(tag)) {
    return currentTags.filter((item) => item !== tag);
  }

  return [...currentTags, tag];
}

function formatRangeLabel(fromDate: string, toDate: string): string {
  if (!fromDate && !toDate) {
    return "Any date";
  }

  if (fromDate && toDate) {
    return `${fromDate} - ${toDate}`;
  }

  if (fromDate) {
    return `From ${fromDate}`;
  }

  return `Until ${toDate}`;
}

export function TransactionsFiltersCard({
  categories,
  tags,
  draft,
  activeFiltersCount,
  categorySearch,
  tagSearch,
  expanded,
  optionsLoading,
  optionsError,
  isDebouncing,
  onSetExpanded,
  onDraftChange,
  onCategorySearchChange,
  onTagSearchChange,
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

  const filteredTags = useMemo(() => {
    const query = normalize(tagSearch);
    if (query.length === 0) {
      return tags;
    }

    return tags.filter((tag) => normalize(tag).includes(query));
  }, [tags, tagSearch]);

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
    onTagSearchChange("");
  };

  const rangeLabel = formatRangeLabel(draft.fromDate, draft.toDate);

  return (
    <Card className="rounded-xl border-border/70 bg-card/70 py-0">
      <CardHeader className="gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 p-1.5">
          <Button
            aria-label={expanded ? "Hide filters" : "Show filters"}
            className="h-9 flex-1 justify-start rounded-lg px-3"
            onClick={() => onSetExpanded(!expanded)}
            size="sm"
            type="button"
            variant={expanded ? "default" : "outline"}
          >
            <SlidersHorizontalIcon aria-hidden data-icon="inline-start" />
            <span className="truncate text-xs font-semibold">{rangeLabel}</span>
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

        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">Filters</CardTitle>
          {isDebouncing ? (
            <Badge className="h-6 rounded-full px-2 text-[10px]" variant="outline">
              Applying...
            </Badge>
          ) : null}
        </div>
        <CardDescription className="text-xs">Changes apply automatically after a short debounce.</CardDescription>
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
              <Input
                id="transactions-from-date"
                onChange={(event) => onFieldChange("fromDate", event.target.value)}
                type="date"
                value={draft.fromDate}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="transactions-to-date">
                To date
              </label>
              <Input
                id="transactions-to-date"
                onChange={(event) => onFieldChange("toDate", event.target.value)}
                type="date"
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
            <label className="text-sm font-medium" htmlFor="transactions-tag-search">
              Tags
            </label>

            <Input
              id="transactions-tag-search"
              onChange={(event) => onTagSearchChange(event.target.value)}
              placeholder="Search tags"
              type="search"
              value={tagSearch}
            />

            {optionsLoading ? (
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : filteredTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {filteredTags.map((tag) => {
                  const isActive = draft.tags.includes(tag);

                  return (
                    <Button
                      aria-pressed={isActive}
                      data-testid={`tx-filter-tag-option-${toTestIdSegment(tag)}`}
                      key={tag}
                      onClick={() => onTagToggle(tag)}
                      size="xs"
                      type="button"
                      variant={isActive ? "default" : "outline"}
                    >
                      {tag}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags match this search.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
