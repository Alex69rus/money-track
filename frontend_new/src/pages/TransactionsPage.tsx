import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionCategorySelectorDialog } from "@/features/transactions/components/TransactionCategorySelectorDialog";
import { TransactionEditDialog } from "@/features/transactions/components/TransactionEditDialog";
import {
  TransactionFilterDraft,
  TransactionsFiltersCard,
} from "@/features/transactions/components/TransactionsFiltersCard";
import { TransactionsDesktopTable } from "@/features/transactions/components/TransactionsDesktopTable";
import { TransactionsListSkeleton } from "@/features/transactions/components/TransactionsListSkeleton";
import { TransactionsMobileList } from "@/features/transactions/components/TransactionsMobileList";
import { TransactionTagSelectorDialog } from "@/features/transactions/components/TransactionTagSelectorDialog";
import { useTransactionsList } from "@/features/transactions/hooks/useTransactionsList";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiRequestError } from "@/services/api/client";
import { fetchCategories } from "@/services/api/categories";
import { fetchTags } from "@/services/api/tags";
import { updateTransaction } from "@/services/api/transactions";
import type {
  Category,
  Transaction,
  TransactionsQueryFilters,
  UpdateTransactionPayload,
} from "@/types/transactions";

const FILTER_DEBOUNCE_MS = 500;

const DEFAULT_FILTERS: TransactionFilterDraft = {
  text: "",
  fromDate: "",
  toDate: "",
  categoryId: "",
  minAmount: "",
  maxAmount: "",
  tags: [],
};

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
}

function countActiveFilters(filters: TransactionFilterDraft): number {
  let count = 0;

  if (filters.text.trim()) {
    count += 1;
  }

  if (filters.fromDate) {
    count += 1;
  }

  if (filters.toDate) {
    count += 1;
  }

  if (filters.categoryId) {
    count += 1;
  }

  if (filters.minAmount.trim()) {
    count += 1;
  }

  if (filters.maxAmount.trim()) {
    count += 1;
  }

  if (filters.tags.length > 0) {
    count += 1;
  }

  return count;
}

function toRequestFilters(filters: TransactionFilterDraft): TransactionsQueryFilters {
  const categoryId = filters.categoryId ? Number(filters.categoryId) : undefined;
  const cleanTags = filters.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);

  return {
    text: filters.text.trim() || undefined,
    fromDate: filters.fromDate || undefined,
    toDate: filters.toDate || undefined,
    categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
    minAmount: parseOptionalNumber(filters.minAmount),
    maxAmount: parseOptionalNumber(filters.maxAmount),
    tags: cleanTags.length > 0 ? cleanTags : undefined,
  };
}

function areDraftsEqual(first: TransactionFilterDraft, second: TransactionFilterDraft): boolean {
  return (
    first.text === second.text &&
    first.fromDate === second.fromDate &&
    first.toDate === second.toDate &&
    first.categoryId === second.categoryId &&
    first.minAmount === second.minAmount &&
    first.maxAmount === second.maxAmount &&
    first.tags.length === second.tags.length &&
    first.tags.every((tag, index) => tag === second.tags[index])
  );
}

function toErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function byCategoryOrder(first: Category, second: Category): number {
  const firstOrder = first.orderIndex ?? Number.MAX_SAFE_INTEGER;
  const secondOrder = second.orderIndex ?? Number.MAX_SAFE_INTEGER;

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  return first.name.localeCompare(second.name);
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

function areTagsEqual(first: string[], second: string[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  const sortedFirst = [...first].map(normalizeTag).sort();
  const sortedSecond = [...second].map(normalizeTag).sort();
  return sortedFirst.every((tag, index) => tag === sortedSecond[index]);
}

function buildUpdatePayload(
  transaction: Transaction,
  overrides: Partial<UpdateTransactionPayload> = {},
): UpdateTransactionPayload {
  return {
    transactionDate: transaction.transactionDate.toISOString(),
    amount: transaction.amount,
    note: transaction.note?.trim() ? transaction.note.trim() : null,
    categoryId: transaction.categoryId,
    tags: transaction.tags,
    currency: transaction.currency,
    ...overrides,
  };
}

export function TransactionsPage(): JSX.Element {
  const [filtersDraft, setFiltersDraft] = useState<TransactionFilterDraft>(DEFAULT_FILTERS);
  const [categorySearch, setCategorySearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [optionsRetryIndex, setOptionsRetryIndex] = useState(0);
  const [categorySelectorTransaction, setCategorySelectorTransaction] = useState<Transaction | null>(null);
  const [tagSelectorTransaction, setTagSelectorTransaction] = useState<Transaction | null>(null);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [categoryUpdatePending, setCategoryUpdatePending] = useState(false);
  const [tagUpdatePending, setTagUpdatePending] = useState(false);
  const [categoryUpdateError, setCategoryUpdateError] = useState<string | null>(null);
  const [tagUpdateError, setTagUpdateError] = useState<string | null>(null);

  const debouncedFilters = useDebouncedValue(filtersDraft, FILTER_DEBOUNCE_MS);
  const requestFilters = useMemo(() => toRequestFilters(debouncedFilters), [debouncedFilters]);

  const {
    transactions,
    totalCount,
    hasMore,
    loading,
    loadingMore,
    error,
    loadMoreError,
    retryInitialLoad,
    retryLoadMore,
    loadMore,
    replaceTransaction,
    removeTransaction,
  } = useTransactionsList(requestFilters);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const loadOptions = async (): Promise<void> => {
      setOptionsLoading(true);
      setOptionsError(null);

      try {
        const [fetchedCategories, fetchedTags] = await Promise.all([
          fetchCategories(abortController.signal),
          fetchTags(abortController.signal),
        ]);

        if (abortController.signal.aborted) {
          return;
        }

        setCategories([...fetchedCategories].sort(byCategoryOrder));
        setTags(fetchedTags);
      } catch (optionsRequestError) {
        if (optionsRequestError instanceof DOMException && optionsRequestError.name === "AbortError") {
          return;
        }

        setOptionsError(
          toErrorMessage(
            optionsRequestError,
            "Could not fetch categories and tags. You can still retry while browsing transactions.",
          ),
        );
      } finally {
        if (!abortController.signal.aborted) {
          setOptionsLoading(false);
        }
      }
    };

    void loadOptions();

    return () => {
      abortController.abort();
    };
  }, [optionsRetryIndex]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || loadingMore || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting) {
          void loadMore();
        }
      },
      {
        rootMargin: "240px",
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore, loading, loadingMore]);

  const activeFiltersCount = useMemo(() => countActiveFilters(filtersDraft), [filtersDraft]);
  const isDebouncing = useMemo(() => !areDraftsEqual(filtersDraft, debouncedFilters), [
    debouncedFilters,
    filtersDraft,
  ]);

  const retryOptions = useCallback(() => {
    setOptionsRetryIndex((current) => current + 1);
  }, []);

  const closeCategorySelector = useCallback(() => {
    setCategorySelectorTransaction(null);
    setCategoryUpdateError(null);
    setCategoryUpdatePending(false);
  }, []);

  const closeTagSelector = useCallback(() => {
    setTagSelectorTransaction(null);
    setTagUpdateError(null);
    setTagUpdatePending(false);
  }, []);

  const handleQuickCategoryConfirm = useCallback(
    async (nextCategoryId: number | null): Promise<void> => {
      if (!categorySelectorTransaction || categoryUpdatePending) {
        return;
      }

      if (categorySelectorTransaction.categoryId === nextCategoryId) {
        closeCategorySelector();
        return;
      }

      setCategoryUpdatePending(true);
      setCategoryUpdateError(null);

      try {
        const updatedTransaction = await updateTransaction(
          categorySelectorTransaction.id,
          buildUpdatePayload(categorySelectorTransaction, {
            categoryId: nextCategoryId,
          }),
        );

        replaceTransaction(updatedTransaction);
        closeCategorySelector();
      } catch (requestError) {
        setCategoryUpdateError(toErrorMessage(requestError, "Could not update transaction category."));
      } finally {
        setCategoryUpdatePending(false);
      }
    },
    [categorySelectorTransaction, categoryUpdatePending, closeCategorySelector, replaceTransaction],
  );

  const handleQuickTagsConfirm = useCallback(
    async (nextTags: string[]): Promise<void> => {
      if (!tagSelectorTransaction || tagUpdatePending) {
        return;
      }

      if (areTagsEqual(tagSelectorTransaction.tags, nextTags)) {
        closeTagSelector();
        return;
      }

      setTagUpdatePending(true);
      setTagUpdateError(null);

      try {
        const updatedTransaction = await updateTransaction(
          tagSelectorTransaction.id,
          buildUpdatePayload(tagSelectorTransaction, {
            tags: nextTags,
          }),
        );

        replaceTransaction(updatedTransaction);
        closeTagSelector();
      } catch (requestError) {
        setTagUpdateError(toErrorMessage(requestError, "Could not update transaction tags."));
      } finally {
        setTagUpdatePending(false);
      }
    },
    [closeTagSelector, replaceTransaction, tagSelectorTransaction, tagUpdatePending],
  );

  const hasEmptyState = !loading && !error && transactions.length === 0;

  return (
    <section className="flex flex-col gap-4">
      <TransactionsFiltersCard
        activeFiltersCount={activeFiltersCount}
        categories={categories}
        categorySearch={categorySearch}
        draft={filtersDraft}
        expanded={filtersExpanded}
        isDebouncing={isDebouncing}
        onCategorySearchChange={setCategorySearch}
        onDraftChange={setFiltersDraft}
        onRetryOptions={retryOptions}
        onSetExpanded={setFiltersExpanded}
        onTagSearchChange={setTagSearch}
        optionsError={optionsError}
        optionsLoading={optionsLoading}
        tagSearch={tagSearch}
        tags={tags}
      />

      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-semibold tracking-tight">Transactions</h2>
        <Badge variant="outline">{totalCount} records</Badge>
      </div>

      {loading && !error ? <TransactionsListSkeleton /> : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load transactions</AlertTitle>
          <AlertDescription className="gap-2">
            <p>{error}</p>
            <Button onClick={retryInitialLoad} size="sm" type="button" variant="outline">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {hasEmptyState ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-sm text-muted-foreground">
              No transactions match the current filters.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!error && transactions.length > 0 ? (
        <>
          <TransactionsMobileList
            onEditCategory={(transaction) => {
              setCategorySelectorTransaction(transaction);
              setCategoryUpdateError(null);
            }}
            onEditTags={(transaction) => {
              setTagSelectorTransaction(transaction);
              setTagUpdateError(null);
            }}
            onEditTransaction={setEditTransaction}
            transactions={transactions}
          />
          <TransactionsDesktopTable
            onEditCategory={(transaction) => {
              setCategorySelectorTransaction(transaction);
              setCategoryUpdateError(null);
            }}
            onEditTags={(transaction) => {
              setTagSelectorTransaction(transaction);
              setTagUpdateError(null);
            }}
            onEditTransaction={setEditTransaction}
            transactions={transactions}
          />
        </>
      ) : null}

      {!loading && loadMoreError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load more transactions</AlertTitle>
          <AlertDescription className="gap-2">
            <p>{loadMoreError}</p>
            <Button onClick={retryLoadMore} size="sm" type="button" variant="outline">
              Retry loading more
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && loadingMore ? (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
          <LoaderCircleIcon aria-hidden className="size-4 animate-spin" />
          Loading more transactions...
        </div>
      ) : null}

      {!loading && hasMore ? <div aria-hidden className="h-6" ref={sentinelRef} /> : null}

      <TransactionCategorySelectorDialog
        categories={categories}
        currentCategoryId={categorySelectorTransaction?.categoryId ?? null}
        description="Choose a category and confirm to apply."
        error={categoryUpdateError}
        onConfirm={handleQuickCategoryConfirm}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeCategorySelector();
          }
        }}
        open={categorySelectorTransaction !== null}
        pending={categoryUpdatePending}
        title="Update category"
      />

      <TransactionTagSelectorDialog
        availableTags={tags}
        description="Select tags and confirm to apply."
        error={tagUpdateError}
        initialTags={tagSelectorTransaction?.tags ?? []}
        onConfirm={handleQuickTagsConfirm}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeTagSelector();
          }
        }}
        open={tagSelectorTransaction !== null}
        pending={tagUpdatePending}
        title="Update tags"
      />

      <TransactionEditDialog
        availableTags={tags}
        categories={categories}
        onDeleted={(transactionId) => {
          removeTransaction(transactionId);
          setEditTransaction(null);
        }}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditTransaction(null);
          }
        }}
        onSaved={(updatedTransaction) => {
          replaceTransaction(updatedTransaction);
          setEditTransaction(null);
        }}
        open={editTransaction !== null}
        transaction={editTransaction}
      />
    </section>
  );
}
