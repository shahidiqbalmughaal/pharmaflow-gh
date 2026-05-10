// Product categories organized by product type
// These are separate from Selling Types (which handle dosage/unit for billing)

export type ProductType = 'medicine' | 'cosmetic' | 'herbal_medicine';

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  medicine: 'Medicine',
  cosmetic: 'Cosmetic',
  herbal_medicine: 'Herbal Medicine',
};

// Helper: dedupe (case-insensitive) and sort alphabetically.
// Preserves the first-seen casing — i.e. existing categories keep their original spelling.
function uniqueSorted(list: string[]): string[] {
  const seen = new Map<string, string>();
  for (const item of list) {
    const key = item.trim().toLowerCase();
    if (!key) continue;
    if (!seen.has(key)) seen.set(key, item.trim());
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

// Existing categories (kept unchanged) + newly added categories.
// Duplicates are filtered automatically by uniqueSorted().
const MEDICINE_LIST = [
  // Existing
  'Medicated Shampoo',
  'Medicated Sunblock',
  'Medicated Facewash',
  'Medicated Lotion',
  'Medicated Solution',
  // New: Medicine & Pharmacy
  'Tablets',
  'Capsules',
  'Syrups',
  'Injections',
  'Drops',
  'Eye Drops',
  'Ear Drops',
  'Nasal Spray',
  'Ointments',
  'Creams',
  'Gels',
  'Powders',
  'Sachets',
  'Vaccines',
  'Insulin',
  'Nebulizer Solutions',
  'Pediatric Medicines',
  'Antibiotics',
  'Pain Relief',
  'Vitamins & Supplements',
  'Antacids',
  'Anti-Allergy',
  'Dermatology Medicines',
  // New: Medical & General
  'First Aid',
  'Bandages',
  'Surgical Items',
  'Gloves',
  'Masks',
  'Thermometers',
  'BP Apparatus',
  'Diabetic Care',
  'Test Strips',
  'Wheelchair & Support',
  'Medical Devices',
];

const HERBAL_LIST = [
  // Existing
  'Herbal Syrup',
  'Herbal Capsules',
  'Herbal Tablets',
  'Herbal Powder',
  'Herbal Oil',
  'Herbal Cream',
  'Herbal Lotion',
  'Herbal Drops',
  'Herbal Tea',
  'Herbal Extract',
  // New: Herbal & Natural
  'Herbal Medicine',
  'Herbal Supplements',
  'Herbal Shampoo',
  'Organic Skincare',
  'Ayurvedic Products',
  'Homeopathic Medicine',
];

const COSMETIC_LIST = [
  // Existing
  'Shampoo',
  'Facewash',
  'Cream',
  'Lotion',
  'Serum',
  'Sunscreen',
  // New: Cosmetic & Personal Care
  'Feminine Hygiene Wash',
  'Intimate Care',
  'Medicated Shampoo',
  'Emollient Cream',
  'Conditioner',
  'Hair Oil',
  'Hair Color',
  'Face Wash',
  'Facial Cleanser',
  'Moisturizer',
  'Soap',
  'Body Wash',
  'Cream Bleach',
  'Scrub',
  'Toner',
  'Lip Care',
  'Deodorant',
  'Perfume',
  'Makeup',
  'Nail Care',
  'Beauty Cream',
  'Acne Care',
  'Skin Whitening',
  'Baby Care',
  'Diapers',
  'Baby Lotion',
  'Baby Shampoo',
  'Sanitary Pads',
  'Tampons',
  'Feminine Hygiene Products',
];

export const PRODUCT_CATEGORIES: Record<ProductType, string[]> = {
  medicine: uniqueSorted(MEDICINE_LIST),
  herbal_medicine: uniqueSorted(HERBAL_LIST),
  cosmetic: uniqueSorted(COSMETIC_LIST),
};

export function getCategoriesForType(type: ProductType): string[] {
  return PRODUCT_CATEGORIES[type] || [];
}

export function getProductTypeLabel(type: string): string {
  return PRODUCT_TYPE_LABELS[type as ProductType] || type;
}

export function isHerbalMedicine(product: any): boolean {
  return product?.product_category && PRODUCT_CATEGORIES.herbal_medicine.includes(product.product_category);
}
