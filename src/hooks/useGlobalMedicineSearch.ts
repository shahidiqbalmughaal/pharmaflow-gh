import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseGlobalMedicineSearchOptions {
  enabled?: boolean;
  debounceMs?: number;
  /** Max results to return after ranking. Defaults to 30. */
  limit?: number;
}

/**
 * Global medicine search optimized for large inventories (10k–50k+ rows).
 *
 * - Starts searching after 2 characters
 * - 250ms debounce by default
 * - Server-side limit (top N matches only — never the whole inventory)
 * - Uses trigram GIN indexes (substring) + barcode prefix index
 * - Client-side ranking: exact barcode > exact name > name starts-with > partial
 */
export function useGlobalMedicineSearch({
  enabled = false,
  debounceMs = 250,
  limit = 30,
}: UseGlobalMedicineSearchOptions = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchQuery, debounceMs]);

  const shouldSearch = enabled && debouncedQuery.length >= 2;

  const { data: searchResults, isLoading: isSearchLoading, error } = useQuery({
    queryKey: ['medicines-global-search', debouncedQuery, limit],
    queryFn: async () => {
      const q = debouncedQuery;
      if (!q) return [];

      const like = q.replace(/[%_\\]/g, '\\$&');
      const fetchLimit = Math.max(limit, 50);

      const { data, error } = await supabase
        .from('medicines')
        .select('*')
        .or(
          `medicine_name.ilike.%${like}%,batch_no.ilike.%${like}%,company_name.ilike.%${like}%,barcode.ilike.${like}%`
        )
        .order('medicine_name')
        .limit(fetchLimit);

      if (error) throw error;
      return data || [];
    },
    enabled: shouldSearch,
    staleTime: 60_000,
    gcTime: 300_000,
    placeholderData: (prev) => prev,
  });

  // Client-side ranking: barcode exact → name exact → name starts-with → partial
  const rankedResults = useMemo(() => {
    if (!searchResults || searchResults.length === 0) return [] as typeof searchResults;
    const q = debouncedQuery.toLowerCase();
    if (!q) return searchResults.slice(0, limit);

    const score = (m: any) => {
      const name = (m.medicine_name || '').toLowerCase();
      const barcode = (m.barcode || '').toLowerCase();
      if (barcode && barcode === q) return 0;
      if (name === q) return 1;
      if (name.startsWith(q)) return 2;
      if (name.includes(q)) return 3;
      return 4;
    };

    return [...searchResults]
      .map((m) => ({ m, s: score(m) }))
      .sort((a, b) => a.s - b.s || (a.m.medicine_name || '').localeCompare(b.m.medicine_name || ''))
      .slice(0, limit)
      .map((x) => x.m);
  }, [searchResults, debouncedQuery, limit]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setIsSearching(value.trim().length > 0);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    setIsSearching(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery: handleSearchChange,
    clearSearch,
    isSearching,
    searchResults: rankedResults,
    isSearchLoading:
      (isSearching && debouncedQuery !== searchQuery.trim()) || (shouldSearch && isSearchLoading),
    searchError: error,
    hasResults: shouldSearch && rankedResults.length > 0,
    resultCount: rankedResults.length,
  };
}
