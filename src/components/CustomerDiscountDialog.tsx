import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { customerDiscountSchema } from "@/lib/customerValidations";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type DiscountFormData = z.infer<typeof customerDiscountSchema>;

interface CustomerDiscountDialogProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  discount?: any;
}

export function CustomerDiscountDialog({ 
  open, 
  onClose, 
  customerId,
  discount 
}: CustomerDiscountDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<DiscountFormData>({
    resolver: zodResolver(customerDiscountSchema),
    defaultValues: {
      customerId: customerId,
      discountPercentage: 0,
      reason: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (discount) {
      form.reset({
        customerId: discount.customer_id,
        discountPercentage: Number(discount.discount_percentage),
        reason: discount.reason || "",
        isActive: discount.is_active,
      });
    } else {
      form.reset({
        customerId: customerId,
        discountPercentage: 0,
        reason: "",
        isActive: true,
      });
    }
  }, [discount, customerId, open, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: DiscountFormData) => {
      if (discount?.id) {
        const { error } = await supabase
          .from("customer_discounts")
          .update({
            discount_percentage: data.discountPercentage,
            reason: data.reason || null,
            is_active: data.isActive,
          })
          .eq("id", discount.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("customer_discounts")
          .insert({
            customer_id: data.customerId,
            discount_percentage: data.discountPercentage,
            reason: data.reason || null,
            is_active: data.isActive,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-discounts"] });
      toast.success(discount ? "Discount updated successfully" : "Discount added successfully");
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save discount");
    },
  });

  const onSubmit = (data: DiscountFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{discount ? "Edit Discount" : "Add Customer Discount"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="discountPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Percentage *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      max="100" 
                      step="0.01"
                      placeholder="Enter discount %" 
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Reason for discount" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable or disable this discount
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : discount ? "Update" : "Add Discount"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
