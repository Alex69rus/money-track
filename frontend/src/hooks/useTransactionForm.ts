import { useState, useEffect } from 'react';
import { Transaction, UpdateTransactionRequest, ApiError } from '../types';
import ApiService from '../services/api';

interface TransactionFormData {
  transactionDate: string;
  amount: string;
  note: string;
  categoryId: string;
  tags: string[];
  currency: string;
}

interface UseTransactionFormReturn {
  formData: TransactionFormData;
  loading: boolean;
  showDeleteConfirm: boolean;
  setFormData: (data: TransactionFormData | ((prev: TransactionFormData) => TransactionFormData)) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  isFormValid: () => boolean;
  handleSubmit: () => Promise<void>;
  handleDelete: () => Promise<void>;
}

// Helper function to convert Date to datetime-local format
const formatDateTimeLocal = (date: string | Date): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const useTransactionForm = (
  transaction: Transaction | null,
  onSave: (updatedTransaction: Transaction) => void,
  onDelete: ((transactionId: number) => void) | undefined,
  onError: (error: string) => void,
  onClose: () => void
): UseTransactionFormReturn => {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<TransactionFormData>({
    transactionDate: '',
    amount: '',
    note: '',
    categoryId: '',
    tags: [],
    currency: 'AED',
  });

  // Initialize form data when transaction changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        transactionDate: formatDateTimeLocal(transaction.transactionDate),
        amount: transaction.amount.toString(),
        note: transaction.note || '',
        categoryId: transaction.categoryId?.toString() || '',
        tags: transaction.tags || [],
        currency: transaction.currency || 'AED',
      });
    }
  }, [transaction]);

  const isFormValid = (): boolean => {
    return !!(
      formData.transactionDate &&
      formData.amount &&
      !isNaN(parseFloat(formData.amount)) &&
      parseFloat(formData.amount) !== 0
    );
  };

  const handleSubmit = async () => {
    if (!transaction) return;

    try {
      setLoading(true);

      const updateRequest: UpdateTransactionRequest = {
        transactionDate: formData.transactionDate
          ? new Date(formData.transactionDate).toISOString()
          : transaction.transactionDate,
        amount: parseFloat(formData.amount),
        note: formData.note || undefined,
        categoryId: formData.categoryId && formData.categoryId !== '0'
          ? parseInt(formData.categoryId)
          : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        currency: formData.currency,
      };

      const apiService = ApiService.getInstance();
      const updatedTransaction = await apiService.updateTransaction(transaction.id, updateRequest);

      onSave(updatedTransaction);
      onClose();
    } catch (error) {
      const apiError = error as ApiError;
      onError(apiError.message || 'Failed to update transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction || !onDelete) return;

    try {
      setLoading(true);
      const apiService = ApiService.getInstance();
      await apiService.deleteTransaction(transaction.id);
      onDelete(transaction.id);
      onClose();
    } catch (error) {
      const apiError = error as ApiError;
      onError(apiError.message || 'Failed to delete transaction');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return {
    formData,
    loading,
    showDeleteConfirm,
    setFormData,
    setShowDeleteConfirm,
    isFormValid,
    handleSubmit,
    handleDelete,
  };
};
