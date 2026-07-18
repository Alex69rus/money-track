import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, CalendarDaysIcon, TrendingUpIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CategoryIconGlyph } from "@/components/category-icon-glyph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeDateField } from "@/components/ui/native-date-field";
import { AnalyticsBreakdownPage } from "@/features/analytics/components/AnalyticsBreakdownPage";
import { CategoryDrilldownDialog } from "@/features/analytics/components/CategoryDrilldownDialog";
import { AnalyticsLoadingState } from "@/features/analytics/components/AnalyticsLoadingState";
import {
  useCategoryBreakdown,
  useMonthlyBreakdown,
  useTagBreakdown,
  useTransactionSummary,
} from "@/features/analytics/hooks/useAnalyticsResources";
import type { AnalyticsDrilldownItem } from "@/features/analytics/types";
import type { Transaction } from "@/types/transactions";
import {
  formatDateRangeLabel,
  formatMoney,
  formatSignedMoney,
  getCurrentMonthDateRange,
  getLastDaysDateRange,
  moneyToChartMagnitude,
  toTestIdSegment,
} from "@/features/analytics/utils";

type DatePreset = "current-month" | "last-7-days" | "last-30-days" | "custom";

interface AnalyticsRouteState {
  analyticsDateRange?: { fromDate: string; toDate: string };
  analyticsPreset?: DatePreset;
  mtReturnPath?: string;
}

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

const ANALYTICS_DISPLAY_CURRENCY = "AED";

