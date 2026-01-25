import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supplierSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: any;
}

type SupplierFormData = z.infer<typeof supplierSchema>;

export function SupplierDialog({ open, onOpenChange, supplier }: SupplierDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!supplier;

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      whatsapp: "",
      email: "",
      address: "",
      notes: "",
      order_booker_name: "",
      order_booker_phone: "",
      order_booker_whatsapp: "",
      delivery_person_name: "",
      delivery_person_phone: "",
      delivery_person_whatsapp: "",
    },
  });

  useEffect(() => {
    if (supplier) {
      form.reset({
        name: supplier.name || "",
        company: supplier.company || "",
        phone: supplier.phone || "",
        whatsapp: supplier.whatsapp || "",
        email: supplier.email || "",
        address: supplier.address || "",
        notes: supplier.notes || "",
        order_booker_name: supplier.order_booker_name || "",
        order_booker_phone: supplier.order_booker_phone || "",
        order_booker_whatsapp: supplier.order_booker_whatsapp || "",
        delivery_person_name: supplier.delivery_person_name || "",
        delivery_person_phone: supplier.delivery_person_phone || "",
        delivery_person_whatsapp: supplier.delivery_person_whatsapp || "",
      });
    } else {
      form.reset({
        name: "",
        company: "",
        phone: "",
        whatsapp: "",
        email: "",
        address: "",
        notes: "",
        order_booker_name: "",
        order_booker_phone: "",
        order_booker_whatsapp: "",
        delivery_person_name: "",
        delivery_person_phone: "",
        delivery_person_whatsapp: "",
      });
    }
  }, [supplier, form]);

  const mutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      // Ensure required fields are present
      const supplierData = {
        name: data.name,
        phone: data.phone,
        company: data.company || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        order_booker_name: data.order_booker_name || null,
        order_booker_phone: data.order_booker_phone || null,
        order_booker_whatsapp: data.order_booker_whatsapp || null,
        delivery_person_name: data.delivery_person_name || null,
        delivery_person_phone: data.delivery_person_phone || null,
        delivery_person_whatsapp: data.delivery_person_whatsapp || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("suppliers")
          .update(supplierData)
          .eq("id", supplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert([supplierData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(isEditing ? "Supplier updated successfully" : "Supplier added successfully");
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
    },
  });

  const onSubmit = (data: SupplierFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update supplier contact information"
              : "Add a new supplier/distributor to your contacts"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Premier Sales Pvt Ltd" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="+92 300 1234567" {...field} />
                    </FormControl>
                    <FormDescription>Primary contact number</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+923001234567" {...field} />
                    </FormControl>
                    <FormDescription>For direct report sharing</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="supplier@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Street address, city, country" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional information about this supplier" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Order Booker Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Order Booker Details (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="order_booker_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Order booker name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="order_booker_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+92 300 1234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="order_booker_whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+923001234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Delivery Person Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Delivery Person Details (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="delivery_person_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Delivery person name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="delivery_person_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+92 300 1234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="delivery_person_whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+923001234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Add Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
