import { useEffect, useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, CalendarDaysIcon, TrendingUpIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CategoryDrilldownDialog } from "@/features/analytics/components/CategoryDrilldownDialog";
import { AnalyticsLoadingState } from "@/features/analytics/components/AnalyticsLoadingState";
import { useAnalyticsTransactions } from "@/features/analytics/hooks/useAnalyticsTransactions";
import {
  buildAnalyticsModel,
  formatDateRangeLabel,
  formatMoney,
  formatSignedMoney,
  getCurrentMonthDateRange,
  getLastDaysDateRange,
  resolveCurrencyDisplay,
} from "@/features/analytics/utils";

type DatePreset = "current-month" | "last-7-days" | "last-30-days" | "custom";

const DATE_PRESET_DEFINITIONS: Array<{
  id: Exclude<DatePreset, "custom">;
  label: string;
  getRange: () => { fromDate: string; toDate: string };
}> = [
  {
    id: "current-month",
    label: "This Month",
    getRange: getCurrentMonthDateRange,
  },
  {
    id: "last-7-days",
    label: "Last 7 Days",
    getRange: () => getLastDaysDateRange(7),
  },
  {
    id: "last-30-days",
    label: "Last 30 Days",
    getRange: () => getLastDaysDateRange(30),
  },
];

function updateFromDate(currentToDate: string, nextFromDate: string): { fromDate: string; toDate: string } {
  if (nextFromDate > currentToDate) {
    return {
      fromDate: nextFromDate,
      toDate: nextFromDate,
    };
  }

  return {
    fromDate: nextFromDate,
    toDate: currentToDate,
  };
}

function updateToDate(currentFromDate: string, nextToDate: string): { fromDate: string; toDate: string } {
  if (nextToDate < currentFromDate) {
    return {
      fromDate: nextToDate,
      toDate: nextToDate,
    };
  }

  return {
    fromDate: currentFromDate,
    toDate: nextToDate,
  };
}

