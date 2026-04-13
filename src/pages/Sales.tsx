import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, FileText, Printer } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SaleDialog } from "@/components/SaleDialog";
import { NarcoticsRegisterPrint } from "@/components/NarcoticsRegisterPrint";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const Sales = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<{ id: string; salesman_name: string; total_amount: number } | null>(null);
  const [narcoticsDialogOpen, setNarcoticsDialogOpen] = useState(false);
  const [instantPrint, setInstantPrint] = useState(false);
  const narcoticsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { shopStaffInfo, userRole } = useAuth();

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

  // Fetch pending narcotic entries
  const { data: pendingNarcotics, refetch: refetchNarcotics } = useQuery({
    queryKey: ["narcotics-register-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("narcotics_register")
        .select("*")
        .eq("print_status", "pending")
        .order("serial_no", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (saleId: string) => {
      const { data: saleItems, error: itemsError } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", saleId);
      if (itemsError) throw itemsError;

      for (const item of saleItems || []) {
        if (item.item_type === 'medicine') {
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

      const { error: deleteItemsError } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", saleId);
      if (deleteItemsError) throw deleteItemsError;

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

  const markPrintedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("narcotics_register")
        .update({ print_status: "printed" })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["narcotics-register-pending"] });
      toast.success("Narcotics register entries marked as printed");
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

  const handlePrintNarcotics = useReactToPrint({
    contentRef: narcoticsRef,
    onAfterPrint: () => {
      if (pendingNarcotics && pendingNarcotics.length > 0) {
        const ids = pendingNarcotics.map(e => e.id);
        markPrintedMutation.mutate(ids);
      }
      setNarcoticsDialogOpen(false);
    },
  });

  const pendingCount = pendingNarcotics?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Sales & Billing</h2>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                refetchNarcotics();
                setNarcoticsDialogOpen(true);
              }}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Print Narcotics Register
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {pendingCount}
              </Badge>
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Sale
          </Button>
        </div>
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

      {/* Delete Sale Dialog */}
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

      {/* Narcotics Register Print Dialog */}
      <Dialog open={narcoticsDialogOpen} onOpenChange={setNarcoticsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Narcotics Register - Pending Entries</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {pendingCount} pending {pendingCount === 1 ? "entry" : "entries"} to print
              </p>
              <div className="flex items-center gap-2">
                <Label htmlFor="instant-print" className="text-sm">Instant Print</Label>
                <Switch
                  id="instant-print"
                  checked={instantPrint}
                  onCheckedChange={setInstantPrint}
                />
                <Label htmlFor="batch-print" className="text-sm">Batch Print</Label>
              </div>
            </div>

            {pendingNarcotics && pendingNarcotics.length > 0 && (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>S.No</TableHead>
                        <TableHead>Drug Name</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingNarcotics.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.serial_no}</TableCell>
                          <TableCell className="font-medium">{entry.drug_name}</TableCell>
                          <TableCell>{entry.patient_name}</TableCell>
                          <TableCell>{entry.quantity_sold}</TableCell>
                          <TableCell>{format(new Date(entry.sale_date), "dd/MM/yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setNarcoticsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => handlePrintNarcotics()} className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print Register ({pendingCount} entries)
                  </Button>
                </div>
              </>
            )}

            {(!pendingNarcotics || pendingNarcotics.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No pending narcotic entries to print.
              </p>
            )}
          </div>

          {/* Hidden print content */}
          <div className="hidden">
            <NarcoticsRegisterPrint
              ref={narcoticsRef}
              entries={pendingNarcotics || []}
              instantPrint={instantPrint}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;
