import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cosmeticSchema } from "@/lib/validations";
import { useShop } from "@/hooks/useShop";
import type { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CosmeticDialogProps {
  open: boolean;
  onClose: () => void;
  cosmetic?: any;
}

type CosmeticFormData = z.infer<typeof cosmeticSchema>;

export function CosmeticDialog({ open, onClose, cosmetic }: CosmeticDialogProps) {
  const queryClient = useQueryClient();
  const { currentShop } = useShop();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CosmeticFormData>({
    resolver: zodResolver(cosmeticSchema),
    defaultValues: cosmetic || {},
  });

  useEffect(() => {
    if (cosmetic) {
      reset(cosmetic);
    } else {
      reset({});
    }
  }, [cosmetic, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (cosmetic) {
        const { error } = await supabase
          .from("cosmetics")
          .update(data)
          .eq("id", cosmetic.id);
        if (error) throw error;
      } else {
        // Add shop_id for new cosmetics
        const insertData = {
          ...data,
          shop_id: currentShop?.shop_id || null,
        };
        const { error } = await supabase
          .from("cosmetics")
          .insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
      toast.success(cosmetic ? "Cosmetic updated successfully" : "Cosmetic added successfully");
      onClose();
    },
    onError: () => {
      toast.error("Failed to save cosmetic");
    },
  });

  const onSubmit = (data: CosmeticFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cosmetic ? "Edit Cosmetic" : "Add New Cosmetic"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product_name">Product Name *</Label>
              <Input id="product_name" {...register("product_name")} />
              {errors.product_name && (
                <p className="text-sm text-destructive">{errors.product_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Input id="brand" {...register("brand")} />
              {errors.brand && (
                <p className="text-sm text-destructive">{errors.brand.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch_no">Batch No *</Label>
              <Input id="batch_no" {...register("batch_no")} />
              {errors.batch_no && (
                <p className="text-sm text-destructive">{errors.batch_no.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rack_no">Rack No *</Label>
              <Input id="rack_no" {...register("rack_no")} />
              {errors.rack_no && (
                <p className="text-sm text-destructive">{errors.rack_no.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                {...register("quantity", { valueAsNumber: true })}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Purchase Price *</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                {...register("purchase_price", { valueAsNumber: true })}
              />
              {errors.purchase_price && (
                <p className="text-sm text-destructive">{errors.purchase_price.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling_price">Selling Price *</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                {...register("selling_price", { valueAsNumber: true })}
              />
              {errors.selling_price && (
                <p className="text-sm text-destructive">{errors.selling_price.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturing_date">Manufacturing Date *</Label>
              <Input
                id="manufacturing_date"
                type="date"
                {...register("manufacturing_date")}
              />
              {errors.manufacturing_date && (
                <p className="text-sm text-destructive">{errors.manufacturing_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date *</Label>
              <Input
                id="expiry_date"
                type="date"
                {...register("expiry_date")}
              />
              {errors.expiry_date && (
                <p className="text-sm text-destructive">{errors.expiry_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Input id="supplier" {...register("supplier")} />
              {errors.supplier && (
                <p className="text-sm text-destructive">{errors.supplier.message}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {cosmetic ? "Update" : "Add"} Cosmetic
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
