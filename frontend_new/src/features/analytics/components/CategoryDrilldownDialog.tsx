import { ChevronRightIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { CategorySpendingItem } from "@/features/analytics/types";
import { formatMoney, formatSignedMoney, toTestIdSegment } from "@/features/analytics/utils";

interface CategoryDrilldownDialogProps {
  category: CategorySpendingItem | null;
  currency: string;
  rangeLabel: string;
  onClose: () => void;
  presentation?: "dialog" | "page";
}

function transactionTitle(note: string | null): string {
  const trimmedNote = note?.trim() ?? "";
  return trimmedNote || "No note";
}

function formatCategoryExpense(amount: number, currency: string): string {
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

export function CategoryDrilldownDialog({
  category,
  currency,
  rangeLabel,
  onClose,
  presentation = "dialog",
}: CategoryDrilldownDialogProps): JSX.Element {
  if (presentation === "page" && category === null) {
    return <></>;
  }

  const categoryIcon = category?.icon?.trim() || "category";
  const categoryColor = category?.color?.trim() || "#2d8cff";
  const categoryName = category?.categoryName ?? "Category";
  const categoryAmount = category?.amount ?? 0;

  const summary = (
    <header className="relative flex shrink-0 flex-col items-center px-6 pt-4 pb-7 text-center">
      {presentation === "dialog" ? (
        <Button
          aria-label="Close category drilldown"
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
        data-testid="analytics-drilldown-category-icon"
        style={{ color: categoryColor }}
      >
        <span aria-hidden className="material-symbols-outlined text-[2rem] leading-none">
          {categoryIcon}
        </span>
      </div>
      <p className="mt-4 text-sm font-bold tracking-[0.1em] text-slate-400 uppercase">{categoryName}</p>
      <h1
        className="mt-1 text-[clamp(2.35rem,12vw,3.7rem)] leading-none font-bold tracking-tight text-slate-50 tabular-nums"
        data-testid="analytics-drilldown-total"
      >
        {formatCategoryExpense(categoryAmount, currency)}
      </h1>
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
      {category && category.transactions.length > 0 ? (
        <div className="flex flex-col" data-testid="analytics-drilldown-list">
          {category.transactions.map((transaction, index) => (
            <div key={transaction.id}>
              {index > 0 ? <Separator className="bg-[#1d2b42]" /> : null}
              <article
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-0 py-5"
                data-testid={`analytics-drilldown-item-${transaction.id}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[1.1rem] leading-tight font-semibold text-slate-100">
                    {transactionTitle(transaction.note)}
                  </p>
                  <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
                    {transaction.tags.map((tag) => (
                      <Badge
                        className="rounded-full border-0 bg-[#102e57] px-2.5 py-1 text-[0.68rem] font-bold tracking-tight text-[#2d8cff] uppercase"
                        key={`${transaction.id}-${tag}`}
                        data-testid={`analytics-drilldown-tag-${toTestIdSegment(tag)}`}
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
                <div className="flex items-start gap-2">
                  <p className="shrink-0 text-[1.1rem] leading-tight font-bold tracking-tight text-slate-100 tabular-nums">
                    {formatSignedMoney(transaction.amount, transaction.currency || currency)}
                  </p>
                  <ChevronRightIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-[#50627b]" />
                </div>
              </article>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-2 py-8 text-center text-sm text-slate-400">
          No transactions in this category for the selected range.
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
      open={category !== null}
    >
      <DialogContent
        className="max-h-[92dvh] max-w-[calc(100%-1rem)] gap-0 overflow-hidden border-[#1d2b42] bg-[#0d172b] p-0 text-slate-100 sm:max-w-2xl"
        data-testid="analytics-drilldown-dialog"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{categoryName} transactions</DialogTitle>
          <DialogDescription>{rangeLabel}</DialogDescription>
        </DialogHeader>
        {summary}
        {transactionList}
      </DialogContent>
    </Dialog>
  );
}
