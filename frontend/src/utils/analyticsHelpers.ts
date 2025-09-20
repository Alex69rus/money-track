import { Transaction } from '../types';

export interface CategoryTotal {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface TagTotal {
  tag: string;
  amount: number;
  count: number;
}

export interface MonthlySpending {
  month: string;
  expenses: number;
  income: number;
  net: number;
}

export interface BasicStats {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  avgTransaction: number;
  transactionCount: number;
  avgExpense: number;
  avgIncome: number;
}

export const calculateBasicStats = (transactions: Transaction[]): BasicStats => {
  const expenses = transactions.filter(t => t.amount < 0);
  const income = transactions.filter(t => t.amount > 0);
  
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;
  
  const avgTransaction = transactions.length > 0 ? 
    transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length : 0;
  
  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
  const avgIncome = income.length > 0 ? totalIncome / income.length : 0;

  return {
    totalExpenses,
    totalIncome,
    balance,
    avgTransaction,
    transactionCount: transactions.length,
    avgExpense,
    avgIncome,
  };
};

export const calculateSpendingByCategory = (transactions: Transaction[]): CategoryTotal[] => {
  const expenses = transactions.filter(t => t.amount < 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const categoryTotals = expenses.reduce((acc, transaction) => {
    const category = transaction.category?.name || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { amount: 0, count: 0 };
    }
    acc[category].amount += Math.abs(transaction.amount);
    acc[category].count += 1;
    return acc;
  }, {} as Record<string, { amount: number; count: number }>);

  return Object.entries(categoryTotals)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

export const calculateSpendingByTags = (transactions: Transaction[]): TagTotal[] => {
  const expenses = transactions.filter(t => t.amount < 0);
  
  const tagTotals = expenses.reduce((acc, transaction) => {
    if (transaction.tags && transaction.tags.length > 0) {
      transaction.tags.forEach(tag => {
        if (!acc[tag]) {
          acc[tag] = { amount: 0, count: 0 };
        }
        acc[tag].amount += Math.abs(transaction.amount);
        acc[tag].count += 1;
      });
    }
    return acc;
  }, {} as Record<string, { amount: number; count: number }>);

  return Object.entries(tagTotals)
    .map(([tag, data]) => ({
      tag,
      amount: data.amount,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10); // Top 10 tags
};

export const calculateMonthlySpending = (transactions: Transaction[]): MonthlySpending[] => {
  const monthlyData = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.transactionDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = { expenses: 0, income: 0 };
    }
    
    if (transaction.amount < 0) {
      acc[monthKey].expenses += Math.abs(transaction.amount);
    } else {
      acc[monthKey].income += transaction.amount;
    }
    
    return acc;
  }, {} as Record<string, { expenses: number; income: number }>);

  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month: formatMonthDisplay(month),
      expenses: data.expenses,
      income: data.income,
      net: data.income - data.expenses,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6); // Last 6 months
};

const formatMonthDisplay = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

export interface DateFilter {
  startDate: string;
  endDate: string;
}

export const filterTransactionsByDate = (transactions: Transaction[], dateFilter: DateFilter): Transaction[] => {
  if (!dateFilter.startDate && !dateFilter.endDate) {
    return transactions; // No filter applied
  }

  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.transactionDate);

    if (dateFilter.startDate) {
      const startDate = new Date(dateFilter.startDate);
      startDate.setHours(0, 0, 0, 0); // Start of day
      if (transactionDate < startDate) return false;
    }

    if (dateFilter.endDate) {
      const endDate = new Date(dateFilter.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      if (transactionDate > endDate) return false;
    }

    return true;
  });
};

export const formatCurrency = (amount: number, currency: string = 'AED'): string => {
  return `${amount.toFixed(2)} ${currency}`;
};