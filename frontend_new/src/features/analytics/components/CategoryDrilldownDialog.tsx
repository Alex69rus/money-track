import { PencilIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryIconGlyph, type CategoryIconData } from "@/components/category-icon-glyph";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { AnalyticsDrilldownItem } from "@/features/analytics/types";
import { formatMoney, formatSignedMoney, toTestIdSegment } from "@/features/analytics/utils";
import type { Transaction } from "@/types/transactions";

interface CategoryDrilldownDialogProps {
  drilldown: AnalyticsDrilldownItem | null;
  currency: string;
  rangeLabel: string;
  onClose: () => void;
  onEditTransaction?: (transaction: Transaction) => void;
  presentation?: "dialog" | "page";
}

function transactionTitle(note: string | null): string {
  const trimmedNote = note?.trim() ?? "";
  return trimmedNote || "No note";
}

function formatDrilldownExpense(amount: number, currency: string): string {
  return `-${formatMoney(Math.abs(amount), currency)}`;
}

function formatTransactionMeta(date: Date): string {
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return `${dateLabel} • ${timeLabel}`;
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

function TransactionCategoryAffordance({ transaction }: { transaction: Transaction }): JSX.Element {
  const category = transaction.category;
  const color = normalizeHexColor(category?.color ?? null);
  const foreground = color ? `#${color}` : "#2d8cff";

  return (
    <div
      aria-label={category ? `Category ${category.name}` : "Uncategorized"}
      className="flex size-10 shrink-0 items-center justify-center rounded-xl"
      data-testid={`analytics-drilldown-transaction-category-${transaction.id}`}
      style={{ backgroundColor: withAlpha(color, 0.22, "rgba(45, 140, 255, 0.18)"), color: foreground }}
    >
      <CategoryIconGlyph
        category={category}
        className="material-symbols-outlined text-[1.25rem] leading-none"
        fallbackClassName="text-base font-semibold"
      />
    </div>
  );
}

export function CategoryDrilldownDialog({
  drilldown,
  currency,
  rangeLabel,
  onClose,
  onEditTransaction,
  presentation = "dialog",
}: CategoryDrilldownDialogProps): JSX.Element {
  if (presentation === "page" && drilldown === null) {
    return <></>;
  }

  const drilldownSummary =
    drilldown?.kind === "tag"
      ? {
          emptyLabel: "tag",
          subjectCategory: null,
          subjectAmount: drilldown.item.amount,
          subjectColor: "#2d8cff",
          subjectIcon: "sell",
          subjectLabel: "Spendings by Tag",
          subjectName: `#${drilldown.item.tag}`,
          transactions: drilldown.item.transactions,
        }
      : drilldown
        ? {
          emptyLabel: "category",
            subjectCategory: {
              icon: drilldown.item.icon,
              name: drilldown.item.categoryName,
            } satisfies CategoryIconData,
            subjectAmount: drilldown.item.amount,
            subjectColor: drilldown.item.color?.trim() || "#2d8cff",
            subjectIcon: drilldown.item.icon?.trim() || null,
            subjectLabel: "Spendings by Category",
            subjectName: drilldown.item.categoryName,
            transactions: drilldown.item.transactions,
          }
        : {
            emptyLabel: "category",
            subjectCategory: null,
            subjectAmount: 0,
            subjectColor: "#2d8cff",
            subjectIcon: "category",
            subjectLabel: "Spendings by Category",
            subjectName: "Category",
            transactions: [],
          };

  const summary = (
    <header className="relative flex shrink-0 flex-col items-center px-6 pt-4 pb-7 text-center">
      {presentation === "dialog" ? (
        <Button
          aria-label="Close analytics drilldown"
          className="absolute top-3 right-3 rounded-full text-slate-400 hover:bg-white/10 hover:text-slate-100"
          data-testid="analytics-drilldown-close"
          onClick={onClose}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <XIcon />
        </Button>
      ) : null}

      <div
        className="flex size-14 items-center justify-center rounded-2xl bg-[#123460] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        data-testid="analytics-drilldown-icon"
        style={{ color: drilldownSummary.subjectColor }}
      >
        {drilldownSummary.subjectIcon ? (
          <span aria-hidden className="material-symbols-outlined text-[2rem] leading-none">
            {drilldownSummary.subjectIcon}
          </span>
        ) : (
          <CategoryIconGlyph
            category={drilldownSummary.subjectCategory}
            className="material-symbols-outlined text-[2rem] leading-none"
            fallbackClassName="text-xl font-semibold"
          />
        )}
      </div>
      <p className="mt-4 text-sm font-bold tracking-[0.1em] text-slate-400 uppercase" data-testid="analytics-drilldown-label">
        {drilldownSummary.subjectLabel}
      </p>
      <h1 className="mt-1 truncate text-[1.45rem] font-bold tracking-tight text-slate-100" data-testid="analytics-drilldown-subject">
        {drilldownSummary.subjectName}
      </h1>
      <p
        className="mt-2 whitespace-nowrap text-[clamp(2.1rem,10vw,3.4rem)] leading-none font-bold tracking-tight text-slate-50 tabular-nums"
        data-testid="analytics-drilldown-total"
      >
        {formatDrilldownExpense(drilldownSummary.subjectAmount, currency)}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-500" data-testid="analytics-drilldown-range">
        {rangeLabel}
      </p>
    </header>
  );

  const transactionList = (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-1 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-testid="analytics-drilldown-scroll"
    >
      {drilldownSummary.transactions.length > 0 ? (
        <div className="flex flex-col" data-testid="analytics-drilldown-list">
          {drilldownSummary.transactions.map((transaction, index) => (
            <div key={transaction.id}>
              {index > 0 ? <Separator className="bg-[#1d2b42]" /> : null}
              <article
                className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-x-3 px-0 py-5"
                data-testid={`analytics-drilldown-item-${transaction.id}`}
              >
                <TransactionCategoryAffordance transaction={transaction} />
                <div className="min-w-0">
                  <p className="truncate text-[1.1rem] leading-tight font-semibold text-slate-100">
                    {transactionTitle(transaction.note)}
                  </p>
                  <p className="mt-1 truncate text-xs font-medium text-slate-500">
                    {transaction.category?.name ?? "Uncategorized"}
                  </p>
                  <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
                    {transaction.tags.map((tag) => (
                      <Badge
                        className="rounded-full border-0 bg-[#102e57] px-2.5 py-1 text-[0.68rem] font-bold tracking-tight text-[#2d8cff] uppercase"
                        data-testid={`analytics-drilldown-tag-${toTestIdSegment(tag)}`}
                        key={`${transaction.id}-${tag}`}
                        variant="secondary"
                      >
                        #{tag}
                      </Badge>
                    ))}
                    <span aria-hidden className="size-1 shrink-0 rounded-full bg-[#32445e]" />
                    <span className="whitespace-nowrap text-xs font-medium text-slate-500">
                      {formatTransactionMeta(transaction.transactionDate)}
                    </span>
                  </div>
                </div>
                <p className="shrink-0 whitespace-nowrap text-[1.1rem] leading-tight font-bold tracking-tight text-slate-100 tabular-nums">
                  {formatSignedMoney(transaction.amount, transaction.currency || currency)}
                </p>
                {onEditTransaction ? (
                  <Button
                    aria-label={`Edit transaction ${transaction.id}`}
                    className="-mr-1 -mt-1 shrink-0 rounded-full text-slate-400 hover:bg-white/10 hover:text-slate-100"
                    data-testid={`analytics-drilldown-edit-${transaction.id}`}
                    onClick={() => onEditTransaction(transaction)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <PencilIcon aria-hidden data-icon="inline-start" />
                  </Button>
                ) : null}
              </article>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-2 py-8 text-center text-sm text-slate-400">
          No transactions in this {drilldownSummary.emptyLabel} for the selected range.
        </p>
      )}
    </div>
  );

  if (presentation === "page") {
    return (
      <section
        className="mt-twa-page-safe-top fixed inset-0 z-30 flex min-h-0 w-full flex-col overflow-hidden bg-[#0d172b] text-slate-100"
        data-testid="analytics-drilldown-page"
      >
        {summary}
        {transactionList}
      </section>
    );
  }

  return (
    <Dialog
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
      open={drilldown !== null}
    >
      <DialogContent
        className="max-h-[92dvh] max-w-[calc(100%-1rem)] gap-0 overflow-hidden border-[#1d2b42] bg-[#0d172b] p-0 text-slate-100 sm:max-w-2xl"
        data-testid="analytics-drilldown-dialog"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{drilldownSummary.subjectName} transactions</DialogTitle>
          <DialogDescription>{rangeLabel}</DialogDescription>
        </DialogHeader>
        {summary}
        {transactionList}
      </DialogContent>
    </Dialog>
  );
}
