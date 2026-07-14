import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatSignedAmount, formatTransactionTime, groupTransactionsByDay } from "@/features/transactions/utils";
import type { Transaction } from "@/types/transactions";

interface TransactionsMobileListProps {
  transactions: Transaction[];
  onEditCategory: (transaction: Transaction) => void;
  onEditTags: (transaction: Transaction) => void;
  onEditTransaction: (transaction: Transaction) => void;
}

function getCategoryIconName(transaction: Transaction): string | null {
  const iconName = transaction.category?.icon?.trim();
  if (!iconName) {
    return null;
  }

  return iconName;
}

function amountClassName(amount: number): string {
  if (amount >= 0) {
    return "text-sm font-bold text-primary";
  }

  return "text-sm font-bold text-foreground";
}

export function TransactionsMobileList({
  transactions,
  onEditCategory,
  onEditTags,
  onEditTransaction,
}: TransactionsMobileListProps): JSX.Element {
  const groups = groupTransactionsByDay(transactions);

  return (
    <div className="flex flex-col gap-6 md:hidden">
      {groups.map((group) => (
        <section className="flex flex-col gap-2" key={group.key}>
          <div className="flex items-center justify-between gap-2 px-1">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {group.label}
            </h3>
            <p className="text-xs text-muted-foreground">
              {formatSignedAmount(group.total, group.transactions[0]?.currency ?? "AED")}
            </p>
          </div>

          <Card className="overflow-hidden rounded-xl border-border/70 bg-card/70 py-0">
            <CardContent className="p-0">
              <ul className="divide-y">
                {group.transactions.map((transaction) => {
                  const categoryIcon = getCategoryIconName(transaction);

                  return (
                    <li
                      className="relative px-4 py-3.5"
                      data-testid={`tx-mobile-row-${transaction.id}`}
                      key={transaction.id}
                    >
                      <button
                        aria-label={`Edit transaction ${transaction.id}`}
                        className="absolute inset-0 z-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        data-testid={`tx-mobile-edit-${transaction.id}`}
                        onClick={() => onEditTransaction(transaction)}
                        type="button"
                      />

                      <div className="pointer-events-none relative z-10 flex min-w-0 items-start gap-3">
                        <button
                          aria-label={
                            transaction.category
                              ? `Change category for transaction ${transaction.id}`
                              : `Choose category for transaction ${transaction.id}`
                          }
                          className="pointer-events-auto mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                          data-testid={`tx-mobile-category-${transaction.id}`}
                          onClick={() => onEditCategory(transaction)}
                          type="button"
                        >
                          {categoryIcon ? (
                            <span aria-hidden className="material-symbols-outlined text-[18px]">
                              {categoryIcon}
                            </span>
                          ) : (
                            <span aria-hidden className="text-base font-semibold">?</span>
                          )}
                        </button>

                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="min-w-0 flex-1 truncate text-sm font-medium">
                              {transaction.note?.trim() || transaction.category?.name || "Untitled transaction"}
                            </p>
                            <p
                              className={`${amountClassName(transaction.amount)} shrink-0 whitespace-nowrap tabular-nums`}
                              data-testid={`tx-mobile-amount-${transaction.id}`}
                            >
                              {formatSignedAmount(transaction.amount, transaction.currency)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{formatTransactionTime(transaction.transactionDate)}</span>
                            {transaction.category ? <span>• {transaction.category.name}</span> : null}
                          </div>

                          <div className="flex items-center gap-2">
                            {transaction.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {transaction.tags.slice(0, 3).map((tag) => (
                                  <Badge className="rounded-md text-[10px]" key={`${transaction.id}-${tag}`} variant="secondary">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">No tags</span>
                            )}
                            <button
                              aria-label={`Edit tags for transaction ${transaction.id}`}
                              className="pointer-events-auto flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary"
                              data-testid={`tx-mobile-tags-${transaction.id}`}
                              onClick={() => onEditTags(transaction)}
                              type="button"
                            >
                              <PlusIcon aria-hidden className="size-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
}
