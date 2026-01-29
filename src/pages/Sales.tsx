import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SaleDialog } from "@/components/SaleDialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const Sales = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<{ id: string; salesman_name: string; total_amount: number } | null>(null);
  const queryClient = useQueryClient();
  const { shopStaffInfo, userRole } = useAuth();

  // Only owners and admins can delete sales
  const canDelete = shopStaffInfo?.shop_role === 'owner' || userRole === 'admin';

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("sale_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (saleId: string) => {
      // First get sale items to restore inventory
      const { data: saleItems, error: itemsError } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", saleId);

      if (itemsError) throw itemsError;

      // Restore inventory for each item
      for (const item of saleItems || []) {
        if (item.item_type === 'medicine') {
          const { error: updateError } = await supabase
            .from("medicines")
            .update({ quantity: supabase.rpc ? undefined : undefined })
            .eq("id", item.item_id);
          
          // Use raw update with increment
          const { data: medicine } = await supabase
            .from("medicines")
            .select("quantity")
            .eq("id", item.item_id)
            .single();

          if (medicine) {
            await supabase
              .from("medicines")
              .update({ quantity: medicine.quantity + item.quantity })
              .eq("id", item.item_id);
          }
        } else if (item.item_type === 'cosmetic') {
          const { data: cosmetic } = await supabase
            .from("cosmetics")
            .select("quantity")
            .eq("id", item.item_id)
            .single();

          if (cosmetic) {
            await supabase
              .from("cosmetics")
              .update({ quantity: cosmetic.quantity + item.quantity })
              .eq("id", item.item_id);
          }
        }
      }

      // Delete sale items first (foreign key constraint)
      const { error: deleteItemsError } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", saleId);

      if (deleteItemsError) throw deleteItemsError;

      // Delete the sale
      const { error: deleteSaleError } = await supabase
        .from("sales")
        .delete()
        .eq("id", saleId);

      if (deleteSaleError) throw deleteSaleError;

      return saleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
      toast.success("Sale deleted and inventory restored");
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete sale: ${error.message}`);
    },
  });

  const handleDeleteClick = (sale: { id: string; salesman_name: string; total_amount: number }) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (saleToDelete) {
      deleteSaleMutation.mutate(saleToDelete.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Sales & Billing</h2>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Sale
        </Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Salesman</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead>Discount (%)</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Profit</TableHead>
              {canDelete && <TableHead className="w-16">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={canDelete ? 8 : 7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : sales && sales.length > 0 ? (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    {format(new Date(sale.sale_date), "MMM dd, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>{sale.salesman_name}</TableCell>
                  <TableCell>{formatCurrency(Number(sale.subtotal))}</TableCell>
                  <TableCell>
                    {sale.discount_percentage ? `${sale.discount_percentage}%` : '-'}
                    {sale.discount_percentage && sale.discount > 0 && (
                      <span className="text-xs text-muted-foreground block">
                        ({formatCurrency(Number(sale.discount))})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(Number(sale.tax))}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(Number(sale.total_amount))}</TableCell>
                  <TableCell className="text-success font-bold">
                    {formatCurrency(Number(sale.total_profit))}
                  </TableCell>
                  {canDelete && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick({
                          id: sale.id,
                          salesman_name: sale.salesman_name,
                          total_amount: Number(sale.total_amount)
                        })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={canDelete ? 8 : 7} className="text-center text-muted-foreground">
                  No sales found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SaleDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sale?
              {saleToDelete && (
                <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                  <p><strong>Salesman:</strong> {saleToDelete.salesman_name}</p>
                  <p><strong>Amount:</strong> {formatCurrency(saleToDelete.total_amount)}</p>
                </div>
              )}
              <p className="mt-2 text-amber-600 dark:text-amber-500">
                This will restore the sold items back to inventory.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSaleMutation.isPending}
            >
              {deleteSaleMutation.isPending ? "Deleting..." : "Delete Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sales;
