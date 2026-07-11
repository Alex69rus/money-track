import { useEffect, useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, CalendarDaysIcon, TrendingUpIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function toHexPair(value: string): string {
  return `${value}${value}`;
}

function normalizeHexColor(color: string): string | null {
  const raw = color.trim();
  if (!raw.startsWith("#")) {
    return null;
  }

  const value = raw.slice(1);
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return `${toHexPair(value[0] ?? "0")}${toHexPair(value[1] ?? "0")}${toHexPair(value[2] ?? "0")}`.toLowerCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }

  return null;
}

function withAlpha(hexColor: string | null, alpha: number, fallback: string): string {
  if (!hexColor) {
    return fallback;
  }

  const red = Number.parseInt(hexColor.slice(0, 2), 16);
  const green = Number.parseInt(hexColor.slice(2, 4), 16);
  const blue = Number.parseInt(hexColor.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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
    <section className="flex flex-col gap-5 overflow-x-hidden" data-testid="analytics-page">
      <div className="rounded-[1.6rem] border border-[#20344f]/80 bg-[#0f1d2f]/88 p-4 shadow-[0_14px_28px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-[#2d8cff] text-[#071a2c]">
              <span aria-hidden className="material-symbols-outlined text-[1rem] leading-none">
                bar_chart
              </span>
            </div>
            <h2 className="text-[1.75rem] font-semibold tracking-tight text-slate-100">Analytics</h2>
          </div>
          <Button
            aria-label="Date range controls"
            className="size-9 rounded-full border border-white/10 text-slate-300 hover:bg-white/10 hover:text-slate-100"
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <CalendarDaysIcon className="size-5" />
          </Button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {DATE_PRESET_DEFINITIONS.map((preset) => (
            <Button
              className={
                activePreset === preset.id
                  ? "h-9 shrink-0 rounded-full bg-[#2d8cff] px-4 text-sm font-semibold text-white hover:bg-[#2d8cff]/90"
                  : "h-9 shrink-0 rounded-full bg-[#1b2b43] px-4 text-sm font-medium text-slate-200 hover:bg-[#24354f]"
              }
              data-testid={`analytics-preset-${preset.id}`}
              key={preset.id}
              onClick={() => {
                applyPreset(preset.id);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              {preset.id === "current-month" ? formatDateRangeLabel(dateRange) : preset.label}
            </Button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 min-[430px]:grid-cols-2" data-testid="analytics-date-range-card">
          <div className="min-w-0 flex flex-col gap-1">
            <label className="px-1 text-[0.68rem] font-semibold tracking-[0.08em] text-slate-400 uppercase" htmlFor="analytics-from-date">
              From
            </label>
            <Input
              aria-label="Analytics from date"
              className="mt-analytics-date-input h-9 rounded-xl border-[#2a3b52] bg-[#16263b] text-sm text-slate-100 focus-visible:border-[#2d8cff] focus-visible:ring-1 focus-visible:ring-[#2d8cff]/55"
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
          <div className="min-w-0 flex flex-col gap-1">
            <label className="px-1 text-[0.68rem] font-semibold tracking-[0.08em] text-slate-400 uppercase" htmlFor="analytics-to-date">
              To
            </label>
            <Input
              aria-label="Analytics to date"
              className="mt-analytics-date-input h-9 rounded-xl border-[#2a3b52] bg-[#16263b] text-sm text-slate-100 focus-visible:border-[#2d8cff] focus-visible:ring-1 focus-visible:ring-[#2d8cff]/55"
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
      </div>

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

          <Card
            className="overflow-hidden rounded-[1.45rem] border-[#20344f]/80 bg-[#16253a]/92 text-slate-100 shadow-[0_14px_28px_rgba(0,0,0,0.18)]"
            data-testid="analytics-summary-card"
          >
            <CardHeader className="gap-2 border-b border-[#20344f]/70 pb-4">
              <CardTitle className="flex items-center justify-center gap-2 text-[0.88rem] font-bold tracking-[0.09em] text-slate-400 uppercase">
                <TrendingUpIcon />
                Balance Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 pt-4">
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-sm font-medium text-slate-400">Net Cash Flow</p>
                <p
                  className="w-full overflow-hidden px-1 text-center text-[clamp(1.9rem,10.3vw,3.2rem)] leading-[0.95] font-bold tracking-tight text-[#2d8cff]"
                  data-testid="analytics-balance-value"
                >
                  {formatSignedMoney(analytics.summary.balance, currencyDisplay.currency)}
                </p>
                <p className="text-xs text-slate-500" data-testid="analytics-summary-count">
                  {analytics.summary.transactionCount.toString()} transaction
                  {analytics.summary.transactionCount === 1 ? "" : "s"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-0 border-t border-[#20344f]/70 pt-4">
                <div className="border-r border-[#20344f]/70 pr-3 text-center">
                  <p className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[0.09em] text-emerald-400 uppercase">
                    <ArrowDownIcon className="size-4" />
                    Income
                  </p>
                  <p className="pt-1 text-[1.1rem] font-bold tracking-tight text-slate-100">
                    {formatMoney(analytics.summary.totalIncome, currencyDisplay.currency)}
                  </p>
                  <p className="text-xs font-semibold text-emerald-400">Total in range</p>
                </div>
                <div className="pl-3 text-center">
                  <p className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[0.09em] text-rose-400 uppercase">
                    <ArrowUpIcon className="size-4" />
                    Expense
                  </p>
                  <p className="pt-1 text-[1.1rem] font-bold tracking-tight text-slate-100">
                    {formatMoney(analytics.summary.totalExpenses, currencyDisplay.currency)}
                  </p>
                  <p className="text-xs font-semibold text-rose-400">Total in range</p>
                </div>
              </div>

              <div className="rounded-xl border border-[#20344f]/70 bg-[#1a2b43]/75 px-4 py-3">
                <p className="text-xs font-semibold tracking-[0.08em] text-slate-400 uppercase">Average Transaction</p>
                <p className="pt-1 text-lg font-semibold text-slate-100">
                  {formatMoney(analytics.summary.averageTransaction, currencyDisplay.currency)}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card
              className="overflow-hidden rounded-[1.45rem] border-[#20344f]/80 bg-[#16253a]/92 text-slate-100 shadow-[0_14px_28px_rgba(0,0,0,0.15)]"
              data-testid="analytics-category-card"
            >
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#20344f]/70 pb-4">
                <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-slate-100">
                  Spendings by Category
                </CardTitle>
                <Button
                  className="h-auto p-0 text-[1.05rem] font-semibold text-[#2d8cff] hover:text-[#4ca0ff]"
                  type="button"
                  variant="ghost"
                >
                  View all
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {analytics.categorySpending.length > 0 ? (
                  analytics.categorySpending.map((categoryItem) => {
                    const categoryColor = normalizeHexColor(categoryItem.color ?? "");
                    const iconForeground = categoryColor ? `#${categoryColor}` : "#2d8cff";
                    const barColor = categoryColor ? `#${categoryColor}` : "#2d8cff";

                    return (
                      <button
                        className="flex w-full min-w-0 items-center justify-between gap-3 border-b border-[#20344f]/65 p-4 text-left transition-colors last:border-b-0 hover:bg-[#1b2e47]"
                        data-testid={`analytics-category-item-${categoryItem.key}`}
                        key={categoryItem.key}
                        onClick={() => {
                          setSelectedCategoryKey(categoryItem.key);
                        }}
                        type="button"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className="flex size-12 shrink-0 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor: withAlpha(categoryColor, 0.24, "rgba(45, 140, 255, 0.18)"),
                              color: iconForeground,
                            }}
                          >
                            {categoryItem.icon ? (
                              <span aria-hidden className="material-symbols-outlined text-[1.45rem] leading-none">
                                {categoryItem.icon}
                              </span>
                            ) : (
                              <span className="text-lg font-semibold">#</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-lg font-semibold">{categoryItem.categoryName}</p>
                            <div className="mt-1.5 h-2 w-full max-w-40 rounded-full bg-[#3c4f67]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(2, categoryItem.share * 100).toFixed(2)}%`,
                                  backgroundColor: barColor,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <p
                          className="shrink-0 pl-2 text-right text-lg font-bold tracking-tight tabular-nums sm:text-xl"
                          data-testid={`analytics-category-amount-${categoryItem.key}`}
                        >
                          {formatMoney(categoryItem.amount, currencyDisplay.currency)}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <p className="p-4 text-sm text-slate-400" data-testid="analytics-category-empty">
                    No expense categories in this range.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card
              className="overflow-hidden rounded-[1.45rem] border-[#20344f]/80 bg-[#16253a]/92 text-slate-100 shadow-[0_14px_28px_rgba(0,0,0,0.15)]"
              data-testid="analytics-tags-card"
            >
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#20344f]/70 pb-4">
                <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-slate-100">
                  Spendings by Tags
                </CardTitle>
                <Button
                  className="h-auto p-0 text-[1.05rem] font-semibold text-[#2d8cff] hover:text-[#4ca0ff]"
                  type="button"
                  variant="ghost"
                >
                  View all
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {analytics.tagSpending.length > 0 ? (
                  analytics.tagSpending.map((tagItem, index) => (
                    <div
                      className="flex items-center justify-between gap-3 border-b border-[#20344f]/65 p-4 last:border-b-0"
                      data-testid={`analytics-tag-item-${tagItem.key}`}
                      key={tagItem.key}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div
                          className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor: index === 0 ? "rgba(45, 140, 255, 0.2)" : "#30445e",
                            color: index === 0 ? "#2d8cff" : "#8ea4bd",
                          }}
                        >
                          <span aria-hidden className="material-symbols-outlined text-[1.2rem] leading-none">
                            sell
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-semibold">#{tagItem.tag}</p>
                          <div className="mt-1.5 h-1.5 w-28 rounded-full bg-[#4a5e76]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(2, tagItem.share * 100).toFixed(2)}%`,
                                backgroundColor: index === 0 ? "#2d8cff" : "#a9bad0",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="shrink-0 pl-2 text-right text-lg font-bold tracking-tight tabular-nums sm:text-xl">
                        {formatMoney(tagItem.amount, currencyDisplay.currency)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-sm text-slate-400" data-testid="analytics-tags-empty">
                    No tagged expenses in this range.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card
            className="overflow-hidden rounded-[1.45rem] border-[#20344f]/80 bg-[#16253a]/92 text-slate-100 shadow-[0_14px_28px_rgba(0,0,0,0.15)]"
            data-testid="analytics-trends-card"
          >
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#20344f]/70 pb-4">
              <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-slate-100">Monthly Trends</CardTitle>
              <div className="flex items-center gap-4 text-xs font-semibold tracking-[0.08em] text-slate-200 uppercase">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#2d8cff]" />
                  Income
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#fb4a70]" />
                  Expense
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {analytics.monthlyTrends.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {analytics.monthlyTrends.map((monthItem) => {
                    const incomeHeight = monthItem.income > 0 ? Math.max(4, (monthItem.income / trendMaxValue) * 100) : 0;
                    const expenseHeight =
                      monthItem.expenses > 0 ? Math.max(4, (monthItem.expenses / trendMaxValue) * 100) : 0;
                    const monthLabel = monthItem.monthLabel.split(" ")[0] ?? monthItem.monthLabel;
                    const isActive = monthItem === analytics.monthlyTrends[analytics.monthlyTrends.length - 1];

                    return (
                      <div
                        className="flex w-16 shrink-0 flex-col items-center gap-3"
                        data-testid={`analytics-trend-item-${monthItem.key}`}
                        key={monthItem.key}
                      >
                        <div className={isActive ? "flex h-36 w-full items-end gap-1 rounded-lg bg-[#1d314a] px-1.5 pb-1.5" : "flex h-36 w-full items-end gap-1 px-1.5 pb-1.5"}>
                          <div className="flex h-full flex-1 items-end">
                            <div
                              className={isActive ? "w-full rounded-sm bg-[#2d8cff]" : "w-full rounded-sm bg-[#2d8cff]/55"}
                              style={{ height: `${incomeHeight.toFixed(2)}%` }}
                            />
                          </div>
                          <div className="flex h-full flex-1 items-end">
                            <div
                              className={isActive ? "w-full rounded-sm bg-[#fb4a70]" : "w-full rounded-sm bg-[#fb4a70]/55"}
                              style={{ height: `${expenseHeight.toFixed(2)}%` }}
                            />
                          </div>
                        </div>
                        <p className={isActive ? "text-sm font-semibold text-[#2d8cff]" : "text-sm font-medium text-slate-400"}>
                          {monthLabel}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400" data-testid="analytics-trends-empty">
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
