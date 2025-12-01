import { useState, useEffect } from 'react';
import ApiService from '../services/api';

interface UseUserTagsResult {
  tags: string[];
  loading: boolean;
  error: string | null;
}

export const useUserTags = (): UseUserTagsResult => {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchTags = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiService = ApiService.getInstance();
        const data = await apiService.getUserTags();
        if (!abortController.signal.aborted) {
          setTags(data);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load tags');
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchTags();
    return () => abortController.abort();
  }, []);

  return { tags, loading, error };
};
