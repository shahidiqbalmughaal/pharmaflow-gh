import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_PAGE_SIZE = 50;

interface UsePaginatedMedicinesOptions {
  pageSize?: number;
}

export function usePaginatedMedicines({ pageSize = DEFAULT_PAGE_SIZE }: UsePaginatedMedicinesOptions = {}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  // First, get total count for pagination
  const { data: countData } = useQuery({
    queryKey: ['medicines-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('medicines')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  const totalItems = countData ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize));

  // Fetch paginated data
  const { data: medicines, isLoading, error } = useQuery({
    queryKey: ['medicines', currentPage, currentPageSize],
    queryFn: async () => {
      const from = (currentPage - 1) * currentPageSize;
      const to = from + currentPageSize - 1;
      
      const { data, error } = await supabase
        .from('medicines')
        .select('*')
        .order('medicine_name')
        .range(from, to);
      
      if (error) throw error;
      return data;
    },
  });

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const handlePageSizeChange = useCallback((size: number) => {
    setCurrentPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  // Reset to page 1 if current page exceeds total pages
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  return {
    medicines: medicines ?? [],
    isLoading,
    error,
    currentPage,
    totalPages,
    pageSize: currentPageSize,
    totalItems,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
  };
}
