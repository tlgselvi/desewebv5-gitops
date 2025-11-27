/**
 * Search Hook
 * 
 * Custom hook for semantic search
 */

import { useState, useCallback } from 'react';
import { api } from '../services/api.js';
import type { SearchResult } from '../types/index.js';

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, options?: { topK?: number; useRAG?: boolean }) => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.ai.search(query, options);
      setResults(response.data.results || []);
    } catch (err: any) {
      setError(err.message || 'Arama başarısız oldu');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults,
  };
}

