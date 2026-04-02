// Product categories organized by product type
// These are separate from Selling Types (which handle dosage/unit for billing)

export type ProductType = 'medicine' | 'cosmetic' | 'herbal_medicine';

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  medicine: 'Medicine',
  cosmetic: 'Cosmetic',
  herbal_medicine: 'Herbal Medicine',
};

export const PRODUCT_CATEGORIES: Record<ProductType, string[]> = {
  medicine: [
    'Medicated Shampoo',
    'Medicated Sunblock',
    'Medicated Facewash',
    'Medicated Lotion',
    'Medicated Solution',
  ],
  herbal_medicine: [
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
  ],
  cosmetic: [
    'Shampoo',
    'Facewash',
    'Cream',
    'Lotion',
    'Serum',
    'Sunscreen',
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
