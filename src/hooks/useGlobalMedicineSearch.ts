import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseGlobalMedicineSearchOptions {
  enabled?: boolean;
  debounceMs?: number;
}

export function useGlobalMedicineSearch({ enabled = false, debounceMs = 150 }: UseGlobalMedicineSearchOptions = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce the search query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [searchQuery, debounceMs]);

  // Only query when search is active and has at least 2 characters (avoids 1-letter wildcard scans)
  const shouldSearch = enabled && debouncedQuery.trim().length >= 2;

  const { data: searchResults, isLoading: isSearchLoading, error } = useQuery({
    queryKey: ['medicines-global-search', debouncedQuery],
    queryFn: async () => {
      const q = debouncedQuery.trim();
      if (!q) return [];

      const like = q.replace(/[%_]/g, '\\$&');

      const { data, error } = await supabase
        .from('medicines')
        .select('*')
        .or(
          `medicine_name.ilike.%${like}%,batch_no.ilike.%${like}%,company_name.ilike.%${like}%,barcode.ilike.${like}%`
        )
        .order('medicine_name')
        .limit(200);

      if (error) throw error;
      return data || [];
    },
    enabled: shouldSearch,
    staleTime: 60000,
    gcTime: 300000,
    placeholderData: (prev) => prev,
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setIsSearching(value.trim().length > 0);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
    setIsSearching(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery: handleSearchChange,
    clearSearch,
    isSearching,
    searchResults: searchResults ?? [],
    isSearchLoading: (isSearching && debouncedQuery !== searchQuery) || (shouldSearch && isSearchLoading),
    searchError: error,
    hasResults: shouldSearch && (searchResults?.length ?? 0) > 0,
    resultCount: searchResults?.length ?? 0,
  };
}