export function AnalyticsPage(): JSX.Element {
  const [dateRange, setDateRange] = useState(getCurrentMonthDateRange);
  const [activePreset, setActivePreset] = useState<DatePreset>("current-month");
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);

  const { transactions, loading, error, retry } = useAnalyticsTransactions(dateRange);

  const analytics = useMemo(() => buildAnalyticsModel(transactions), [transactions]);
  const currencyDisplay = useMemo(() => resolveCurrencyDisplay(transactions), [transactions]);

  const selectedCategory = useMemo(
    () =>
      selectedCategoryKey
        ? analytics.categorySpending.find((categoryItem) => categoryItem.key === selectedCategoryKey) ?? null
        : null,
    [analytics.categorySpending, selectedCategoryKey],
  );

  useEffect(() => {
    if (selectedCategoryKey && !selectedCategory) {
      setSelectedCategoryKey(null);
    }
  }, [selectedCategory, selectedCategoryKey]);

  const trendMaxValue = useMemo(() => {
    const maxSeriesValue = analytics.monthlyTrends.reduce(
      (maxValue, monthItem) => Math.max(maxValue, monthItem.expenses, monthItem.income),
      0,
    );

    return Math.max(1, maxSeriesValue);
  }, [analytics.monthlyTrends]);

  const hasNoData = !loading && !error && analytics.summary.transactionCount === 0;

  const applyPreset = (preset: Exclude<DatePreset, "custom">): void => {
    const presetConfig = DATE_PRESET_DEFINITIONS.find((entry) => entry.id === preset);
    if (!presetConfig) {
      return;
    }

    setDateRange(presetConfig.getRange());
    setActivePreset(preset);
  };

  return (
    <section className="flex flex-col gap-4" data-testid="analytics-page">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground">Date-range insights with category drilldown.</p>
        </div>
        {currencyDisplay.isMixed ? <Badge variant="secondary">Mixed currencies</Badge> : null}
      </div>

      <Card data-testid="analytics-date-range-card">
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDaysIcon />
            Date Range
          </CardTitle>
          <CardDescription data-testid="analytics-range-label">{formatDateRangeLabel(dateRange)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="analytics-from-date">
                From
              </label>
              <Input
                aria-label="Analytics from date"
                data-testid="analytics-from-date"
                id="analytics-from-date"
                onChange={(event) => {
                  setDateRange((current) => updateFromDate(current.toDate, event.target.value));
                  setActivePreset("custom");
                }}
                type="date"
                value={dateRange.fromDate}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="analytics-to-date">
                To
              </label>
              <Input
                aria-label="Analytics to date"
                data-testid="analytics-to-date"
                id="analytics-to-date"
                onChange={(event) => {
                  setDateRange((current) => updateToDate(current.fromDate, event.target.value));
                  setActivePreset("custom");
                }}
                type="date"
                value={dateRange.toDate}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {DATE_PRESET_DEFINITIONS.map((preset) => (
              <Button
                data-testid={`analytics-preset-${preset.id}`}
                key={preset.id}
                onClick={() => {
                  applyPreset(preset.id);
                }}
                size="sm"
                type="button"
                variant={activePreset === preset.id ? "default" : "secondary"}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? <AnalyticsLoadingState /> : null}

      {!loading && error ? (
        <Alert data-testid="analytics-error" variant="destructive">
          <AlertTitle>Could not load analytics</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{error}</span>
            <div>
              <Button data-testid="analytics-retry" onClick={retry} size="sm" type="button" variant="outline">
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && !error ? (
        <>
          {hasNoData ? (
            <Alert data-testid="analytics-no-data">
              <AlertTitle>No transactions for this range</AlertTitle>
              <AlertDescription>
                Try a broader date range to see spending and trend analytics.
              </AlertDescription>
            </Alert>
          ) : null}

          <Card data-testid="analytics-summary-card">
            <CardHeader className="gap-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon />
                Balance Snapshot
              </CardTitle>
              <CardDescription>Summary metrics for the selected period.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Net cash flow</p>
                <p className="text-3xl font-bold" data-testid="analytics-balance-value">
                  {formatSignedMoney(analytics.summary.balance, currencyDisplay.currency)}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="analytics-summary-count">
                  {analytics.summary.transactionCount.toString()} transaction
                  {analytics.summary.transactionCount === 1 ? "" : "s"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-card p-3">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <ArrowDownIcon />
                    Income
                  </p>
                  <p className="text-base font-semibold">
                    {formatMoney(analytics.summary.totalIncome, currencyDisplay.currency)}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <ArrowUpIcon />
                    Expense
                  </p>
                  <p className="text-base font-semibold">
                    {formatMoney(analytics.summary.totalExpenses, currencyDisplay.currency)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Average transaction
                </p>
                <p className="text-base font-semibold">
                  {formatMoney(analytics.summary.averageTransaction, currencyDisplay.currency)}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card data-testid="analytics-category-card">
              <CardHeader className="gap-2">
                <CardTitle className="text-base">Spending by Category</CardTitle>
                <CardDescription>Tap any category to open transaction drilldown.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {analytics.categorySpending.length > 0 ? (
                  analytics.categorySpending.map((categoryItem) => (
                    <button
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                      data-testid={`analytics-category-item-${categoryItem.key}`}
                      key={categoryItem.key}
                      onClick={() => {
                        setSelectedCategoryKey(categoryItem.key);
                      }}
                      type="button"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="truncate text-sm font-semibold">{categoryItem.categoryName}</p>
                        <div className="h-1.5 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(2, categoryItem.share * 100).toFixed(2)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {categoryItem.transactionCount.toString()} transaction
                          {categoryItem.transactionCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p
                        className="shrink-0 text-sm font-semibold"
                        data-testid={`analytics-category-amount-${categoryItem.key}`}
                      >
                        {formatMoney(categoryItem.amount, currencyDisplay.currency)}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="analytics-category-empty">
                    No expense categories in this range.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="analytics-tags-card">
              <CardHeader className="gap-2">
                <CardTitle className="text-base">Spending by Tags</CardTitle>
                <CardDescription>Top expense tags for the selected period.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {analytics.tagSpending.length > 0 ? (
                  analytics.tagSpending.map((tagItem) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      data-testid={`analytics-tag-item-${tagItem.key}`}
                      key={tagItem.key}
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="truncate text-sm font-semibold">#{tagItem.tag}</p>
                        <div className="h-1 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(2, tagItem.share * 100).toFixed(2)}%` }}
                          />
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">
                        {formatMoney(tagItem.amount, currencyDisplay.currency)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="analytics-tags-empty">
                    No tagged expenses in this range.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="analytics-trends-card">
            <CardHeader className="gap-2">
              <CardTitle className="text-base">Monthly Trends</CardTitle>
              <CardDescription>Income vs expense trend for the latest months with activity.</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.monthlyTrends.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {analytics.monthlyTrends.map((monthItem) => {
                    const incomeHeight = monthItem.income > 0 ? Math.max(4, (monthItem.income / trendMaxValue) * 100) : 0;
                    const expenseHeight =
                      monthItem.expenses > 0 ? Math.max(4, (monthItem.expenses / trendMaxValue) * 100) : 0;

                    return (
                      <div
                        className="flex w-16 shrink-0 flex-col items-center gap-2"
                        data-testid={`analytics-trend-item-${monthItem.key}`}
                        key={monthItem.key}
                      >
                        <div className="flex h-32 w-full items-end gap-1 rounded-lg border p-2">
                          <div className="flex h-full flex-1 items-end">
                            <div
                              className="w-full rounded-sm bg-primary/70"
                              style={{ height: `${incomeHeight.toFixed(2)}%` }}
                            />
                          </div>
                          <div className="flex h-full flex-1 items-end">
                            <div
                              className="w-full rounded-sm bg-destructive/70"
                              style={{ height: `${expenseHeight.toFixed(2)}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">{monthItem.monthLabel}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="analytics-trends-empty">
                  No monthly trend data in this range.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <CategoryDrilldownDialog
        category={selectedCategory}
        currency={currencyDisplay.currency}
        onClose={() => {
          setSelectedCategoryKey(null);
        }}
        rangeLabel={formatDateRangeLabel(dateRange)}
      />
    </section>
  );
}
