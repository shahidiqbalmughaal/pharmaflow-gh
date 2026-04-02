import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { useCosmeticCategories } from "@/hooks/useCosmeticCategories";
import { SELLING_TYPES } from "@/lib/medicineTypes";
import { PRODUCT_CATEGORIES, getCategoriesForType, PRODUCT_TYPE_LABELS, type ProductType } from "@/lib/productCategories";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { toMedicineRecord, toCosmeticRecord } from "@/lib/productTypes";

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  product?: any;
  defaultType?: ProductType;
}

export function ProductDialog({ open, onClose, product, defaultType = 'medicine' }: ProductDialogProps) {
  const queryClient = useQueryClient();
  const { currentShop } = useShop();
  const { categories, getSubcategories } = useCosmeticCategories();
  const [productType, setProductType] = useState<ProductType>(defaultType);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  const watchedSellingType = watch("selling_type");
  const watchedProductCategory = watch("product_category");

  useEffect(() => {
    if (product) {
      const type = product._product_type || (product.medicine_name ? 'medicine' : 'cosmetic');
      // Check if it's herbal medicine
      const resolvedType = type === 'medicine' && product.product_category && PRODUCT_CATEGORIES.herbal_medicine?.includes(product.product_category)
        ? 'herbal_medicine' : type;
      setProductType(resolvedType);
      
      if (resolvedType === 'medicine' || resolvedType === 'herbal_medicine') {
        reset({
          name: product.medicine_name,
          batch_no: product.batch_no,
          rack_no: product.rack_no,
          quantity: product.quantity,
          purchase_price: Number(product.purchase_price),
          selling_price: Number(product.selling_price),
          manufacturing_date: product.manufacturing_date,
          expiry_date: product.expiry_date || "",
          supplier: product.supplier,
          company_name: product.company_name,
          selling_type: product.selling_type || "per_tablet",
          is_narcotic: product.is_narcotic || false,
          tablets_per_packet: product.tablets_per_packet || 1,
          price_per_packet: product.price_per_packet ? Number(product.price_per_packet) : undefined,
          product_category: product.product_category || "",
        });
      } else {
        reset({
          name: product.product_name,
          batch_no: product.batch_no,
          rack_no: product.rack_no,
          quantity: product.quantity,
          purchase_price: Number(product.purchase_price),
          selling_price: Number(product.selling_price),
          manufacturing_date: product.manufacturing_date,
          expiry_date: product.expiry_date || "",
          supplier: product.supplier,
          category_id: product.category_id || "",
          subcategory_id: product.subcategory_id || "",
          brand: product.brand || "",
          minimum_stock: product.minimum_stock ?? 10,
          product_category: product.product_category || "",
        });
        setSelectedCategoryId(product.category_id || "");
      }
    } else {
      reset({});
      setProductType(defaultType);
      setSelectedCategoryId("");
    }
  }, [product, reset, defaultType]);

  const filteredSubcategories = selectedCategoryId ? getSubcategories(selectedCategoryId) : [];

  // Both medicine and herbal_medicine save to the medicines table
  const isMedicineType = productType === 'medicine' || productType === 'herbal_medicine';

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isMedicineType) {
        const record = {
          ...toMedicineRecord({
            name: data.name,
            batch_no: data.batch_no,
            rack_no: data.rack_no,
            quantity: data.quantity,
            purchase_price: data.purchase_price,
            selling_price: data.selling_price,
            manufacturing_date: data.manufacturing_date,
            expiry_date: data.expiry_date || null,
            supplier: data.supplier,
            company_name: data.company_name,
            selling_type: data.selling_type || "per_tablet",
            is_narcotic: data.is_narcotic || false,
            tablets_per_packet: data.tablets_per_packet || 1,
            price_per_packet: data.price_per_packet || null,
            product_category: data.product_category || null,
          }),
        };

        if (product) {
          const { error } = await supabase.from("medicines").update(record).eq("id", product.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("medicines").insert({ ...record, shop_id: currentShop?.shop_id || null });
          if (error) throw error;
        }
      } else {
        const record = {
          ...toCosmeticRecord({
            name: data.name,
            batch_no: data.batch_no,
            rack_no: data.rack_no,
            quantity: data.quantity,
            purchase_price: data.purchase_price,
            selling_price: data.selling_price,
            manufacturing_date: data.manufacturing_date,
            expiry_date: data.expiry_date,
            supplier: data.supplier,
            category_id: data.category_id,
            subcategory_id: data.subcategory_id,
            brand: data.brand,
            minimum_stock: data.minimum_stock ?? 10,
            product_category: data.product_category || null,
          }),
        };

        if (product) {
          const { error } = await supabase.from("cosmetics").update(record).eq("id", product.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("cosmetics").insert({ ...record, shop_id: currentShop?.shop_id || null });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-medicines"] });
      queryClient.invalidateQueries({ queryKey: ["products-cosmetics"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
      queryClient.invalidateQueries({ queryKey: ["medicines-count"] });
      toast.success(product ? "Product updated successfully" : "Product added successfully");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to save product");
    },
  });

  const onSubmit = (data: any) => {
    data.quantity = Number(data.quantity);
    data.purchase_price = Number(data.purchase_price);
    data.selling_price = Number(data.selling_price);
    if (data.minimum_stock) data.minimum_stock = Number(data.minimum_stock);
    if (data.tablets_per_packet) data.tablets_per_packet = Number(data.tablets_per_packet);
    if (data.price_per_packet) data.price_per_packet = Number(data.price_per_packet);
    saveMutation.mutate(data);
  };

  const isEditing = !!product;
  const availableCategories = getCategoriesForType(productType);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Product" : "Add New Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Product Type Selector */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>Product Type *</Label>
              <RadioGroup
                value={productType}
                onValueChange={(val) => {
                  setProductType(val as ProductType);
                  reset({});
                  setSelectedCategoryId("");
                }}
                className="flex gap-6"
              >
                {(Object.entries(PRODUCT_TYPE_LABELS) as [ProductType, string][]).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-2">
                    <RadioGroupItem value={value} id={`type-${value}`} />
                    <Label htmlFor={`type-${value}`} className="cursor-pointer font-normal">{label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Product Category */}
          <div className="space-y-2">
            <Label>Product Category *</Label>
            <Select
              value={watchedProductCategory || ""}
              onValueChange={(val) => setValue("product_category", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product category" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.product_category && <p className="text-sm text-destructive">{errors.product_category.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Common Fields */}
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" {...register("name", { required: "Product name is required" })} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message as string}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch_no">Batch No *</Label>
              <Input id="batch_no" {...register("batch_no", { required: "Batch number is required" })} />
              {errors.batch_no && <p className="text-sm text-destructive">{errors.batch_no.message as string}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rack_no">Rack No *</Label>
              <Input id="rack_no" {...register("rack_no", { required: "Rack number is required" })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input id="quantity" type="number" {...register("quantity", { required: "Quantity is required", valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Purchase Price *</Label>
              <Input id="purchase_price" type="number" step="0.01" {...register("purchase_price", { required: "Required", valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling_price">Selling Price *</Label>
              <Input id="selling_price" type="number" step="0.01" {...register("selling_price", { required: "Required", valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturing_date">Manufacturing Date *</Label>
              <Input id="manufacturing_date" type="date" {...register("manufacturing_date", { required: "Required" })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date {productType === 'cosmetic' ? '*' : ''}</Label>
              <Input id="expiry_date" type="date" {...register("expiry_date", productType === 'cosmetic' ? { required: "Required" } : {})} />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="supplier">Supplier *</Label>
              <Input id="supplier" {...register("supplier", { required: "Supplier is required" })} />
            </div>

            {/* Medicine/Herbal Medicine specific fields */}
            {isMedicineType && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input id="company_name" {...register("company_name", { required: "Company name is required" })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_type">Selling Type *</Label>
                  <Select
                    value={watchedSellingType || "per_tablet"}
                    onValueChange={(val) => setValue("selling_type", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select selling type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SELLING_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {watchedSellingType === "per_packet" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="tablets_per_packet">Tablets Per Packet</Label>
                      <Input id="tablets_per_packet" type="number" {...register("tablets_per_packet", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price_per_packet">Price Per Packet</Label>
                      <Input id="price_per_packet" type="number" step="0.01" {...register("price_per_packet", { valueAsNumber: true })} />
                    </div>
                  </>
                )}
                <div className="space-y-2 col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_narcotic"
                      checked={watch("is_narcotic") || false}
                      onCheckedChange={(checked) => setValue("is_narcotic", checked)}
                    />
                    <Label htmlFor="is_narcotic" className="cursor-pointer font-normal">
                      Narcotic / Controlled Substance
                    </Label>
                  </div>
                </div>
              </>
            )}

            {/* Cosmetic-specific fields */}
            {productType === 'cosmetic' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="category_id">Main Category *</Label>
                  <Select
                    value={selectedCategoryId}
                    onValueChange={(val) => {
                      setSelectedCategoryId(val);
                      setValue("category_id", val);
                      setValue("subcategory_id", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategory_id">Sub Category *</Label>
                  <Select
                    value={watch("subcategory_id") || ""}
                    onValueChange={(val) => setValue("subcategory_id", val)}
                    disabled={!selectedCategoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCategoryId ? "Select sub category" : "Select category first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand *</Label>
                  <Input id="brand" {...register("brand", { required: "Brand is required" })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimum_stock">Minimum Stock Level *</Label>
                  <Input id="minimum_stock" type="number" defaultValue={10} {...register("minimum_stock", { valueAsNumber: true })} />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {isEditing ? "Update" : "Add"} Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
