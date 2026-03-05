import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CosmeticCategory {
  id: string;
  name: string;
}

export interface CosmeticSubcategory {
  id: string;
  category_id: string;
  name: string;
}

export function useCosmeticCategories() {
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["cosmetic-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cosmetic_categories")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as CosmeticCategory[];
    },
  });

  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery({
    queryKey: ["cosmetic-subcategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cosmetic_subcategories")
        .select("id, category_id, name")
        .order("name");
      if (error) throw error;
      return data as CosmeticSubcategory[];
    },
  });

  const getSubcategories = (categoryId: string) =>
    subcategories.filter((s) => s.category_id === categoryId);

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name || "";

  const getSubcategoryName = (id: string) =>
    subcategories.find((s) => s.id === id)?.name || "";

  return {
    categories,
    subcategories,
    getSubcategories,
    getCategoryName,
    getSubcategoryName,
    isLoading: categoriesLoading || subcategoriesLoading,
  };
}