function updateFromDate(currentToDate: string, nextFromDate: string): { fromDate: string; toDate: string } {
  if (!nextFromDate) {
    return { fromDate: "", toDate: currentToDate };
  }

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
  if (!nextToDate) {
    return { fromDate: currentFromDate, toDate: "" };
  }

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

function formatTrendSummaryMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) {
    return monthKey;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
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
  const location = useLocation();
  const navigate = useNavigate();
  const initialRouteState = location.state as AnalyticsRouteState | null;
  const [dateRange, setDateRange] = useState(
    () => initialRouteState?.analyticsDateRange ?? getCurrentMonthDateRange(),
  );
  const [activePreset, setActivePreset] = useState<DatePreset>(
    () => initialRouteState?.analyticsPreset ?? "current-month",
  );
  const [selectedTrendKey, setSelectedTrendKey] = useState<string | null>(null);
  const drilldownRoute = useMemo(() => {
    const routeMatch = /^\/analytics\/(category|tag)\/(.+)$/.exec(location.pathname);
    if (!routeMatch?.[1]) {
      return null;
    }

    try {
      return {
        key: decodeURIComponent(routeMatch[2] ?? ""),
        kind: routeMatch[1] as "category" | "tag",
      };
    } catch {
      return null;
    }
  }, [location.pathname]);
  const breakdownKind = useMemo<"category" | "tag" | null>(() => {
    if (location.pathname === "/analytics/categories") {
      return "category";
    }

    if (location.pathname === "/analytics/tags") {
      return "tag";
    }

    return null;
  }, [location.pathname]);

  const summaryResource = useTransactionSummary(dateRange);
  const categoryResource = useCategoryBreakdown(dateRange);
  const tagResource = useTagBreakdown(dateRange);
  const monthlyResource = useMonthlyBreakdown(dateRange);
  const loading =
    summaryResource.loading || categoryResource.loading || tagResource.loading || monthlyResource.loading;
  const error =
    summaryResource.error ?? categoryResource.error ?? tagResource.error ?? monthlyResource.error;
  const retry = useCallback(() => {
    summaryResource.retry();
    categoryResource.retry();
    tagResource.retry();
    monthlyResource.retry();
  }, [categoryResource, monthlyResource, summaryResource, tagResource]);
  const categorySpending = categoryResource.data;
  const tagSpending = tagResource.data;
  const monthlyTrends = monthlyResource.data;
  const categoryPreview = useMemo(() => categorySpending.slice(0, 5), [categorySpending]);
  const tagPreview = useMemo(() => tagSpending.slice(0, 5), [tagSpending]);

  const selectedDrilldown = useMemo<AnalyticsDrilldownItem | null>(() => {
    if (!drilldownRoute) {
      return null;
    }

    if (drilldownRoute.kind === "category") {
      const item = categorySpending.find((categoryItem) => categoryItem.key === drilldownRoute.key);
      return item ? { kind: "category", item } : null;
    }

    const item = tagSpending.find((tagItem) => tagItem.key === drilldownRoute.key);
    return item ? { kind: "tag", item } : null;
  }, [categorySpending, drilldownRoute, tagSpending]);

  useEffect(() => {
    if (!loading && drilldownRoute && !selectedDrilldown) {
      navigate("/analytics", { replace: true });
    }
  }, [drilldownRoute, loading, navigate, selectedDrilldown]);

  const closeDrilldown = (): void => {
    const routeState = location.state as { mtReturnPath?: string } | null;
    if (routeState?.mtReturnPath) {
      navigate(-1);
      return;
    }

    navigate("/analytics", { replace: true });
  };

  const trendMaxValue = useMemo(() => {
    const maxSeriesValue = monthlyTrends.reduce(
      (maxValue, monthItem) =>
        Math.max(maxValue, moneyToChartMagnitude(monthItem.expenses), moneyToChartMagnitude(monthItem.income)),
      0,
    );

    return Math.max(1, maxSeriesValue);
  }, [monthlyTrends]);

  useEffect(() => {
    setSelectedTrendKey((current) => {
      if (current && monthlyTrends.some((monthItem) => monthItem.key === current)) {
        return current;
      }

      return monthlyTrends[monthlyTrends.length - 1]?.key ?? null;
    });
  }, [monthlyTrends]);

  const selectedTrend = useMemo(
    () => monthlyTrends.find((monthItem) => monthItem.key === selectedTrendKey) ?? null,
    [monthlyTrends, selectedTrendKey],
  );

  const hasNoData = !loading && !error && summaryResource.data.transactionCount === 0;

  const applyPreset = (preset: Exclude<DatePreset, "custom">): void => {
    const presetConfig = DATE_PRESET_DEFINITIONS.find((entry) => entry.id === preset);
    if (!presetConfig) {
      return;
    }

    setDateRange(presetConfig.getRange());
    setActivePreset(preset);
  };

  const analyticsRouteState = (mtReturnPath: string): AnalyticsRouteState => ({
    analyticsDateRange: dateRange,
    analyticsPreset: activePreset,
    mtReturnPath,
  });

  const openTransactionEditor = (transaction: Transaction): void => {
    navigate(`/transactions/${transaction.id}/edit`, {
      state: {
        mtReturnPath: location.pathname,
        transaction,
      },
    });
  };

  return (
    <section
      className="relative flex min-h-full shrink-0 flex-col gap-5 overflow-x-hidden"
      data-testid="analytics-page"
    >
      <div className="rounded-[1.6rem] border border-border bg-card p-4 shadow-[0_14px_28px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-[#2d8cff] text-[#071a2c]">
              <span aria-hidden className="material-symbols-outlined text-[1rem] leading-none">
                bar_chart
              </span>
            </div>
            <h2 className="text-[1.75rem] font-semibold tracking-tight text-foreground">Analytics</h2>
          </div>
          <Button
            aria-label="Date range controls"
            className="size-9 rounded-full border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <CalendarDaysIcon className="size-5" />
          </Button>
        </div>

        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-testid="analytics-date-presets"
        >
          {DATE_PRESET_DEFINITIONS.map((preset) => (
            <Button
              className={
                activePreset === preset.id
                  ? "h-9 shrink-0 rounded-full bg-[#2d8cff] px-4 text-sm font-semibold text-white hover:bg-[#2d8cff]/90"
                  : "h-9 shrink-0 rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-accent"
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

        <div
          className="mt-3 grid min-w-0 max-w-full grid-cols-1 gap-2 overflow-hidden sm:grid-cols-2"
          data-testid="analytics-date-range-card"
        >
          <div className="min-w-0 flex flex-col gap-1">
            <label className="px-1 text-[0.68rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase" htmlFor="analytics-from-date">
              From
            </label>
            <NativeDateField
              ariaLabel="Analytics from date"
              className="rounded-xl border-input bg-input text-sm text-foreground focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/55"
              id="analytics-from-date"
              inputTestId="analytics-from-date"
              onChange={(event) => {
                setDateRange((current) => updateFromDate(current.toDate, event.target.value));
                setActivePreset("custom");
              }}
              onClear={() => {
                setDateRange((current) => ({ ...current, fromDate: "" }));
                setActivePreset("custom");
              }}
              value={dateRange.fromDate}
            />
          </div>
          <div className="min-w-0 flex flex-col gap-1">
            <label className="px-1 text-[0.68rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase" htmlFor="analytics-to-date">
              To
            </label>
            <NativeDateField
              ariaLabel="Analytics to date"
              className="rounded-xl border-input bg-input text-sm text-foreground focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/55"
              id="analytics-to-date"
              inputTestId="analytics-to-date"
              onChange={(event) => {
                setDateRange((current) => updateToDate(current.fromDate, event.target.value));
                setActivePreset("custom");
              }}
              onClear={() => {
                setDateRange((current) => ({ ...current, toDate: "" }));
                setActivePreset("custom");
              }}
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
            className="gap-0 overflow-hidden rounded-[1.45rem] border-border bg-card text-card-foreground shadow-[0_14px_28px_rgba(0,0,0,0.18)]"
            data-testid="analytics-summary-card"
          >
            <CardHeader className="gap-2 border-b border-border pb-3">
              <CardTitle className="flex items-center justify-center gap-2 text-[0.88rem] font-bold tracking-[0.09em] text-muted-foreground uppercase">
                <TrendingUpIcon />
                Balance Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-3" data-testid="analytics-summary-content">
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-sm font-medium text-muted-foreground">Net Cash Flow</p>
                <p
                  className="w-full overflow-hidden px-1 text-center text-[clamp(1.9rem,10.3vw,3.2rem)] leading-[0.95] font-bold tracking-tight text-[#2d8cff]"
                  data-testid="analytics-balance-value"
                >
                  {formatSignedMoney(summaryResource.data.balance, ANALYTICS_DISPLAY_CURRENCY)}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="analytics-summary-count">
                  {summaryResource.data.transactionCount.toString()} transaction
                  {summaryResource.data.transactionCount === 1 ? "" : "s"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-0 border-t border-border pt-3">
                <div className="border-r border-border pr-3 text-center">
                  <p className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[0.09em] text-emerald-400 uppercase">
                    <ArrowDownIcon className="size-4" />
                    Income
                  </p>
                  <p className="pt-1 text-[1.1rem] font-bold tracking-tight text-foreground">
                    {formatMoney(summaryResource.data.totalIncome, ANALYTICS_DISPLAY_CURRENCY)}
                  </p>
                  <p className="text-xs font-semibold text-emerald-400">Total in range</p>
                </div>
                <div className="pl-3 text-center">
                  <p className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[0.09em] text-rose-400 uppercase">
                    <ArrowUpIcon className="size-4" />
                    Expense
                  </p>
                  <p className="pt-1 text-[1.1rem] font-bold tracking-tight text-foreground">
                    {formatMoney(summaryResource.data.totalExpenses, ANALYTICS_DISPLAY_CURRENCY)}
                  </p>
                  <p className="text-xs font-semibold text-rose-400">Total in range</p>
                </div>
              </div>

            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card
              className="overflow-hidden rounded-[1.45rem] border-border bg-card text-card-foreground shadow-[0_14px_28px_rgba(0,0,0,0.15)]"
              data-testid="analytics-category-card"
            >
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
                  Spendings by Category
                </CardTitle>
                <Button
                  className="h-auto p-0 text-[1.05rem] font-semibold text-[#2d8cff] hover:text-[#4ca0ff]"
                  data-testid="analytics-category-view-all"
                  disabled={categorySpending.length === 0}
                  onClick={() => {
                    navigate("/analytics/categories", { state: { mtReturnPath: location.pathname } });
                  }}
                  type="button"
                  variant="ghost"
                >
                  View all
                </Button>
              </CardHeader>
              <CardContent className="p-0" data-testid="analytics-category-list">
                {categoryPreview.length > 0 ? (
                  categoryPreview.map((categoryItem) => {
                    const categoryColor = normalizeHexColor(categoryItem.color ?? "");
                    const iconForeground = categoryColor ? `#${categoryColor}` : "#2d8cff";
                    const barColor = categoryColor ? `#${categoryColor}` : "#2d8cff";

                    return (
                      <button
                        className="flex w-full min-w-0 items-center justify-between gap-3 border-b border-border p-4 text-left transition-colors last:border-b-0 hover:bg-accent"
                        data-testid={`analytics-category-item-${categoryItem.key}`}
                        key={categoryItem.key}
                        onClick={() => {
                          navigate(`/analytics/category/${encodeURIComponent(categoryItem.key)}`, {
                            state: analyticsRouteState(location.pathname),
                          });
                        }}
                        type="button"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className="flex size-12 shrink-0 items-center justify-center rounded-xl"
                            data-testid={`analytics-category-icon-${categoryItem.key}`}
                            style={{
                              backgroundColor: withAlpha(categoryColor, 0.24, "rgba(45, 140, 255, 0.18)"),
                              color: iconForeground,
                            }}
                          >
                            <CategoryIconGlyph
                              category={
                                categoryItem.categoryId === null
                                  ? null
                                  : {
                                      icon: categoryItem.icon,
                                      name: categoryItem.categoryName,
                                    }
                              }
                              className="material-symbols-outlined text-[1.45rem] leading-none"
                              fallbackClassName="text-lg font-semibold"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-lg font-semibold">{categoryItem.categoryName}</p>
                            <div className="mt-1.5 h-2 w-full max-w-40 rounded-full bg-secondary">
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
                          {formatMoney(categoryItem.amount, ANALYTICS_DISPLAY_CURRENCY)}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <p className="p-4 text-sm text-muted-foreground" data-testid="analytics-category-empty">
                    No expense categories in this range.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card
              className="overflow-hidden rounded-[1.45rem] border-border bg-card text-card-foreground shadow-[0_14px_28px_rgba(0,0,0,0.15)]"
              data-testid="analytics-tags-card"
            >
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
                  Spendings by Tags
                </CardTitle>
                <Button
                  className="h-auto p-0 text-[1.05rem] font-semibold text-[#2d8cff] hover:text-[#4ca0ff]"
                  data-testid="analytics-tag-view-all"
                  disabled={tagSpending.length === 0}
                  onClick={() => {
                    navigate("/analytics/tags", { state: { mtReturnPath: location.pathname } });
                  }}
                  type="button"
                  variant="ghost"
                >
                  View all
                </Button>
              </CardHeader>
              <CardContent className="p-0" data-testid="analytics-tag-list">
                {tagPreview.length > 0 ? (
                  tagPreview.map((tagItem, index) => (
                    <button
                      className="flex w-full min-w-0 items-center justify-between gap-3 border-b border-border p-4 text-left transition-colors last:border-b-0 hover:bg-accent"
                      data-testid={`analytics-tag-item-${toTestIdSegment(tagItem.key)}`}
                      key={tagItem.key}
                      onClick={() => {
                          navigate(`/analytics/tag/${encodeURIComponent(tagItem.key)}`, {
                            state: analyticsRouteState(location.pathname),
                        });
                      }}
                      type="button"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div
                          className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor: index === 0 ? "rgba(45, 140, 255, 0.2)" : "var(--mt-color-secondary)",
                            color: index === 0 ? "#2d8cff" : "var(--mt-color-muted-foreground)",
                          }}
                        >
                          <span aria-hidden className="material-symbols-outlined text-[1.2rem] leading-none">
                            sell
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-semibold">#{tagItem.tag}</p>
                          <div className="mt-1.5 h-1.5 w-28 rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(2, tagItem.share * 100).toFixed(2)}%`,
                                backgroundColor: index === 0 ? "#2d8cff" : "var(--mt-color-muted-foreground)",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="shrink-0 pl-2 text-right text-lg font-bold tracking-tight tabular-nums sm:text-xl">
                        {formatMoney(tagItem.amount, ANALYTICS_DISPLAY_CURRENCY)}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="p-4 text-sm text-muted-foreground" data-testid="analytics-tags-empty">
                    No tagged expenses in this range.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card
            className="gap-0 overflow-hidden rounded-[1.45rem] border-border bg-card text-card-foreground shadow-[0_14px_28px_rgba(0,0,0,0.15)]"
            data-testid="analytics-trends-card"
          >
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">Monthly Trends</CardTitle>
              <div className="flex items-center gap-4 text-xs font-semibold tracking-[0.08em] text-secondary-foreground uppercase">
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
            <CardContent className="flex flex-col pt-4" data-testid="analytics-trends-content">
              {monthlyTrends.length > 0 ? (
                <>
                  {selectedTrend ? (
                    <div className="mb-4 rounded-xl border border-border bg-secondary px-3 py-2.5" data-testid="analytics-trend-summary">
                      <div
                        className="mb-2 flex items-baseline justify-between gap-3 border-b border-border pb-2"
                        data-testid="analytics-trend-summary-header"
                      >
                        <p className="text-sm font-semibold text-foreground" data-testid="analytics-trend-summary-month">
                          {formatTrendSummaryMonth(selectedTrend.key)}
                        </p>
                        <p
                          className="shrink-0 whitespace-nowrap text-right text-sm font-bold text-[#2d8cff] tabular-nums"
                          data-testid="analytics-trend-summary-net"
                        >
                          {formatSignedMoney(selectedTrend.balance, ANALYTICS_DISPLAY_CURRENCY)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                        <p className="text-[0.65rem] font-semibold tracking-[0.08em] text-emerald-400 uppercase">Income</p>
                        <p className="mt-0.5 whitespace-nowrap text-sm font-bold text-foreground tabular-nums" data-testid="analytics-trend-summary-income">
                          {formatMoney(selectedTrend.income, ANALYTICS_DISPLAY_CURRENCY)}
                        </p>
                        </div>
                        <div className="border-l border-border pl-3">
                        <p className="text-[0.65rem] font-semibold tracking-[0.08em] text-rose-400 uppercase">Expense</p>
                        <p className="mt-0.5 whitespace-nowrap text-sm font-bold text-foreground tabular-nums" data-testid="analytics-trend-summary-expense">
                          {formatMoney(selectedTrend.expenses, ANALYTICS_DISPLAY_CURRENCY)}
                        </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {monthlyTrends.map((monthItem) => {
                    const incomeMagnitude = moneyToChartMagnitude(monthItem.income);
                    const expenseMagnitude = moneyToChartMagnitude(monthItem.expenses);
                    const incomeHeight = incomeMagnitude > 0 ? Math.max(4, (incomeMagnitude / trendMaxValue) * 100) : 0;
                    const expenseHeight = expenseMagnitude > 0 ? Math.max(4, (expenseMagnitude / trendMaxValue) * 100) : 0;
                    const monthLabel = monthItem.monthLabel.split(" ")[0] ?? monthItem.monthLabel;
                    const isActive = monthItem.key === selectedTrendKey;

                    return (
                      <button
                        aria-label={`Select ${monthItem.monthLabel}: income ${formatMoney(monthItem.income, ANALYTICS_DISPLAY_CURRENCY)}, expense ${formatMoney(monthItem.expenses, ANALYTICS_DISPLAY_CURRENCY)}`}
                        aria-pressed={isActive}
                        className="flex w-16 shrink-0 flex-col items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                        data-testid={`analytics-trend-item-${monthItem.key}`}
                        key={monthItem.key}
                        onClick={() => setSelectedTrendKey(monthItem.key)}
                        type="button"
                      >
                        <div className={isActive ? "flex h-28 w-full items-end gap-1 rounded-lg bg-secondary px-1.5 pb-1.5" : "flex h-28 w-full items-end gap-1 px-1.5 pb-1.5"}>
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
                      </button>
                    );
                  })}
                  </div>
                </>
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
        currency={ANALYTICS_DISPLAY_CURRENCY}
        dateRange={dateRange}
        drilldown={selectedDrilldown}
        onClose={closeDrilldown}
        onEditTransaction={openTransactionEditor}
        presentation="page"
        rangeLabel={formatDateRangeLabel(dateRange)}
      />

      {breakdownKind === "category" ? (
        <AnalyticsBreakdownPage
          currency={ANALYTICS_DISPLAY_CURRENCY}
          items={categorySpending}
          kind="category"
          onClose={closeDrilldown}
          onSelect={(categoryItem) => {
            navigate(`/analytics/category/${encodeURIComponent(categoryItem.key)}`, {
              state: analyticsRouteState(location.pathname),
            });
          }}
          rangeLabel={formatDateRangeLabel(dateRange)}
        />
      ) : null}

      {breakdownKind === "tag" ? (
        <AnalyticsBreakdownPage
          currency={ANALYTICS_DISPLAY_CURRENCY}
          items={tagSpending}
          kind="tag"
          onClose={closeDrilldown}
          onSelect={(tagItem) => {
            navigate(`/analytics/tag/${encodeURIComponent(tagItem.key)}`, {
              state: analyticsRouteState(location.pathname),
            });
          }}
          rangeLabel={formatDateRangeLabel(dateRange)}
        />
      ) : null}
    </section>
  );
}
