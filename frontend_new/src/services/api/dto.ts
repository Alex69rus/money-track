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
