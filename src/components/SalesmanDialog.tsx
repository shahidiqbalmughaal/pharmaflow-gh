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

interface SalesmanDialogProps {
  open: boolean;
  onClose: () => void;
  salesman?: any;
}

export function SalesmanDialog({ open, onClose, salesman }: SalesmanDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm({
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

  const onSubmit = (data: any) => {
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
            <Input id="name" {...register("name", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">Contact *</Label>
            <Input id="contact" {...register("contact", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnic">CNIC *</Label>
            <Input id="cnic" {...register("cnic", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="joining_date">Joining Date *</Label>
            <Input
              id="joining_date"
              type="date"
              {...register("joining_date", { required: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assigned_counter">Assigned Counter *</Label>
            <Input id="assigned_counter" {...register("assigned_counter", { required: true })} />
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
