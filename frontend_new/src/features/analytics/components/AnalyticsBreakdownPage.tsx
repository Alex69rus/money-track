import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CategorySpendingItem, TagSpendingItem } from "@/features/analytics/types";
import { formatMoney, toTestIdSegment } from "@/features/analytics/utils";
import { isTelegramWebAppAvailable } from "@/services/telegram/webapp";

type AnalyticsBreakdownPageProps =
  | {
      kind: "category";
      currency: string;
      items: CategorySpendingItem[];
      rangeLabel: string;
      onClose: () => void;
      onSelect: (item: CategorySpendingItem) => void;
    }
  | {
      kind: "tag";
      currency: string;
      items: TagSpendingItem[];
      rangeLabel: string;
      onClose: () => void;
      onSelect: (item: TagSpendingItem) => void;
    };

interface BreakdownRow {
  amount: number;
  backgroundColor: string;
  foregroundColor: string;
  icon: string;
  isFallbackIcon: boolean;
  key: string;
  name: string;
  onSelect: () => void;
  testId: string;
  transactionCount: number;
}

function toHexPair(value: string): string {
  return `${value}${value}`;
}

function normalizeHexColor(color: string | null): string | null {
  const raw = color?.trim() ?? "";
  if (!raw.startsWith("#")) {
    return null;
  }

  const value = raw.slice(1);
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return `${toHexPair(value[0] ?? "0")}${toHexPair(value[1] ?? "0")}${toHexPair(value[2] ?? "0")}`.toLowerCase();
  }

  return /^[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : null;
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

export function AnalyticsBreakdownPage(props: AnalyticsBreakdownPageProps): JSX.Element {
  const isCategory = props.kind === "category";
  const title = isCategory ? "All Categories" : "All Tags";
  const description = isCategory ? "Spendings by category" : "Spendings by tag";
  const isTelegramHost = isTelegramWebAppAvailable();
  const rows: BreakdownRow[] =
    props.kind === "category"
      ? props.items.map((item) => {
          const color = normalizeHexColor(item.color);
          const icon = item.icon?.trim() || "?";

          return {
            amount: item.amount,
            backgroundColor: withAlpha(color, 0.24, "rgba(45, 140, 255, 0.18)"),
            foregroundColor: color ? `#${color}` : "#2d8cff",
            icon,
            isFallbackIcon: icon === "?",
            key: item.key,
            name: item.categoryName,
            onSelect: () => props.onSelect(item),
            testId: item.key,
            transactionCount: item.transactionCount,
          };
        })
      : props.items.map((item, index) => ({
          amount: item.amount,
          backgroundColor: index === 0 ? "rgba(45, 140, 255, 0.2)" : "#30445e",
          foregroundColor: index === 0 ? "#2d8cff" : "#8ea4bd",
          icon: "sell",
          isFallbackIcon: false,
          key: item.key,
          name: `#${item.tag}`,
          onSelect: () => props.onSelect(item),
          testId: toTestIdSegment(item.key),
          transactionCount: item.transactionCount,
        }));

  return (
    <section
      className="mt-twa-page-safe-top fixed inset-0 z-30 flex min-h-0 w-full flex-col overflow-hidden bg-[#0d172b] text-slate-100"
      data-testid={`analytics-${props.kind}-breakdown-page`}
    >
      <header className="relative shrink-0 border-b border-[#1d2b42] px-5 pt-4 pb-5 text-center">
        {!isTelegramHost ? (
          <Button
            aria-label={`Close ${props.kind} breakdown`}
            className="absolute top-3 right-3 rounded-full text-slate-400 hover:bg-white/10 hover:text-slate-100"
            data-testid="analytics-breakdown-close"
            onClick={props.onClose}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <XIcon />
          </Button>
        ) : null}
        <p className="text-xs font-bold tracking-[0.1em] text-slate-400 uppercase">{description}</p>
        <h1 className="mt-1 text-[1.8rem] font-bold tracking-tight text-slate-50">{title}</h1>
        <p className="mt-1 text-sm font-medium text-slate-500" data-testid="analytics-breakdown-range">
          {props.rangeLabel}
        </p>
        <p className="mt-2 text-xs font-semibold tracking-[0.08em] text-slate-400 uppercase" data-testid="analytics-breakdown-count">
          {props.items.length} {props.items.length === 1 ? "item" : "items"}
        </p>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="analytics-breakdown-scroll"
      >
        <div className="overflow-hidden rounded-2xl border border-[#20344f]/80 bg-[#16253a]/92">
          {rows.map((row) => {
            return (
              <button
                className="flex w-full min-w-0 items-center justify-between gap-3 border-b border-[#20344f]/65 p-4 text-left transition-colors last:border-b-0 hover:bg-[#1b2e47]"
                data-testid={`analytics-breakdown-item-${props.kind}-${row.testId}`}
                key={row.key}
                onClick={row.onSelect}
                type="button"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: row.backgroundColor,
                      color: row.foregroundColor,
                    }}
                  >
                    {row.isFallbackIcon ? (
                      <span aria-hidden className="text-lg font-semibold">
                        ?
                      </span>
                    ) : (
                      <span aria-hidden className="material-symbols-outlined text-[1.2rem] leading-none">
                        {row.icon}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold text-slate-100">{row.name}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {row.transactionCount} transaction{row.transactionCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 whitespace-nowrap pl-2 text-right text-lg font-bold tracking-tight text-slate-100 tabular-nums">
                  {formatMoney(row.amount, props.currency)}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
