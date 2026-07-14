import type { Transaction } from "@/types/transactions";

export interface TransactionGroup {
  key: string;
  label: string;
  total: number;
  transactions: Transaction[];
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatSignedAmount(amount: number, currency: string): string {
  const sign = amount >= 0 ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(amount), currency)}`;
}

export function formatTransactionTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date): string {
  const now = new Date();
  const today = dayKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = dayKey(yesterdayDate);
  const current = dayKey(date);

  if (current === today) {
    return `Today, ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)}`;
  }

  if (current === yesterday) {
    return `Yesterday, ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)}`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function groupTransactionsByDay(transactions: Transaction[]): TransactionGroup[] {
  const groups = new Map<string, TransactionGroup>();

  for (const transaction of transactions) {
    const key = dayKey(transaction.transactionDate);
    const existing = groups.get(key);

    if (existing) {
      existing.transactions.push(transaction);
      existing.total += transaction.amount;
      continue;
    }

    groups.set(key, {
      key,
      label: formatDayLabel(transaction.transactionDate),
      total: transaction.amount,
      transactions: [transaction],
    });
  }

  return [...groups.values()];
}

export function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}
