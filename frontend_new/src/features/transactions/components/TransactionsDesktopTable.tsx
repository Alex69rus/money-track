import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSignedAmount, formatTransactionTime } from "@/features/transactions/utils";
import type { Transaction } from "@/types/transactions";

interface TransactionsDesktopTableProps {
  transactions: Transaction[];
}

function formatDateLabel(value: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export function TransactionsDesktopTable({ transactions }: TransactionsDesktopTableProps): JSX.Element {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {transactions.map((transaction) => {
            const isPositive = transaction.amount >= 0;

            return (
              <TableRow key={transaction.id}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{formatDateLabel(transaction.transactionDate)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTransactionTime(transaction.transactionDate)}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="max-w-80 truncate">
                  {transaction.note?.trim() || "Untitled transaction"}
                </TableCell>

                <TableCell>{transaction.category?.name || "Uncategorized"}</TableCell>

                <TableCell>
                  {transaction.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {transaction.tags.slice(0, 3).map((tag) => (
                        <Badge key={String(transaction.id) + "-" + tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                      {transaction.tags.length > 3 ? (
                        <Badge variant="outline">+{transaction.tags.length - 3}</Badge>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No tags</span>
                  )}
                </TableCell>

                <TableCell className={isPositive ? "text-right font-semibold text-primary" : "text-right font-semibold"}>
                  {formatSignedAmount(transaction.amount, transaction.currency)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
