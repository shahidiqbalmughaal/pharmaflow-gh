import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { salesmanSchema } from "@/lib/validations";
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

interface SalesmanDialogProps {
  open: boolean;
  onClose: () => void;
  salesman?: any;
}

type SalesmanFormData = z.infer<typeof salesmanSchema>;

export function SalesmanDialog({ open, onClose, salesman }: SalesmanDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SalesmanFormData>({
    resolver: zodResolver(salesmanSchema),
    defaultValues: salesman || {},
  });

  useEffect(() => {
    if (salesman) {
      reset(salesman);
    } else {
      reset({});
    }
  }, [salesman, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (salesman) {
        const { error } = await supabase
          .from("salesmen")
          .update(data)
          .eq("id", salesman.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("salesmen")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesmen"] });
      toast.success(salesman ? "Salesman updated successfully" : "Salesman added successfully");
      onClose();
    },
    onError: () => {
      toast.error("Failed to save salesman");
    },
  });

  const onSubmit = (data: SalesmanFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{salesman ? "Edit Salesman" : "Add New Salesman"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">Contact *</Label>
            <Input id="contact" {...register("contact")} placeholder="03XX-XXXXXXX" />
            {errors.contact && (
              <p className="text-sm text-destructive">{errors.contact.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnic">CNIC *</Label>
            <Input id="cnic" {...register("cnic")} placeholder="12345-1234567-1" />
            {errors.cnic && (
              <p className="text-sm text-destructive">{errors.cnic.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="joining_date">Joining Date *</Label>
            <Input
              id="joining_date"
              type="date"
              {...register("joining_date")}
            />
            {errors.joining_date && (
              <p className="text-sm text-destructive">{errors.joining_date.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="assigned_counter">Assigned Counter *</Label>
            <Input id="assigned_counter" {...register("assigned_counter")} />
            {errors.assigned_counter && (
              <p className="text-sm text-destructive">{errors.assigned_counter.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {salesman ? "Update" : "Add"} Salesman
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
