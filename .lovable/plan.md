
## Unified Products Module — Implementation Plan

### Phase 1: Database Changes
- Add `product_type` column (text, default 'medicine') to `medicines` table
- Add `product_type` column (text, default 'cosmetic') to `cosmetics` table  
- Add nullable medicine-specific fields to cosmetics (`company_name`, `selling_type`, `is_narcotic`, `barcode`, `tablets_per_packet`, `price_per_packet`)
- Add nullable cosmetic-specific fields to medicines (`category_id`, `subcategory_id`, `brand`, `minimum_stock`)
- **Note**: We keep BOTH tables to avoid breaking `sale_items.item_type`, `decrement_medicine_quantity()`, `decrement_cosmetic_quantity()`, returns logic, and all RLS policies. The unified UI queries both tables.

### Phase 2: Unified Products Page
- Create `/products` route with a new `Products.tsx` page
- Query both `medicines` and `cosmetics` tables, normalize into a unified list
- Add filter tabs: All | Medicines | Cosmetics
- Show type badge on each row
- Support all existing features: search, filters, export, batch-wise view, find & replace

### Phase 3: Unified Product Dialog
- Create `ProductDialog.tsx` with product type selector (Medicine / Cosmetic radio)
- Common fields always visible
- Medicine-specific fields shown conditionally
- Cosmetic-specific fields shown conditionally
- Saves to correct table based on product_type

### Phase 4: Sidebar & Routing
- Replace Medicines + Cosmetics sidebar items with single "Products" item
- Redirect `/medicines` and `/cosmetics` to `/products` with appropriate filter
- Update `App.tsx` routes

### Phase 5: Verification
- Ensure Sales, Returns, Reports, Dashboard still work (they reference tables directly — unchanged)
- Test product creation for both types
- Test filters and search

### What stays unchanged (critical)
- `medicines` and `cosmetics` database tables (structure preserved)
- `sale_items`, `returns`, `sales` tables and their `item_type` references
- `decrement_medicine_quantity()` and `decrement_cosmetic_quantity()` functions
- All RLS policies
- All existing data
