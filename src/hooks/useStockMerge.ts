import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DuplicateMedicine } from "./useDuplicateDetection";

export interface MergeData {
  medicine_name: string;
  batch_no: string;
  quantity: number;
  selling_price: number;
  purchase_price: number;
  expiry_date?: string | null;
  manufacturing_date?: string;
  company_name?: string;
  rack_no?: string;
  selling_type?: string;
  supplier?: string;
  is_narcotic?: boolean;
}

interface MergeParams {
  existingMedicine: DuplicateMedicine;
  newData: MergeData;
  mergedBy: string;
}

export function useStockMerge() {
  const queryClient = useQueryClient();

  const mergeMutation = useMutation({
    mutationFn: async ({ existingMedicine, newData, mergedBy }: MergeParams) => {
      const previousQuantity = existingMedicine.quantity;
      const addedQuantity = newData.quantity;
      const newTotalQuantity = previousQuantity + addedQuantity;

      // Calculate weighted average purchase price
      const previousTotal = previousQuantity * existingMedicine.purchase_price;
      const newTotal = addedQuantity * newData.purchase_price;
      const weightedAvgPurchasePrice = (previousTotal + newTotal) / newTotalQuantity;

      // Determine which expiry/mfg dates to keep (use later/more accurate ones)
      let finalExpiryDate = existingMedicine.expiry_date;
      let finalMfgDate = existingMedicine.manufacturing_date;

      if (newData.expiry_date) {
        const existingExpiry = existingMedicine.expiry_date
          ? new Date(existingMedicine.expiry_date)
          : null;
        const newExpiry = new Date(newData.expiry_date);
        
        if (!existingExpiry || newExpiry > existingExpiry) {
          finalExpiryDate = newData.expiry_date;
        }
      }

      if (newData.manufacturing_date) {
        const existingMfg = new Date(existingMedicine.manufacturing_date);
        const newMfg = new Date(newData.manufacturing_date);
        
        if (newMfg > existingMfg) {
          finalMfgDate = newData.manufacturing_date;
        }
      }

      // Update the existing medicine with merged data
      const { error: updateError } = await supabase
        .from("medicines")
        .update({
          quantity: newTotalQuantity,
          selling_price: newData.selling_price, // Use latest selling price
          purchase_price: Math.round(weightedAvgPurchasePrice * 100) / 100, // Weighted average
          expiry_date: finalExpiryDate,
          manufacturing_date: finalMfgDate,
        })
        .eq("id", existingMedicine.id);

      if (updateError) throw updateError;

      // Log the merge action
      const { error: logError } = await supabase.from("stock_merge_logs").insert({
        medicine_id: existingMedicine.id,
        previous_quantity: previousQuantity,
        added_quantity: addedQuantity,
        new_total_quantity: newTotalQuantity,
        previous_selling_price: existingMedicine.selling_price,
        new_selling_price: newData.selling_price,
        previous_purchase_price: existingMedicine.purchase_price,
        new_purchase_price: Math.round(weightedAvgPurchasePrice * 100) / 100,
        merged_by: mergedBy,
        medicine_name: existingMedicine.medicine_name,
        batch_no: existingMedicine.batch_no,
        notes: `Stock merged: ${previousQuantity} + ${addedQuantity} = ${newTotalQuantity}`,
      });

      if (logError) {
        console.error("Failed to log merge action:", logError);
        // Don't throw - the merge itself succeeded
      }

      return {
        previousQuantity,
        addedQuantity,
        newTotalQuantity,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success(
        `Stock merged successfully! ${result.previousQuantity} + ${result.addedQuantity} = ${result.newTotalQuantity}`
      );
    },
    onError: (error) => {
      console.error("Merge error:", error);
      toast.error("Failed to merge stock");
    },
  });

  return {
    mergeStock: mergeMutation.mutate,
    mergeStockAsync: mergeMutation.mutateAsync,
    isMerging: mergeMutation.isPending,
  };
}
