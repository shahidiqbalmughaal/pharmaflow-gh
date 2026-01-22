import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PharmacySettings {
  id?: string;
  shop_id?: string;
  pharmacy_name: string;
  pharmacy_tagline: string;
  pharmacy_address: string;
  pharmacy_contact: string;
  pharmacy_logo_url?: string;
}

const DEFAULT_SETTINGS: PharmacySettings = {
  pharmacy_name: "Al-Rehman Pharmacy & Cosmetics",
  pharmacy_tagline: "Complete Healthcare Solutions",
  pharmacy_address: "Service Road, Muslim Town, Sadiqabad, Rawalpindi",
  pharmacy_contact: "0334-5219838",
  pharmacy_logo_url: "",
};

export const usePharmacySettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["pharmacySettings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return DEFAULT_SETTINGS;

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_shop_id")
        .eq("id", user.id)
        .single();

      if (!profile?.current_shop_id) return DEFAULT_SETTINGS;

      const { data, error } = await supabase
        .from("shop_settings")
        .select("*")
        .eq("shop_id", profile.current_shop_id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching pharmacy settings:", error);
        return DEFAULT_SETTINGS;
      }

      return data || DEFAULT_SETTINGS;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newSettings: Partial<PharmacySettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_shop_id")
        .eq("id", user.id)
        .single();

      if (!profile?.current_shop_id) throw new Error("No shop selected");

      // Check if settings exist
      const { data: existing } = await supabase
        .from("shop_settings")
        .select("id")
        .eq("shop_id", profile.current_shop_id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("shop_settings")
          .update({
            ...newSettings,
            updated_at: new Date().toISOString(),
          })
          .eq("shop_id", profile.current_shop_id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("shop_settings")
          .insert({
            shop_id: profile.current_shop_id,
            ...DEFAULT_SETTINGS,
            ...newSettings,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacySettings"] });
      toast.success("Pharmacy settings saved successfully");
    },
    onError: (error) => {
      console.error("Error saving pharmacy settings:", error);
      toast.error("Failed to save pharmacy settings");
    },
  });

  return {
    settings: settings || DEFAULT_SETTINGS,
    isLoading,
    saveSettings: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
};
