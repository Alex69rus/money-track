export interface AnalyticsDateRange {
  fromDate: string;
  toDate: string;
}

export type DecimalMoney = string;

export interface AnalyticsSummaryStats {
  totalIncome: DecimalMoney;
  totalExpenses: DecimalMoney;
  balance: DecimalMoney;
  transactionCount: number;
}

export interface CategorySpendingItem {
  key: string;
  categoryId: number | null;
  categoryName: string;
  amount: DecimalMoney;
  transactionCount: number;
  share: number;
  icon: string | null;
  color: string | null;
}

export interface TagSpendingItem {
  key: string;
  tag: string;
  amount: DecimalMoney;
  transactionCount: number;
  share: number;
}

export type AnalyticsDrilldownItem =
  | {
      kind: "category";
      item: CategorySpendingItem;
    }
  | {
      kind: "tag";
      item: TagSpendingItem;
    };

export interface MonthlyTrendItem {
  key: string;
  monthLabel: string;
  income: DecimalMoney;
  expenses: DecimalMoney;
  balance: DecimalMoney;
}
