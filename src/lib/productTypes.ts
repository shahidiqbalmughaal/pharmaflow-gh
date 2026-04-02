// Unified product type for combining medicines and cosmetics
export interface UnifiedProduct {
  id: string;
  product_type: 'medicine' | 'cosmetic' | 'herbal_medicine';
  name: string;
  batch_no: string;
  rack_no: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  manufacturing_date: string;
  expiry_date: string | null;
  supplier: string;
  shop_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Medicine-specific
  company_name?: string;
  selling_type?: string;
  is_narcotic?: boolean;
  barcode?: string;
  tablets_per_packet?: number;
  price_per_packet?: number;
  // Cosmetic-specific
  category_id?: string;
  subcategory_id?: string;
  brand?: string;
  minimum_stock?: number;
  product_category?: string;
}

export function normalizeMedicine(m: any): UnifiedProduct {
  // Detect herbal_medicine from product_category
  const { PRODUCT_CATEGORIES } = require('@/lib/productCategories');
  const isHerbal = m.product_category && PRODUCT_CATEGORIES.herbal_medicine?.includes(m.product_category);
  return {
    id: m.id,
    product_type: isHerbal ? 'herbal_medicine' : 'medicine',
    name: m.medicine_name,
    batch_no: m.batch_no,
    rack_no: m.rack_no,
    quantity: m.quantity,
    purchase_price: Number(m.purchase_price),
    selling_price: Number(m.selling_price),
    manufacturing_date: m.manufacturing_date,
    expiry_date: m.expiry_date,
    supplier: m.supplier,
    shop_id: m.shop_id,
    created_at: m.created_at,
    updated_at: m.updated_at,
    company_name: m.company_name,
    selling_type: m.selling_type || 'per_tablet',
    is_narcotic: m.is_narcotic || false,
    barcode: m.barcode,
    tablets_per_packet: m.tablets_per_packet,
    price_per_packet: m.price_per_packet ? Number(m.price_per_packet) : undefined,
    product_category: m.product_category || undefined,
  };
}

export function normalizeCosmetic(c: any): UnifiedProduct {
  return {
    id: c.id,
    product_type: 'cosmetic',
    name: c.product_name,
    batch_no: c.batch_no,
    rack_no: c.rack_no,
    quantity: c.quantity,
    purchase_price: Number(c.purchase_price),
    selling_price: Number(c.selling_price),
    manufacturing_date: c.manufacturing_date,
    expiry_date: c.expiry_date,
    supplier: c.supplier,
    shop_id: c.shop_id,
    created_at: c.created_at,
    updated_at: c.updated_at,
    category_id: c.category_id,
    subcategory_id: c.subcategory_id,
    brand: c.brand,
    minimum_stock: c.minimum_stock ?? 10,
    product_category: c.product_category || undefined,
  };
}

// Convert back to original format for saving
export function toMedicineRecord(p: Partial<UnifiedProduct> & { name: string }) {
  return {
    medicine_name: p.name,
    batch_no: p.batch_no,
    rack_no: p.rack_no,
    quantity: p.quantity,
    purchase_price: p.purchase_price,
    selling_price: p.selling_price,
    manufacturing_date: p.manufacturing_date,
    expiry_date: p.expiry_date || null,
    supplier: p.supplier,
    company_name: p.company_name,
    selling_type: p.selling_type || 'per_tablet',
    is_narcotic: p.is_narcotic || false,
    barcode: p.barcode || null,
    tablets_per_packet: p.tablets_per_packet || 1,
    price_per_packet: p.price_per_packet || null,
  };
}

export function toCosmeticRecord(p: Partial<UnifiedProduct> & { name: string }) {
  return {
    product_name: p.name,
    batch_no: p.batch_no,
    rack_no: p.rack_no,
    quantity: p.quantity,
    purchase_price: p.purchase_price,
    selling_price: p.selling_price,
    manufacturing_date: p.manufacturing_date,
    expiry_date: p.expiry_date,
    supplier: p.supplier,
    category_id: p.category_id || null,
    subcategory_id: p.subcategory_id || null,
    brand: p.brand,
    minimum_stock: p.minimum_stock ?? 10,
  };
}
