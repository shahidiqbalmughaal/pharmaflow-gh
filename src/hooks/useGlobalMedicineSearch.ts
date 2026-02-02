import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseGlobalMedicineSearchOptions {
  enabled?: boolean;
}

export function useGlobalMedicineSearch({ enabled = false }: UseGlobalMedicineSearchOptions = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Only query when search is active and has content
  const shouldSearch = enabled && searchQuery.trim().length > 0;

  const { data: searchResults, isLoading: isSearchLoading, error } = useQuery({
    queryKey: ['medicines-global-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      const query = searchQuery.toLowerCase();
      
      // Search across all medicines without pagination limit
      const { data, error } = await supabase
        .from('medicines')
        .select('*')
        .or(`medicine_name.ilike.%${query}%,batch_no.ilike.%${query}%,company_name.ilike.%${query}%,barcode.ilike.%${query}%`)
        .order('medicine_name')
        .limit(500); // Return up to 500 search results
      
      if (error) throw error;
      return data || [];
    },
    enabled: shouldSearch,
    staleTime: 30000, // Cache for 30 seconds
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setIsSearching(value.trim().length > 0);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setIsSearching(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery: handleSearchChange,
    clearSearch,
    isSearching,
    searchResults: searchResults ?? [],
    isSearchLoading: shouldSearch && isSearchLoading,
    searchError: error,
    hasResults: shouldSearch && (searchResults?.length ?? 0) > 0,
    resultCount: searchResults?.length ?? 0,
  };
}
