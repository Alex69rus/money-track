import { 
  Transaction, 
  Category, 
  CreateTransactionRequest, 
  UpdateTransactionRequest,
  TransactionFilters,
  ApiError 
} from '../types';
import TelegramService from './telegram';

class ApiService {
  private static instance: ApiService;
  private baseURL: string;
  
  private constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  }
  
  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }
  
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const telegramService = TelegramService.getInstance();
    const initData = telegramService.getInitData();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
        ...options.headers,
      },
    };
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: ApiError = {
          message: errorData.message || `HTTP error! status: ${response.status}`,
          statusCode: response.status
        };
        throw error;
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof TypeError) {
        const networkError: ApiError = {
          message: 'Network error. Please check your connection.',
          statusCode: 0
        };
        throw networkError;
      }
      throw error;
    }
  }
  
  // Health check
  public async healthCheck(): Promise<string> {
    return await this.makeRequest<string>('/health');
  }
  
  // Categories
  public async getCategories(): Promise<Category[]> {
    return await this.makeRequest<Category[]>('/api/categories');
  }
  
  // Transactions
  public async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.startDate) params.append('fromDate', filters.startDate);
      if (filters.endDate) params.append('toDate', filters.endDate);
      if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
      // Backend currently supports single categoryId only, so use first category if multiple selected
      if (filters.categoryIds && filters.categoryIds.length > 0) {
        params.append('categoryId', filters.categoryIds[0].toString());
      }
      if (filters.minAmount) params.append('minAmount', filters.minAmount.toString());
      if (filters.maxAmount) params.append('maxAmount', filters.maxAmount.toString());
      if (filters.tags && filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }
      if (filters.searchText) params.append('text', filters.searchText);
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/api/transactions?${queryString}` : '/api/transactions';

    return await this.makeRequest<Transaction[]>(endpoint);
  }
  
  public async getTransaction(id: number): Promise<Transaction> {
    return await this.makeRequest<Transaction>(`/api/transactions/${id}`);
  }
  
  public async createTransaction(transaction: CreateTransactionRequest): Promise<Transaction> {
    return await this.makeRequest<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }
  
  public async updateTransaction(id: number, transaction: UpdateTransactionRequest): Promise<Transaction> {
    return await this.makeRequest<Transaction>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transaction),
    });
  }
  
  public async deleteTransaction(id: number): Promise<void> {
    await this.makeRequest<void>(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Tags
  public async getUserTags(): Promise<string[]> {
    return await this.makeRequest<string[]>('/api/tags');
  }
}

export default ApiService;