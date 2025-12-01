import { useState } from 'react';
import { Transaction, UpdateTransactionRequest } from '../types';
import ApiService from '../services/api';

interface UseQuickUpdateResult {
  updateCategory: (categoryId: string | number | number[], transactionId: number, transactions: Transaction[]) => Promise<Transaction | null>;
  updateTags: (transactionId: number, newTags: string[], transactions: Transaction[]) => Promise<Transaction | null>;
  updatingCategory: boolean;
  updatingTags: boolean;
  selectedTransactionId: number | null;
}

export const useQuickUpdate = (): UseQuickUpdateResult => {
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [updatingTags, setUpdatingTags] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);

  const updateCategory = async (
    categoryId: string | number | number[],
    transactionId: number,
    transactions: Transaction[]
  ): Promise<Transaction | null> => {
    if (Array.isArray(categoryId)) return null;

    const finalCategoryId = typeof categoryId === 'string' ? parseInt(categoryId) : categoryId;
    if (isNaN(finalCategoryId)) return null;

    // Find the current transaction to get all its fields
    const currentTransaction = transactions.find(t => t.id === transactionId);
    if (!currentTransaction) return null;

    try {
      setUpdatingCategory(true);
      setSelectedTransactionId(transactionId);
      const apiService = ApiService.getInstance();

      // Create the update request object with ALL required fields - backend doesn't support partial updates
      const updateRequest: UpdateTransactionRequest = {
        transactionDate: currentTransaction.transactionDate,
        amount: currentTransaction.amount,
        note: currentTransaction.note,
        categoryId: finalCategoryId,
        tags: currentTransaction.tags,
        currency: currentTransaction.currency
      };

      // Update the transaction with the selected category
      const updatedTransaction = await apiService.updateTransaction(transactionId, updateRequest);
      return updatedTransaction;
    } catch (error) {
      console.error('Failed to update category:', error);
      throw error;
    } finally {
      setUpdatingCategory(false);
      setSelectedTransactionId(null);
    }
  };

  const updateTags = async (
    transactionId: number,
    newTags: string[],
    transactions: Transaction[]
  ): Promise<Transaction | null> => {
    setUpdatingTags(true);
    setSelectedTransactionId(transactionId);

    try {
      const apiService = ApiService.getInstance();
      const currentTransaction = transactions.find(t => t.id === transactionId);

      if (!currentTransaction) {
        throw new Error('Transaction not found');
      }

      const updateRequest: UpdateTransactionRequest = {
        transactionDate: currentTransaction.transactionDate,
        amount: currentTransaction.amount,
        note: currentTransaction.note,
        categoryId: currentTransaction.categoryId,
        tags: newTags,
        currency: currentTransaction.currency
      };

      const updatedTransaction = await apiService.updateTransaction(transactionId, updateRequest);
      return updatedTransaction;
    } catch (error) {
      console.error('Failed to update tags:', error);
      throw error; // Re-throw for QuickTagSelector error handling
    } finally {
      setUpdatingTags(false);
      setSelectedTransactionId(null);
    }
  };

  return {
    updateCategory,
    updateTags,
    updatingCategory,
    updatingTags,
    selectedTransactionId
  };
};
