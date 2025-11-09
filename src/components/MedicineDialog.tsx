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

interface MedicineDialogProps {
  open: boolean;
  onClose: () => void;
  medicine?: any;
}

export function MedicineDialog({ open, onClose, medicine }: MedicineDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: medicine || {},
  });

  useEffect(() => {
    if (medicine) {
      reset(medicine);
    } else {
      reset({});
    }
  }, [medicine, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (medicine) {
        const { error } = await supabase
          .from("medicines")
          .update(data)
          .eq("id", medicine.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("medicines")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success(medicine ? "Medicine updated successfully" : "Medicine added successfully");
      onClose();
    },
    onError: () => {
      toast.error("Failed to save medicine");
    },
  });

  const onSubmit = (data: any) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{medicine ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="medicine_name">Medicine Name *</Label>
              <Input id="medicine_name" {...register("medicine_name", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch_no">Batch No *</Label>
              <Input id="batch_no" {...register("batch_no", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input id="company_name" {...register("company_name", { required: true })} />
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
              {medicine ? "Update" : "Add"} Medicine
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
