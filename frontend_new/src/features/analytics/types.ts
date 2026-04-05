import type { Transaction } from "@/types/transactions";

export interface AnalyticsDateRange {
  fromDate: string;
  toDate: string;
}

export interface AnalyticsSummaryStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  averageTransaction: number;
  transactionCount: number;
}

export interface CategorySpendingItem {
  key: string;
  categoryId: number | null;
  categoryName: string;
  amount: number;
  transactionCount: number;
  share: number;
  icon: string | null;
  color: string | null;
  transactions: Transaction[];
}

export interface TagSpendingItem {
  key: string;
  tag: string;
  amount: number;
  transactionCount: number;
  share: number;
}

export interface MonthlyTrendItem {
  key: string;
  monthLabel: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface AnalyticsModel {
  summary: AnalyticsSummaryStats;
  categorySpending: CategorySpendingItem[];
  tagSpending: TagSpendingItem[];
  monthlyTrends: MonthlyTrendItem[];
}
