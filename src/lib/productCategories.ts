// Product categories organized by product type
// These are separate from Selling Types (which handle dosage/unit for billing)
// IMPORTANT: Must stay in sync with the public.product_category_catalog table.
// The DB trigger rejects any product_category not present in that catalog.

export type ProductType = 'medicine' | 'cosmetic' | 'herbal_medicine';

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  medicine: 'Medicine',
  cosmetic: 'Cosmetic',
  herbal_medicine: 'Herbal Medicine',
};

export const PRODUCT_CATEGORIES: Record<ProductType, string[]> = {
  medicine: [
    'Antacids',
    'Anti-Allergy',
    'Antibiotics',
    'Bandages',
    'BP Apparatus',
    'Capsules',
    'Creams',
    'Dermatology Medicines',
    'Diabetic Care',
    'Drops',
    'Ear Drops',
    'Eye Drops',
    'First Aid',
    'Gels',
    'Gloves',
    'Injections',
    'Insulin',
    'Masks',
    'Medical Devices',
    'Medicated Facewash',
    'Medicated Lotion',
    'Medicated Shampoo',
    'Medicated Solution',
    'Medicated Sunblock',
    'Nasal Spray',
    'Nebulizer Solutions',
    'Ointments',
    'Pain Relief',
    'Pediatric Medicines',
    'Powders',
    'Sachets',
    'Surgical Items',
    'Syrups',
    'Tablets',
    'Test Strips',
    'Thermometers',
    'Vaccines',
    'Vitamins & Supplements',
    'Wheelchair & Support',
  ],
  herbal_medicine: [
    'Ayurvedic Products',
    'Herbal Capsules',
    'Herbal Cream',
    'Herbal Drops',
    'Herbal Extract',
    'Herbal Lotion',
    'Herbal Medicine',
    'Herbal Oil',
    'Herbal Powder',
    'Herbal Shampoo',
    'Herbal Supplements',
    'Herbal Syrup',
    'Herbal Tablets',
    'Herbal Tea',
    'Homeopathic Medicine',
    'Organic Skincare',
  ],
  cosmetic: [
    'Acne Care',
    'Baby Care',
    'Baby Lotion',
    'Baby Shampoo',
    'Beauty Cream',
    'Body Wash',
    'Conditioner',
    'Cream',
    'Cream Bleach',
    'Deodorant',
    'Diapers',
    'Emollient Cream',
    'Face Wash',
    'Facewash',
    'Facial Cleanser',
    'Feminine Hygiene Products',
    'Feminine Hygiene Wash',
    'Hair Color',
    'Hair Oil',
    'Intimate Care',
    'Lip Care',
    'Lotion',
    'Makeup',
    'Medicated Shampoo',
    'Moisturizer',
    'Nail Care',
    'Perfume',
    'Sanitary Pads',
    'Scrub',
    'Serum',
    'Shampoo',
    'Skin Whitening',
    'Soap',
    'Sunscreen',
    'Tampons',
    'Toner',
  ],
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
