export interface CategoryDto {
  id: number;
  name: string;
  type: string;
  color: string | null;
  icon: string | null;
  parentCategoryId: number | null;
  orderIndex: number | null;
  createdAt: string;
}

export interface TransactionDto {
  id: number;
  userId: number;
  transactionDate: string;
  amount: number;
  note: string | null;
  categoryId: number | null;
  tags: string[];
  currency: string;
  smsText: string | null;
  messageId: string | null;
  createdAt: string;
  category: CategoryDto | null;
}

export interface PaginatedTransactionsDto {
  data: TransactionDto[];
  totalCount: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

export interface TransactionSummaryDto {
  totalIncome: string;
  totalExpenses: string;
  balance: string;
  transactionCount: number;
}

export interface CategoryBreakdownItemDto {
  categoryId: number | null;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  amount: string;
  transactionCount: number;
  share: number;
}

export interface CategoryBreakdownDto {
  data: CategoryBreakdownItemDto[];
}

export interface TagBreakdownItemDto {
  tag: string;
  amount: string;
  transactionCount: number;
  share: number;
}

export interface TagBreakdownDto {
  data: TagBreakdownItemDto[];
}

export interface MonthlyBreakdownItemDto {
  month: string;
  income: string;
  expenses: string;
  balance: string;
}

export interface MonthlyBreakdownDto {
  data: MonthlyBreakdownItemDto[];
}
