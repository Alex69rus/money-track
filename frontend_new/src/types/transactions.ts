export interface Category {
  id: number;
  name: string;
  type: string;
  color: string | null;
  icon: string | null;
  parentCategoryId: number | null;
  orderIndex: number | null;
  createdAt: Date;
}

export interface Transaction {
  id: number;
  userId: number;
  transactionDate: Date;
  amount: number;
  note: string | null;
  categoryId: number | null;
  tags: string[];
  currency: string;
  smsText: string | null;
  messageId: string | null;
  createdAt: Date;
  category: Category | null;
}

export interface PaginatedTransactions {
  data: Transaction[];
  totalCount: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

export interface TransactionsQueryFilters {
  text?: string;
  fromDate?: string;
  toDate?: string;
  categoryId?: number;
  tags?: string[];
  minAmount?: number;
  maxAmount?: number;
}
