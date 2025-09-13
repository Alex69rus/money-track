export interface User {
  id: number;
  telegramId: number;
  username?: string;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  parentCategoryId?: number;
  createdAt: string;
}

export interface Transaction {
  id: number;
  userId: number;
  transactionDate: string;
  amount: number;
  note?: string;
  categoryId?: number;
  category?: Category;
  tags: string[];
  currency: string;
  smsText?: string;
  messageId?: number;
  createdAt: string;
}

export interface CreateTransactionRequest {
  transactionDate: string;
  amount: number;
  note?: string;
  categoryId?: number;
  tags?: string[];
  currency: string;
  smsText?: string;
  messageId?: number;
}

export interface UpdateTransactionRequest {
  transactionDate?: string;
  amount?: number;
  note?: string;
  categoryId?: number;
  tags?: string[];
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  tags?: string[];
  minAmount?: number;
  maxAmount?: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}