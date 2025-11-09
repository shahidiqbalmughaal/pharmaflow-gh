import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { medicineSchema } from "@/lib/validations";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface MedicineDialogProps {
  open: boolean;
  onClose: () => void;
  medicine?: any;
}

type MedicineFormData = z.infer<typeof medicineSchema>;

export function MedicineDialog({ open, onClose, medicine }: MedicineDialogProps) {
  const queryClient = useQueryClient();
  const [sellingType, setSellingType] = useState<"per_tablet" | "per_packet">("per_tablet");
  const [tabletsPerPacket, setTabletsPerPacket] = useState(1);
  const [quantity, setQuantity] = useState(0);
  const [pricePerPacket, setPricePerPacket] = useState(0);
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<MedicineFormData>({
    resolver: zodResolver(medicineSchema),
    defaultValues: medicine || { selling_type: "per_tablet" },
  });

  useEffect(() => {
    if (medicine) {
      reset(medicine);
      setSellingType(medicine.selling_type || "per_tablet");
      setTabletsPerPacket(medicine.tablets_per_packet || 1);
      setQuantity(medicine.quantity || 0);
      setPricePerPacket(medicine.price_per_packet || 0);
    } else {
      reset({ selling_type: "per_tablet" });
      setSellingType("per_tablet");
      setTabletsPerPacket(1);
      setQuantity(0);
      setPricePerPacket(0);
    }
  }, [medicine, reset]);

  // Watch for changes in selling type
  const watchSellingType = watch("selling_type");
  useEffect(() => {
    if (watchSellingType) {
      setSellingType(watchSellingType as "per_tablet" | "per_packet");
    }
  }, [watchSellingType]);

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

  const onSubmit = (data: MedicineFormData) => {
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
              <Input id="medicine_name" {...register("medicine_name")} />
              {errors.medicine_name && (
                <p className="text-sm text-destructive">{errors.medicine_name.message}</p>
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
              <Label htmlFor="company_name">Company Name *</Label>
              <Input id="company_name" {...register("company_name")} />
              {errors.company_name && (
                <p className="text-sm text-destructive">{errors.company_name.message}</p>
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
              <Label htmlFor="selling_type">Selling Type *</Label>
              <Select
                value={sellingType}
                onValueChange={(value) => {
                  setSellingType(value as "per_tablet" | "per_packet");
                  setValue("selling_type", value as "per_tablet" | "per_packet");
                }}
              >
                <SelectTrigger id="selling_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_tablet">Per Tablet</SelectItem>
                  <SelectItem value="per_packet">Per Packet</SelectItem>
                </SelectContent>
              </Select>
              {errors.selling_type && (
                <p className="text-sm text-destructive">{errors.selling_type.message}</p>
              )}
            </div>
          </div>

          {sellingType === "per_packet" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tablets_per_packet">Tablets per Packet *</Label>
                <Input
                  id="tablets_per_packet"
                  type="number"
                  value={tabletsPerPacket}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTabletsPerPacket(val);
                    setValue("tablets_per_packet", val);
                  }}
                />
                {errors.tablets_per_packet && (
                  <p className="text-sm text-destructive">{errors.tablets_per_packet.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Number of tablets in one packet
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_per_packet">Price per Packet *</Label>
                <Input
                  id="price_per_packet"
                  type="number"
                  step="0.01"
                  value={pricePerPacket}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPricePerPacket(val);
                    setValue("price_per_packet", val);
                  }}
                />
                {errors.price_per_packet && (
                  <p className="text-sm text-destructive">{errors.price_per_packet.message}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">
                {sellingType === "per_packet" ? "Total Tablets *" : "Quantity (Tablets) *"}
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setQuantity(val);
                  setValue("quantity", val);
                }}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
              {sellingType === "per_packet" && tabletsPerPacket > 0 && quantity > 0 && (
                <p className="text-xs text-muted-foreground">
                  = {Math.floor(quantity / tabletsPerPacket)} packets 
                  {quantity % tabletsPerPacket > 0 && ` + ${quantity % tabletsPerPacket} tablets`}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Purchase Price (Per Tablet) *</Label>
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
              <Label htmlFor="selling_price">
                {sellingType === "per_packet" ? "Selling Price (Per Tablet) *" : "Price Per Tablet (Selling) *"}
              </Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                {...register("selling_price", { valueAsNumber: true })}
              />
              {errors.selling_price && (
                <p className="text-sm text-destructive">{errors.selling_price.message}</p>
              )}
              {sellingType === "per_tablet" && quantity > 0 && watch("selling_price") > 0 && (
                <p className="text-xs text-success font-medium">
                  Total Value: {quantity} × {watch("selling_price")} = {(quantity * (watch("selling_price") || 0)).toFixed(2)}
                </p>
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
              {medicine ? "Update" : "Add"} Medicine
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
