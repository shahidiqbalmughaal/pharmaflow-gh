import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseGlobalMedicineSearchOptions {
  enabled?: boolean;
  debounceMs?: number;
}

export function useGlobalMedicineSearch({ enabled = false, debounceMs = 350 }: UseGlobalMedicineSearchOptions = {}) {
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

  // Only query when search is active and has content
  const shouldSearch = enabled && debouncedQuery.trim().length > 0;

  const { data: searchResults, isLoading: isSearchLoading, error } = useQuery({
    queryKey: ['medicines-global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      
      const query = debouncedQuery.toLowerCase();
      
      const { data, error } = await supabase
        .from('medicines')
        .select('*')
        .or(`medicine_name.ilike.%${query}%,batch_no.ilike.%${query}%,company_name.ilike.%${query}%,barcode.ilike.%${query}%`)
        .order('medicine_name')
        .limit(500);
      
      if (error) throw error;
      return data || [];
    },
    enabled: shouldSearch,
    staleTime: 30000,
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
