import { Transaction, Category, TransactionFilters } from '../types';

const mockCategories: Category[] = [
  { id: 1, name: 'Groceries', type: 'Expense', createdAt: '2024-09-13T10:00:00Z' },
  { id: 2, name: 'Salary', type: 'Income', createdAt: '2024-09-13T10:00:00Z' },
  { id: 3, name: 'Entertainment', type: 'Expense', createdAt: '2024-09-13T10:00:00Z' },
  { id: 4, name: 'Transportation', type: 'Expense', createdAt: '2024-09-13T10:00:00Z' },
];

const mockTransactions: Transaction[] = [
  {
    id: 1,
    userId: 1,
    transactionDate: '2024-09-13T14:30:45Z',
    amount: -125.50,
    note: 'Weekly grocery shopping at Carrefour',
    categoryId: 1,
    category: mockCategories[0],
    tags: ['groceries', 'food', 'weekly'],
    currency: 'AED',
    smsText: 'Card ending 1234 used for AED 125.50 at CARREFOUR',
    messageId: 123,
    createdAt: '2024-09-13T14:31:00Z'
  },
  {
    id: 2,
    userId: 1,
    transactionDate: '2024-09-13T09:15:22Z',
    amount: 5000.00,
    note: 'Monthly salary',
    categoryId: 2,
    category: mockCategories[1],
    tags: ['salary', 'income', 'monthly'],
    currency: 'AED',
    createdAt: '2024-09-13T09:16:00Z'
  },
  {
    id: 3,
    userId: 1,
    transactionDate: '2024-09-12T20:45:33Z',
    amount: -75.00,
    note: 'Movie tickets and popcorn',
    categoryId: 3,
    category: mockCategories[2],
    tags: ['cinema', 'entertainment', 'weekend'],
    currency: 'AED',
    smsText: 'Card ending 1234 used for AED 75.00 at VOX CINEMAS',
    messageId: 124,
    createdAt: '2024-09-12T20:46:00Z'
  },
  {
    id: 4,
    userId: 1,
    transactionDate: '2024-09-12T08:30:15Z',
    amount: -25.00,
    note: 'Taxi to office',
    categoryId: 4,
    category: mockCategories[3],
    tags: ['taxi', 'transport', 'work'],
    currency: 'AED',
    smsText: 'Card ending 1234 used for AED 25.00 at CAREEM',
    messageId: 125,
    createdAt: '2024-09-12T08:31:00Z'
  },
  {
    id: 5,
    userId: 1,
    transactionDate: '2024-09-11T16:22:07Z',
    amount: -45.80,
    note: 'Coffee and lunch',
    categoryId: undefined,
    category: undefined,
    tags: ['food', 'lunch'],
    currency: 'AED',
    smsText: 'Card ending 1234 used for AED 45.80 at COSTA COFFEE',
    messageId: 126,
    createdAt: '2024-09-11T16:23:00Z'
  }
];

export class MockApiService {
  public static async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    let filteredTransactions = [...mockTransactions];

    // Date range filtering
    if (filters?.startDate) {
      const startDate = new Date(filters.startDate);
      filteredTransactions = filteredTransactions.filter(t => {
        const txDate = new Date(t.transactionDate);
        return txDate >= startDate;
      });
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      // Set to end of day to include transactions on the end date
      endDate.setHours(23, 59, 59, 999);
      filteredTransactions = filteredTransactions.filter(t => {
        const txDate = new Date(t.transactionDate);
        return txDate <= endDate;
      });
    }

    // Category filtering
    if (filters?.categoryId) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.categoryId === filters.categoryId
      );
    }

    if (filters?.categoryIds && filters.categoryIds.length > 0) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.categoryId && filters.categoryIds!.includes(t.categoryId)
      );
    }

    // Tags filtering
    if (filters?.tags && filters.tags.length > 0) {
      filteredTransactions = filteredTransactions.filter(t =>
        filters.tags!.some(filterTag => t.tags.includes(filterTag))
      );
    }

    // Amount range filtering
    if (filters?.minAmount !== undefined && filters?.minAmount !== null) {
      filteredTransactions = filteredTransactions.filter(t => 
        Math.abs(t.amount) >= filters.minAmount!
      );
    }

    if (filters?.maxAmount !== undefined && filters?.maxAmount !== null) {
      filteredTransactions = filteredTransactions.filter(t => 
        Math.abs(t.amount) <= filters.maxAmount!
      );
    }

    // Search text filtering
    if (filters?.searchText) {
      const searchTerm = filters.searchText.toLowerCase();
      filteredTransactions = filteredTransactions.filter(t =>
        t.amount.toString().includes(searchTerm) ||
        (t.note && t.note.toLowerCase().includes(searchTerm)) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        (t.category && t.category.name.toLowerCase().includes(searchTerm))
      );
    }

    return filteredTransactions;
  }

  public static async getCategories(): Promise<Category[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockCategories;
  }
}