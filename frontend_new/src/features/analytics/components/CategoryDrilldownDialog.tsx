import { XIcon } from "lucide-react";
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
import {
  formatMoney,
  formatSignedMoney,
  formatTransactionDateTime,
  toTestIdSegment,
} from "@/features/analytics/utils";

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

  const drilldownBody = (
    <>
      {presentation === "page" ? (
        <header className="flex flex-col gap-3 border-b px-4 py-4 text-left sm:px-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold">{category?.categoryName ?? "Category"}</h1>
            <p className="text-sm text-muted-foreground">{rangeLabel}</p>
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p className="text-base font-semibold text-foreground">
              {formatMoney(category?.amount ?? 0, currency)}
            </p>
            <p>
              {(category?.transactionCount ?? 0).toString()} transaction
              {(category?.transactionCount ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
        </header>
      ) : (
        <DialogHeader className="gap-3 border-b px-4 py-4 text-left sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-lg">{category?.categoryName ?? "Category"}</DialogTitle>
              <DialogDescription>{rangeLabel}</DialogDescription>
            </div>
            <Button
              aria-label="Close category drilldown"
              data-testid="analytics-drilldown-close"
              onClick={onClose}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <XIcon data-icon="inline-end" />
            </Button>
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p className="text-base font-semibold text-foreground">
              {formatMoney(category?.amount ?? 0, currency)}
            </p>
            <p>
              {(category?.transactionCount ?? 0).toString()} transaction
              {(category?.transactionCount ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
        </DialogHeader>
      )}

        <div className="flex max-h-[62dvh] flex-col overflow-y-auto px-4 py-4 sm:px-6">
          {category && category.transactions.length > 0 ? (
            <div className="flex flex-col" data-testid="analytics-drilldown-list">
              {category.transactions.map((transaction, index) => (
                <div key={transaction.id}>
                  {index > 0 ? <Separator className="my-3" /> : null}
                  <div
                    className="flex items-start justify-between gap-3"
                    data-testid={`analytics-drilldown-item-${transaction.id}`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="truncate text-sm font-semibold">{transactionTitle(transaction.note)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTransactionDateTime(transaction.transactionDate)}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {transaction.tags.map((tag) => (
                          <Badge
                            key={`${transaction.id}-${tag}`}
                            data-testid={`analytics-drilldown-tag-${toTestIdSegment(tag)}`}
                            variant="secondary"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatSignedMoney(transaction.amount, transaction.currency || currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No transactions in this category for the selected range.</p>
          )}
        </div>

      {presentation === "page" ? null : (
        <div className="border-t px-4 py-3 sm:px-6">
          <Button className="w-full" onClick={onClose} type="button" variant="outline">
            Close
          </Button>
        </div>
      )}
    </>
  );

  if (presentation === "page") {
    return (
      <section
        className="mt-twa-page-safe-top fixed inset-0 z-30 flex min-h-0 w-full flex-col overflow-hidden bg-background"
        data-testid="analytics-drilldown-page"
      >
        {drilldownBody}
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
        className="max-h-[92dvh] max-w-[calc(100%-1rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        data-testid="analytics-drilldown-dialog"
        showCloseButton={false}
      >
        {drilldownBody}
      </DialogContent>
    </Dialog>
  );
}
