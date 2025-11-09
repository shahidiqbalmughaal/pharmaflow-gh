import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

export function CosmeticDialog({ open, onClose, cosmetic }: CosmeticDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm({
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
        const { error } = await supabase
          .from("cosmetics")
          .insert(data);
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

  const onSubmit = (data: any) => {
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
              <Input id="product_name" {...register("product_name", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Input id="brand" {...register("brand", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch_no">Batch No *</Label>
              <Input id="batch_no" {...register("batch_no", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rack_no">Rack No *</Label>
              <Input id="rack_no" {...register("rack_no", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                {...register("quantity", { required: true, valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Purchase Price *</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                {...register("purchase_price", { required: true, valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling_price">Selling Price *</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                {...register("selling_price", { required: true, valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturing_date">Manufacturing Date *</Label>
              <Input
                id="manufacturing_date"
                type="date"
                {...register("manufacturing_date", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date *</Label>
              <Input
                id="expiry_date"
                type="date"
                {...register("expiry_date", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Input id="supplier" {...register("supplier", { required: true })} />
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
