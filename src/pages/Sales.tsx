import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SaleDialog } from "@/components/SaleDialog";
import { format } from "date-fns";

const Sales = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

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
              <TableHead>Discount</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
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
                  <TableCell>{formatCurrency(Number(sale.discount))}</TableCell>
                  <TableCell>{formatCurrency(Number(sale.tax))}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(Number(sale.total_amount))}</TableCell>
                  <TableCell className="text-success font-bold">
                    {formatCurrency(Number(sale.total_profit))}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No sales found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SaleDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
};

export default Sales;
