export interface User {
  id: number;
  telegramId: number;
  username?: string;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'Income' | 'Expense';
  color?: string;
  icon?: string;
  parentCategoryId?: number;
  orderIndex?: number;
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
  transactionDate: string;  // Required by backend
  amount: number;           // Required by backend
  note?: string;
  categoryId?: number;
  tags?: string[];
  currency: string;         // Required by backend
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  categoryIds?: number[];
  tags?: string[];
  minAmount?: number;
  maxAmount?: number;
  searchText?: string;
}

export interface FilterState {
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
  categories: number[];
  tags: string[];
  amountRange: {
    min: number | null;
    max: number | null;
  };
  searchText: string;
}

export interface FilterValidation {
  isValid: boolean;
  errors: string[];
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

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
  sessionId?: string;
}

export interface ChatResponse {
  response: string;
  success: boolean;
  error?: string;
  sessionId?: string;
}

export interface ChatSession {
  id: string;
  userId: number;
  createdAt: Date;
  lastActivityAt: Date;
}