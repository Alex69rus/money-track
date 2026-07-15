import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAnalyticsTransactions } from "@/features/analytics/hooks/useAnalyticsTransactions";
import {
  buildAnalyticsModel,
  formatMoney,
  formatSignedMoney,
  getCurrentMonthDateRange,
  resolveCurrencyDisplay,
} from "@/features/analytics/utils";
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

interface TransactionRouteState {
  mtReturnPath?: string;
  transaction?: Transaction;
}

function readRouteTransaction(
  transactionId: number | undefined,
  transactions: Transaction[],
  state: unknown,
): Transaction | null {
  if (!transactionId) {
    return null;
  }

  const loadedTransaction = transactions.find((transaction) => transaction.id === transactionId);
  if (loadedTransaction) {
    return loadedTransaction;
  }

  if (typeof state === "object" && state !== null && "transaction" in state) {
    const routeTransaction = (state as TransactionRouteState).transaction;
    if (routeTransaction?.id === transactionId) {
      return routeTransaction;
    }
  }

  return null;
}

function parseTransactionRoute(pathname: string): {
  editTransactionId?: number;
  editSubpage: "none" | "category" | "tags";
  filterTags?: boolean;
  quickCategoryTransactionId?: number;
  quickTagTransactionId?: number;
} {
  if (pathname === "/transactions/filters/tags") {
    return { editSubpage: "none", filterTags: true };
  }

  const editMatch = /^\/transactions\/(\d+)\/edit(?:\/(category|tags))?$/.exec(pathname);
  if (editMatch) {
    return {
      editTransactionId: Number(editMatch[1]),
      editSubpage: editMatch[2] === "category" || editMatch[2] === "tags" ? editMatch[2] : "none",
    };
  }

  const quickCategoryMatch = /^\/transactions\/(\d+)\/category$/.exec(pathname);
  if (quickCategoryMatch) {
    return {
      quickCategoryTransactionId: Number(quickCategoryMatch[1]),
      editSubpage: "none",
    };
  }

  const quickTagMatch = /^\/transactions\/(\d+)\/tags$/.exec(pathname);
  if (quickTagMatch) {
    return {
      quickTagTransactionId: Number(quickTagMatch[1]),
      editSubpage: "none",
    };
  }

  return { editSubpage: "none" };
}

