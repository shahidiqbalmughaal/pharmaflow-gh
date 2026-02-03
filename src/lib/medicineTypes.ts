// Extended selling types for medicines and medical supplies
export const SELLING_TYPES = [
  // Solid Oral Forms
  { value: "per_tablet", label: "Per Tablet", unit: "Tablets", priceUnit: "Per Tablet" },
  { value: "capsule", label: "Capsule", unit: "Capsules", priceUnit: "Per Capsule" },
  { value: "per_packet", label: "Per Packet", unit: "Tablets", priceUnit: "Per Tablet" },
  { value: "powder", label: "Powder", unit: "Units", priceUnit: "Per Unit" },
  { value: "granules", label: "Granules", unit: "Units", priceUnit: "Per Unit" },
  { value: "sachet", label: "Sachet", unit: "Units", priceUnit: "Per Unit" },
  
  // Liquid Oral Forms
  { value: "syrup", label: "Syrup", unit: "ml", priceUnit: "Per ml" },
  { value: "suspension", label: "Suspension", unit: "ml", priceUnit: "Per ml" },
  { value: "emulsion", label: "Emulsion", unit: "ml", priceUnit: "Per ml" },
  { value: "oral_solution", label: "Oral Solution", unit: "ml", priceUnit: "Per ml" },
  { value: "solution", label: "Solution", unit: "ml", priceUnit: "Per ml" },
  { value: "elixir", label: "Elixir", unit: "ml", priceUnit: "Per ml" },
  { value: "dry_syrup", label: "Dry Syrup", unit: "Units", priceUnit: "Per Unit" },
  { value: "drops", label: "Drops", unit: "ml", priceUnit: "Per ml" },
  { value: "oral_ampoule", label: "Oral Ampoule", unit: "Units", priceUnit: "Per Unit" },
  { value: "oral_gel", label: "Oral Gel", unit: "Units", priceUnit: "Per Unit" },
  { value: "liquid", label: "Liquid", unit: "ml", priceUnit: "Per ml" },
  { value: "mouthwash", label: "Mouthwash", unit: "Units", priceUnit: "Per Unit" },
  { value: "gargle", label: "Gargle", unit: "Units", priceUnit: "Per Unit" },
  
  // Eye/Ear/Nasal
  { value: "eye_drops", label: "Eye Drops", unit: "Units", priceUnit: "Per Unit" },
  { value: "ear_drops", label: "Ear Drops", unit: "Units", priceUnit: "Per Unit" },
  { value: "nasal_spray", label: "Nasal Spray", unit: "Units", priceUnit: "Per Unit" },
  
  // Inhalation
  { value: "inhaler", label: "Inhaler", unit: "Units", priceUnit: "Per Unit" },
  { value: "nebulizer_solution", label: "Nebulizer Solution", unit: "Units", priceUnit: "Per Unit" },
  { value: "spray", label: "Spray", unit: "Units", priceUnit: "Per Unit" },
  
  // Topical Forms
  { value: "cream", label: "Cream", unit: "Units", priceUnit: "Per Unit" },
  { value: "ointment", label: "Ointment", unit: "Units", priceUnit: "Per Unit" },
  { value: "gel", label: "Gel", unit: "Units", priceUnit: "Per Unit" },
  { value: "lotion", label: "Lotion", unit: "Units", priceUnit: "Per Unit" },
  { value: "paste", label: "Paste", unit: "Units", priceUnit: "Per Unit" },
  { value: "foam", label: "Foam", unit: "Units", priceUnit: "Per Unit" },
  { value: "patch", label: "Patch", unit: "Units", priceUnit: "Per Unit" },
  { value: "shampoo", label: "Shampoo", unit: "Units", priceUnit: "Per Unit" },
  { value: "soap", label: "Soap", unit: "Pieces", priceUnit: "Per Piece" },
  { value: "bar", label: "Bar", unit: "Pieces", priceUnit: "Per Piece" },
  
  // Injectables
  { value: "injection", label: "Injection", unit: "Units", priceUnit: "Per Unit" },
  { value: "ampoule", label: "Ampoule", unit: "Units", priceUnit: "Per Unit" },
  { value: "vial", label: "Vial", unit: "Units", priceUnit: "Per Unit" },
  { value: "infusion", label: "Infusion", unit: "Units", priceUnit: "Per Unit" },
  { value: "iv_fluid", label: "IV Fluid", unit: "Units", priceUnit: "Per Unit" },
  { value: "drip", label: "Drip", unit: "Units", priceUnit: "Per Unit" },
  { value: "insulin", label: "Insulin", unit: "Units", priceUnit: "Per Unit" },
  { value: "vaccine", label: "Vaccine", unit: "Units", priceUnit: "Per Unit" },
  
  // Rectal/Vaginal
  { value: "suppository", label: "Suppository", unit: "Units", priceUnit: "Per Unit" },
  { value: "pessary", label: "Pessary", unit: "Units", priceUnit: "Per Unit" },
  { value: "enema", label: "Enema", unit: "Units", priceUnit: "Per Unit" },
  
  // Medical Supplies
  { value: "iv_set", label: "IV Set", unit: "Pieces", priceUnit: "Per Piece" },
  { value: "cannula", label: "Cannula", unit: "Pieces", priceUnit: "Per Piece" },
  { value: "syringe", label: "Syringe", unit: "Pieces", priceUnit: "Per Piece" },
  { value: "bandage", label: "Bandage", unit: "Pieces", priceUnit: "Per Piece" },
  { value: "crepe_bandage", label: "Crepe Bandage", unit: "Pieces", priceUnit: "Per Piece" },
  { value: "dressing", label: "Dressing", unit: "Pieces", priceUnit: "Per Piece" },
  { value: "cotton", label: "Cotton", unit: "Pieces", priceUnit: "Per Piece" },
  { value: "plaster", label: "Plaster", unit: "Pieces", priceUnit: "Per Piece" },
  { value: "mask", label: "Mask", unit: "Pieces", priceUnit: "Per Piece" },
  
  // Miscellaneous
  { value: "toothbrush", label: "Toothbrush", unit: "Pieces", priceUnit: "Per Piece" },
  { value: "toothpaste", label: "Toothpaste", unit: "Pieces", priceUnit: "Per Piece" },
  { value: "sugar_strip", label: "Sugar Strip", unit: "Pieces", priceUnit: "Per Piece" },
  { value: "supplement", label: "Supplement", unit: "Units", priceUnit: "Per Unit" },
  { value: "narcotic", label: "Narcotic", unit: "Units", priceUnit: "Per Unit" },
] as const;

