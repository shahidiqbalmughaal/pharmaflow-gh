import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { expenseSchema, expenseCategories, type ExpenseFormData } from "@/lib/expenseValidations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ExpenseDialogProps {
  open: boolean;
  onClose: () => void;
  expense?: any;
}

export function ExpenseDialog({ open, onClose, expense }: ExpenseDialogProps) {
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expense || {
      expense_date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (expense) {
      reset({
        amount: Number(expense.amount),
        expense_date: expense.expense_date,
        category: expense.category,
        notes: expense.notes || "",
      });
    } else if (open) {
      reset({
        amount: undefined,
        expense_date: new Date().toISOString().split('T')[0],
        category: undefined,
        notes: "",
      } as any);
    }
  }, [expense, open, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const expenseData = {
        amount: data.amount,
        expense_date: data.expense_date,
        category: data.category,
        notes: data.notes || null,
      };

      if (expense) {
        const { error } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", expense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("expenses")
          .insert([expenseData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["todayExpenses"] });
      queryClient.invalidateQueries({ queryKey: ["monthlyExpenses"] });
      toast.success(expense ? "Expense updated successfully" : "Expense added successfully");
      onClose();
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save expense");
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense_date">Date *</Label>
            <Input
              id="expense_date"
              type="date"
              {...register("expense_date")}
            />
            {errors.expense_date && (
              <p className="text-sm text-destructive">{errors.expense_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              onValueChange={(value) => setValue("category", value as any)}
              defaultValue={expense?.category}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(expenseCategories).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Add any additional details..."
              rows={3}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {expense ? "Update" : "Add"} Expense
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