export function TransactionsPage(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [filtersDraft, setFiltersDraft] = useState<TransactionFilterDraft>(DEFAULT_FILTERS);
  const [categorySearch, setCategorySearch] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [optionsRetryIndex, setOptionsRetryIndex] = useState(0);
  const [categoryUpdatePending, setCategoryUpdatePending] = useState(false);
  const [tagUpdatePending, setTagUpdatePending] = useState(false);
  const [categoryUpdateError, setCategoryUpdateError] = useState<string | null>(null);
  const [tagUpdateError, setTagUpdateError] = useState<string | null>(null);

  const debouncedFilters = useDebouncedValue(filtersDraft, FILTER_DEBOUNCE_MS);
  const requestFilters = useMemo(() => toRequestFilters(debouncedFilters), [debouncedFilters]);

  const {
    transactions,
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
  const currentMonthDateRange = getCurrentMonthDateRange();
  const {
    transactions: currentMonthTransactions,
    loading: currentMonthSnapshotLoading,
    error: currentMonthSnapshotError,
    retry: retryCurrentMonthSnapshot,
  } = useAnalyticsTransactions(currentMonthDateRange);
  const currentMonthSnapshot = useMemo(() => buildAnalyticsModel(currentMonthTransactions).summary, [currentMonthTransactions]);
  const currentMonthCurrency = useMemo(
    () => resolveCurrencyDisplay(currentMonthTransactions).currency,
    [currentMonthTransactions],
  );

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

  const transactionRoute = useMemo(() => parseTransactionRoute(location.pathname), [location.pathname]);
  const quickCategoryTransaction = readRouteTransaction(
    transactionRoute.quickCategoryTransactionId,
    transactions,
    location.state,
  );
  const quickTagTransaction = readRouteTransaction(
    transactionRoute.quickTagTransactionId,
    transactions,
    location.state,
  );
  const editTransaction = readRouteTransaction(
    transactionRoute.editTransactionId,
    transactions,
    location.state,
  );

  const navigateBack = useCallback(() => {
    const routeState = location.state as TransactionRouteState | null;
    if (routeState?.mtReturnPath) {
      navigate(-1);
      return;
    }

    navigate("/transactions", { replace: true });
  }, [location.state, navigate]);

  const openTransactionRoute = useCallback(
    (path: string, transaction: Transaction): void => {
      navigate(path, {
        state: {
          mtReturnPath: location.pathname,
          transaction,
        } satisfies TransactionRouteState,
      });
    },
    [location.pathname, navigate],
  );

  const closeCategorySelector = useCallback(() => {
    setCategoryUpdateError(null);
    setCategoryUpdatePending(false);
    navigateBack();
  }, [navigateBack]);

  const closeTagSelector = useCallback(() => {
    setTagUpdateError(null);
    setTagUpdatePending(false);
    navigateBack();
  }, [navigateBack]);

  const handleQuickCategoryConfirm = useCallback(
    async (nextCategoryId: number | null): Promise<void> => {
      if (!quickCategoryTransaction || categoryUpdatePending) {
        return;
      }

      if (quickCategoryTransaction.categoryId === nextCategoryId) {
        closeCategorySelector();
        return;
      }

      setCategoryUpdatePending(true);
      setCategoryUpdateError(null);

      try {
        const updatedTransaction = await updateTransaction(
          quickCategoryTransaction.id,
          buildUpdatePayload(quickCategoryTransaction, {
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
    [categoryUpdatePending, closeCategorySelector, quickCategoryTransaction, replaceTransaction],
  );

  const handleQuickTagsConfirm = useCallback(
    async (nextTags: string[]): Promise<void> => {
      if (!quickTagTransaction || tagUpdatePending) {
        return;
      }

      if (areTagsEqual(quickTagTransaction.tags, nextTags)) {
        closeTagSelector();
        return;
      }

      setTagUpdatePending(true);
      setTagUpdateError(null);

      try {
        const updatedTransaction = await updateTransaction(
          quickTagTransaction.id,
          buildUpdatePayload(quickTagTransaction, {
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
    [closeTagSelector, quickTagTransaction, replaceTransaction, tagUpdatePending],
  );

  const hasEmptyState = !loading && !error && transactions.length === 0;
  return (
    <section className="relative flex min-h-full shrink-0 flex-col gap-4">
      <Card className="mt-balance-card overflow-hidden border-0 py-0 text-primary-foreground">
        <CardContent className="relative flex flex-col gap-5 p-5">
          <div className="mt-balance-glow mt-balance-glow-top" />
          <div className="mt-balance-glow mt-balance-glow-bottom" />
          <div className="relative z-10 flex flex-col gap-5" aria-live="polite">
            {currentMonthSnapshotLoading ? (
              <p className="py-5 text-sm font-medium text-primary-foreground/80">Loading current-month snapshot...</p>
            ) : currentMonthSnapshotError ? (
              <div className="flex flex-col gap-3 py-1">
                <p className="text-sm font-medium text-primary-foreground/80">Could not load the current-month snapshot.</p>
                <Button
                  className="w-fit border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={retryCurrentMonthSnapshot}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Retry snapshot
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-primary-foreground/80">Balance Snapshot</p>
                  <p className="text-3xl font-bold tracking-tight" data-testid="transactions-balance-value">
                    {formatSignedMoney(currentMonthSnapshot.balance, currentMonthCurrency)}
                  </p>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-primary-foreground/75">
                      Monthly Income
                    </span>
                    <span className="text-sm font-semibold" data-testid="transactions-monthly-income">
                      {formatSignedMoney(currentMonthSnapshot.totalIncome, currentMonthCurrency)}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-primary-foreground/20" />
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-primary-foreground/75">
                      Monthly Expense
                    </span>
                    <span className="text-sm font-semibold" data-testid="transactions-monthly-expense">
                      -{formatMoney(currentMonthSnapshot.totalExpenses, currentMonthCurrency)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <TransactionsFiltersCard
        activeFiltersCount={activeFiltersCount}
        categories={categories}
        categorySearch={categorySearch}
        draft={filtersDraft}
        expanded={filtersExpanded}
        isDebouncing={isDebouncing}
        onCategorySearchChange={setCategorySearch}
        onDraftChange={setFiltersDraft}
        onOpenTagSelector={() => {
          navigate("/transactions/filters/tags", {
            state: { mtReturnPath: location.pathname } satisfies TransactionRouteState,
          });
        }}
        onRetryOptions={retryOptions}
        onSetExpanded={setFiltersExpanded}
        optionsError={optionsError}
        optionsLoading={optionsLoading}
        tags={tags}
      />

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
              setCategoryUpdateError(null);
              openTransactionRoute(`/transactions/${transaction.id}/category`, transaction);
            }}
            onEditTags={(transaction) => {
              setTagUpdateError(null);
              openTransactionRoute(`/transactions/${transaction.id}/tags`, transaction);
            }}
            onEditTransaction={(transaction) => {
              openTransactionRoute(`/transactions/${transaction.id}/edit`, transaction);
            }}
            transactions={transactions}
          />
          <TransactionsDesktopTable
            onEditCategory={(transaction) => {
              setCategoryUpdateError(null);
              openTransactionRoute(`/transactions/${transaction.id}/category`, transaction);
            }}
            onEditTags={(transaction) => {
              setTagUpdateError(null);
              openTransactionRoute(`/transactions/${transaction.id}/tags`, transaction);
            }}
            onEditTransaction={(transaction) => {
              openTransactionRoute(`/transactions/${transaction.id}/edit`, transaction);
            }}
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
        currentCategoryId={quickCategoryTransaction?.categoryId ?? null}
        description="Choose a category for your transaction"
        error={categoryUpdateError}
        onConfirm={handleQuickCategoryConfirm}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeCategorySelector();
          }
        }}
        open={quickCategoryTransaction !== null}
        pending={categoryUpdatePending}
        presentation="page"
        title="Select Category"
      />

      <TransactionTagSelectorDialog
        availableTags={tags}
        description="Choose tags for your transaction"
        error={tagUpdateError}
        initialTags={quickTagTransaction?.tags ?? []}
        onConfirm={handleQuickTagsConfirm}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeTagSelector();
          }
        }}
        open={quickTagTransaction !== null}
        pending={tagUpdatePending}
        presentation="page"
        title="Add tags"
      />

      <TransactionTagSelectorDialog
        allowCreate={false}
        availableTags={tags}
        description="Choose transaction tags to filter the list"
        error={null}
        initialTags={filtersDraft.tags}
        onConfirm={(nextTags) => {
          setFiltersDraft((current) => ({ ...current, tags: nextTags }));
          navigateBack();
        }}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            navigateBack();
          }
        }}
        open={transactionRoute.filterTags === true}
        pending={false}
        presentation="page"
        title="Filter tags"
      />

      <TransactionEditDialog
        availableTags={tags}
        categories={categories}
        onDeleted={(transactionId) => {
          removeTransaction(transactionId);
          retryCurrentMonthSnapshot();
        }}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            navigateBack();
          }
        }}
        onSaved={(updatedTransaction) => {
          replaceTransaction(updatedTransaction);
          retryCurrentMonthSnapshot();
        }}
        activeSubpage={transactionRoute.editSubpage}
        onOpenCategoryPage={() => {
          if (editTransaction) {
            openTransactionRoute(`/transactions/${editTransaction.id}/edit/category`, editTransaction);
          }
        }}
        onOpenTagsPage={() => {
          if (editTransaction) {
            openTransactionRoute(`/transactions/${editTransaction.id}/edit/tags`, editTransaction);
          }
        }}
        open={editTransaction !== null}
        presentation="page"
        transaction={editTransaction}
      />
    </section>
  );
}
