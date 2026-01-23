import { useMemo } from "react";

interface MedicineBatch {
  id: string;
  medicine_name: string;
  batch_no: string;
  quantity: number;
  selling_price: number;
  purchase_price: number;
  expiry_date: string | null;
  selling_type?: string;
  tablets_per_packet?: number;
  price_per_packet?: number;
}

interface FEFOResult {
  batches: Array<{
    id: string;
    batch_no: string;
    quantity: number;
    expiry_date: string | null;
  }>;
  totalAvailable: number;
}

/**
 * Select batches using FEFO (First Expiry, First Out) logic
 * Returns batches sorted by expiry date (nearest first), excluding expired batches
 */
export function selectBatchesFEFO(
  medicineName: string,
  requiredQuantity: number,
  allMedicines: MedicineBatch[]
): FEFOResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get all non-expired batches for this medicine, sorted by expiry date (nearest first)
  const availableBatches = allMedicines
    .filter((m) => {
      if (m.medicine_name.toLowerCase() !== medicineName.toLowerCase()) return false;
      if (m.quantity <= 0) return false;
      
      // Exclude expired batches
      if (m.expiry_date) {
        const expiryDate = new Date(m.expiry_date);
        expiryDate.setHours(0, 0, 0, 0);
        if (expiryDate < today) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by expiry date (nearest first), null expiry dates go last
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
  
  const result: FEFOResult = {
    batches: [],
    totalAvailable: availableBatches.reduce((sum, b) => sum + b.quantity, 0),
  };
  
  let remainingQty = requiredQuantity;
  
  for (const batch of availableBatches) {
    if (remainingQty <= 0) break;
    
    const takeQty = Math.min(batch.quantity, remainingQty);
    result.batches.push({
      id: batch.id,
      batch_no: batch.batch_no,
      quantity: takeQty,
      expiry_date: batch.expiry_date,
    });
    
    remainingQty -= takeQty;
  }
  
  return result;
}

/**
 * Get the best batch for a medicine using FEFO logic
 * Returns the batch with the nearest expiry date that has stock available
 */
export function getBestBatchFEFO(
  medicineName: string,
  allMedicines: MedicineBatch[]
): MedicineBatch | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const availableBatches = allMedicines
    .filter((m) => {
      if (m.medicine_name.toLowerCase() !== medicineName.toLowerCase()) return false;
      if (m.quantity <= 0) return false;
      
      // Exclude expired batches
      if (m.expiry_date) {
        const expiryDate = new Date(m.expiry_date);
        expiryDate.setHours(0, 0, 0, 0);
        if (expiryDate < today) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
  
  return availableBatches[0] || null;
}

/**
 * Group medicines by name for inventory display
 */
export function groupMedicinesByName(
  medicines: MedicineBatch[]
): Map<string, MedicineBatch[]> {
  const groups = new Map<string, MedicineBatch[]>();
  
  for (const medicine of medicines) {
    const name = medicine.medicine_name.toLowerCase();
    const existing = groups.get(name) || [];
    existing.push(medicine);
    groups.set(name, existing);
  }
  
  // Sort batches within each group by expiry date
  groups.forEach((batches, name) => {
    batches.sort((a, b) => {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
  });
  
  return groups;
}

/**
 * Check if a medicine batch is expired
 */
export function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return expiry < today;
}

/**
 * Check if expiry is within specified days
 */
export function isExpiringWithinDays(expiryDate: string | null, days: number): boolean {
  if (!expiryDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry >= 0 && daysUntilExpiry <= days;
}
