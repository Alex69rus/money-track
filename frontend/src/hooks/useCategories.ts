import { useState, useEffect } from 'react';
import { Category } from '../types';
import ApiService from '../services/api';
import { MockApiService } from '../services/mockApi';

interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

export const useCategories = (): UseCategoriesReturn => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiService = ApiService.getInstance();
        const data = await apiService.getCategories();
        setCategories(data);
      } catch (err) {
        if (abortController.signal.aborted) {
          return; // Ignore aborted requests
        }
        console.error('Backend not available, using mock categories:', err);
        // Fallback to mock data when API is not available
        const mockData = await MockApiService.getCategories();
        setCategories(mockData);
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchCategories();

    return () => {
      abortController.abort();
    };
  }, []);

  return { categories, loading, error };
};
