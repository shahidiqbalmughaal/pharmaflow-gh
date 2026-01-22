import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DuplicateMedicine {
  id: string;
  medicine_name: string;
  batch_no: string;
  quantity: number;
  selling_price: number;
  purchase_price: number;
  expiry_date: string | null;
  manufacturing_date: string;
  company_name: string;
  rack_no: string;
  selling_type: string;
  supplier: string;
  is_narcotic: boolean;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingMedicine: DuplicateMedicine | null;
  isSameNameDifferentBatch: boolean;
}

export function useDuplicateDetection() {
  const [isChecking, setIsChecking] = useState(false);

  const checkForDuplicate = useCallback(
    async (medicineName: string, batchNo: string): Promise<DuplicateCheckResult> => {
      setIsChecking(true);
      
      try {
        // Normalize inputs for comparison
        const normalizedName = medicineName.trim().toLowerCase();
        const normalizedBatch = batchNo.trim().toLowerCase();

        // Fetch all medicines to check for duplicates
        const { data: medicines, error } = await supabase
          .from("medicines")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error checking for duplicates:", error);
          return { isDuplicate: false, existingMedicine: null, isSameNameDifferentBatch: false };
        }

        if (!medicines || medicines.length === 0) {
          return { isDuplicate: false, existingMedicine: null, isSameNameDifferentBatch: false };
        }

        // Check for exact match (same name + same batch)
        const exactMatch = medicines.find(
          (m) =>
            m.medicine_name.trim().toLowerCase() === normalizedName &&
            m.batch_no.trim().toLowerCase() === normalizedBatch
        );

        if (exactMatch) {
          return {
            isDuplicate: true,
            existingMedicine: exactMatch as DuplicateMedicine,
            isSameNameDifferentBatch: false,
          };
        }

        // Check for same name but different batch
        const sameNameMatch = medicines.find(
          (m) => m.medicine_name.trim().toLowerCase() === normalizedName
        );

        if (sameNameMatch) {
          return {
            isDuplicate: false,
            existingMedicine: null,
            isSameNameDifferentBatch: true,
          };
        }

        return { isDuplicate: false, existingMedicine: null, isSameNameDifferentBatch: false };
      } finally {
        setIsChecking(false);
      }
    },
    []
  );

  return {
    checkForDuplicate,
    isChecking,
  };
}