export type SellingType = typeof SELLING_TYPES[number]["value"];

// Types that require mandatory expiry date
export const EXPIRY_REQUIRED_TYPES: SellingType[] = [
  "per_tablet",
  "capsule",
  "injection",
  "syrup",
  "suspension",
  "emulsion",
  "oral_solution",
  "solution",
  "elixir",
  "dry_syrup",
  "narcotic",
  "suppository",
  "pessary",
  "enema",
  "ampoule",
  "vial",
  "cream",
  "ointment",
  "eye_drops",
  "ear_drops",
  "drops",
  "oral_ampoule",
  "gel",
  "oral_gel",
  "spray",
  "nasal_spray",
  "inhaler",
  "nebulizer_solution",
  "liquid",
  "drip",
  "infusion",
  "iv_fluid",
  "insulin",
  "vaccine",
  "sachet",
  "supplement",
  "per_packet",
  "powder",
  "granules",
  "lotion",
  "paste",
  "foam",
  "patch",
  "shampoo",
  "mouthwash",
  "gargle",
];

// Non-drug items where expiry is optional
export const EXPIRY_OPTIONAL_TYPES: SellingType[] = [
  "iv_set",
  "cannula",
  "syringe",
  "bandage",
  "crepe_bandage",
  "dressing",
  "cotton",
  "plaster",
  "mask",
  "soap",
  "bar",
  "toothbrush",
  "toothpaste",
  "sugar_strip",
];

// Helper functions
export function getSellingTypeLabel(value: string): string {
  const type = SELLING_TYPES.find(t => t.value === value);
  return type?.label || value;
}

export function getQuantityUnit(sellingType: string): string {
  const type = SELLING_TYPES.find(t => t.value === sellingType);
  return type?.unit || "Units";
}

export function getPriceUnit(sellingType: string): string {
  const type = SELLING_TYPES.find(t => t.value === sellingType);
  return type?.priceUnit || "Per Unit";
}

export function isExpiryRequired(sellingType: string): boolean {
  return EXPIRY_REQUIRED_TYPES.includes(sellingType as SellingType);
}

export function isExpiryOptional(sellingType: string): boolean {
  return EXPIRY_OPTIONAL_TYPES.includes(sellingType as SellingType);
}
