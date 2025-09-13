import { Transaction, Category } from '../types';

const mockCategories: Category[] = [
  { id: 1, name: 'Groceries', type: 'expense', createdAt: '2024-09-13T10:00:00Z' },
  { id: 2, name: 'Salary', type: 'income', createdAt: '2024-09-13T10:00:00Z' },
  { id: 3, name: 'Entertainment', type: 'expense', createdAt: '2024-09-13T10:00:00Z' },
  { id: 4, name: 'Transportation', type: 'expense', createdAt: '2024-09-13T10:00:00Z' },
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
  public static async getTransactions(): Promise<Transaction[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockTransactions;
  }

  public static async getCategories(): Promise<Category[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockCategories;
  }
}