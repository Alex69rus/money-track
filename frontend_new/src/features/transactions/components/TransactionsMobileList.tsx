import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatSignedAmount, formatTransactionTime, groupTransactionsByDay } from "@/features/transactions/utils";
import type { Transaction } from "@/types/transactions";

interface TransactionsMobileListProps {
  transactions: Transaction[];
}

function getAvatarText(transaction: Transaction): string {
  const source = transaction.category?.name || transaction.note || "?";
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    return "?";
  }
  return trimmed[0]?.toUpperCase() ?? "?";
}

export function TransactionsMobileList({ transactions }: TransactionsMobileListProps): JSX.Element {
  const groups = groupTransactionsByDay(transactions);

  return (
    <div className="flex flex-col gap-5 md:hidden">
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

          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              <ul className="divide-y">
                {group.transactions.map((transaction) => {
                  const isPositive = transaction.amount >= 0;

                  return (
                    <li className="flex items-start gap-3 px-4 py-3" key={transaction.id}>
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {getAvatarText(transaction)}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium">
                            {transaction.note?.trim() || transaction.category?.name || "Untitled transaction"}
                          </p>
                          <p className={isPositive ? "text-sm font-semibold text-primary" : "text-sm font-semibold"}>
                            {formatSignedAmount(transaction.amount, transaction.currency)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{formatTransactionTime(transaction.transactionDate)}</span>
                          {transaction.category ? <span>• {transaction.category.name}</span> : null}
                        </div>

                        {transaction.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {transaction.tags.slice(0, 4).map((tag) => (
                              <Badge key={`${transaction.id}-${tag}`} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
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
