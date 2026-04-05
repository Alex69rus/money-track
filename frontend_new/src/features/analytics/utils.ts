import type {
  AnalyticsDateRange,
  AnalyticsModel,
  CategorySpendingItem,
  MonthlyTrendItem,
  TagSpendingItem,
} from "@/features/analytics/types";
import type { Transaction } from "@/types/transactions";

interface CurrencyDisplay {
  currency: string;
  isMixed: boolean;
}

function asDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function humanizeMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) {
    return key;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "2-digit",
  }).format(new Date(year, month - 1, 1));
}

function categoryKey(transaction: Transaction): string {
  if (transaction.categoryId === null) {
    return "uncategorized";
  }

  return `category-${transaction.categoryId}`;
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function sortTransactionsByDateDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (first, second) => second.transactionDate.getTime() - first.transactionDate.getTime(),
  );
}

export function getCurrentMonthDateRange(): AnalyticsDateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    fromDate: asDateKey(start),
    toDate: asDateKey(end),
  };
}

export function getLastDaysDateRange(days: number): AnalyticsDateRange {
  const safeDays = Math.max(1, Math.floor(days));
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (safeDays - 1));

  return {
    fromDate: asDateKey(start),
    toDate: asDateKey(today),
  };
}

export function formatDateRangeLabel(range: AnalyticsDateRange): string {
  const from = new Date(`${range.fromDate}T00:00:00`);
  const to = new Date(`${range.toDate}T00:00:00`);

  return `${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(from)} - ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(to)}`;
}

export function resolveCurrencyDisplay(transactions: Transaction[]): CurrencyDisplay {
  const currencyUsage = new Map<string, number>();

  for (const transaction of transactions) {
    const normalizedCurrency = transaction.currency.trim().toUpperCase();
    if (!normalizedCurrency) {
      continue;
    }

    currencyUsage.set(normalizedCurrency, (currencyUsage.get(normalizedCurrency) ?? 0) + 1);
  }

  if (currencyUsage.size === 0) {
    return {
      currency: "AED",
      isMixed: false,
    };
  }

  const sorted = [...currencyUsage.entries()].sort((first, second) => second[1] - first[1]);
  const primary = sorted[0]?.[0] ?? "AED";

  return {
    currency: primary,
    isMixed: currencyUsage.size > 1,
  };
}

export function formatMoney(value: number, currency: string): string {
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

export function formatSignedMoney(value: number, currency: string): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatMoney(Math.abs(value), currency)}`;
}

export function formatTransactionDateTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function toTestIdSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 64);
}

export function buildAnalyticsModel(transactions: Transaction[]): AnalyticsModel {
  const sortedTransactions = sortTransactionsByDateDesc(transactions);
  const expenses = sortedTransactions.filter((transaction) => transaction.amount < 0);
  const incomes = sortedTransactions.filter((transaction) => transaction.amount > 0);

  const totalIncome = incomes.reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpenses = expenses.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const balance = totalIncome - totalExpenses;

  const averageTransaction =
    sortedTransactions.length > 0
      ? sortedTransactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0) /
        sortedTransactions.length
      : 0;

  const categoryMap = new Map<string, CategorySpendingItem>();

  for (const transaction of expenses) {
    const key = categoryKey(transaction);
    const existing = categoryMap.get(key);

    if (existing) {
      existing.amount += Math.abs(transaction.amount);
      existing.transactionCount += 1;
      existing.transactions.push(transaction);
      continue;
    }

    categoryMap.set(key, {
      key,
      categoryId: transaction.categoryId,
      categoryName: transaction.category?.name ?? "Uncategorized",
      amount: Math.abs(transaction.amount),
      transactionCount: 1,
      share: 0,
      icon: transaction.category?.icon ?? null,
      color: transaction.category?.color ?? null,
      transactions: [transaction],
    });
  }

  const categorySpending = [...categoryMap.values()]
    .map((categoryItem) => ({
      ...categoryItem,
      share: totalExpenses > 0 ? categoryItem.amount / totalExpenses : 0,
      transactions: sortTransactionsByDateDesc(categoryItem.transactions),
    }))
    .sort((first, second) => second.amount - first.amount);

  const tagMap = new Map<string, TagSpendingItem>();

  for (const transaction of expenses) {
    for (const rawTag of transaction.tags) {
      const normalized = normalizeTag(rawTag);
      if (!normalized) {
        continue;
      }

      const existing = tagMap.get(normalized);
      if (existing) {
        existing.amount += Math.abs(transaction.amount);
        existing.transactionCount += 1;
        continue;
      }

      tagMap.set(normalized, {
        key: toTestIdSegment(normalized),
        tag: rawTag.trim() || normalized,
        amount: Math.abs(transaction.amount),
        transactionCount: 1,
        share: 0,
      });
    }
  }

  const tagSpending = [...tagMap.values()]
    .map((tagItem) => ({
      ...tagItem,
      share: totalExpenses > 0 ? tagItem.amount / totalExpenses : 0,
    }))
    .sort((first, second) => second.amount - first.amount)
    .slice(0, 10);

  const monthMap = new Map<string, MonthlyTrendItem>();

  for (const transaction of sortedTransactions) {
    const key = monthKey(transaction.transactionDate);
    const existing = monthMap.get(key);

    if (existing) {
      if (transaction.amount < 0) {
        existing.expenses += Math.abs(transaction.amount);
      } else {
        existing.income += transaction.amount;
      }
      existing.balance = existing.income - existing.expenses;
      continue;
    }

    monthMap.set(key, {
      key,
      monthLabel: humanizeMonth(key),
      income: transaction.amount > 0 ? transaction.amount : 0,
      expenses: transaction.amount < 0 ? Math.abs(transaction.amount) : 0,
      balance: transaction.amount,
    });
  }

  const monthlyTrends = [...monthMap.values()]
    .sort((first, second) => first.key.localeCompare(second.key))
    .slice(-6);

  return {
    summary: {
      totalIncome,
      totalExpenses,
      balance,
      averageTransaction,
      transactionCount: sortedTransactions.length,
    },
    categorySpending,
    tagSpending,
    monthlyTrends,
  };
}
