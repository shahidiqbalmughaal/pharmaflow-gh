import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";

interface DashboardDetailModalProps {
  open: boolean;
  onClose: () => void;
  type: "sales" | "cash" | "expenses" | "netProfit" | "medicines" | "cosmetics" | "lowStock" | "expiry" | "allLowStock" | "allExpiry" | null;
}

export function DashboardDetailModal({ open, onClose, type }: DashboardDetailModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch today's sales
  const { data: todaySales, isLoading: salesLoading } = useQuery({
    queryKey: ["todaySalesDetail"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          sale_items (
            item_name,
            quantity,
            unit_price,
            total_price,
            profit,
            batch_no
          )
        `)
        .gte("sale_date", today.toISOString())
        .order("sale_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: open && (type === "sales" || type === "cash"),
  });

  // Fetch medicines sold today
  const { data: medicinesSold, isLoading: medicinesLoading } = useQuery({
    queryKey: ["medicinesSoldDetail"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          *,
          sales!inner(sale_date)
        `)
        .eq("item_type", "medicine")
        .gte("sales.sale_date", today.toISOString());
      
      if (error) throw error;
      return data;
    },
    enabled: open && type === "medicines",
  });

  // Fetch cosmetics sold today
  const { data: cosmeticsSold, isLoading: cosmeticsLoading } = useQuery({
    queryKey: ["cosmeticsSoldDetail"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          *,
          sales!inner(sale_date)
        `)
        .eq("item_type", "cosmetic")
        .gte("sales.sale_date", today.toISOString());
      
      if (error) throw error;
      return data;
    },
    enabled: open && type === "cosmetics",
  });

  // Fetch low stock items
  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery({
    queryKey: ["lowStockDetail"],
    queryFn: async () => {
      const [medicines, cosmetics] = await Promise.all([
        supabase.from("medicines").select("*").lt("quantity", 10),
        supabase.from("cosmetics").select("*").lt("quantity", 10),
      ]);
      
      const items = [
        ...(medicines.data || []).map(m => ({ ...m, type: "medicine", name: m.medicine_name })),
        ...(cosmetics.data || []).map(c => ({ ...c, type: "cosmetic", name: c.product_name })),
      ];
      
      return items;
    },
    enabled: open && (type === "lowStock" || type === "allLowStock"),
  });

  // Fetch expiry alerts
  const { data: expiryAlerts, isLoading: expiryLoading } = useQuery({
    queryKey: ["expiryAlertsDetail"],
    queryFn: async () => {
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setDate(sixMonthsFromNow.getDate() + 180);
      
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .lte("expiry_date", sixMonthsFromNow.toISOString())
        .order("expiry_date", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: open && (type === "expiry" || type === "allExpiry"),
  });

  const getTitle = () => {
    switch (type) {
      case "sales": return "Today's Sales Transactions";
      case "cash": return "Today's Cash Collection";
      case "expenses": return "Today's Expenses";
      case "netProfit": return "Today's Net Profit Calculation";
      case "medicines": return "Medicines Sold Today";
      case "cosmetics": return "Cosmetics Sold Today";
      case "lowStock": return "Low Stock Alert";
      case "expiry": return "Expiry Alerts (Next 6 Months)";
      case "allLowStock": return "All Low Stock Items";
      case "allExpiry": return "All Expiring Items (Next 6 Months)";
      default: return "";
    }
  };

  const filterData = (data: any[]) => {
    if (!searchQuery) return data;
    return data.filter(item => 
      JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const isLoading = salesLoading || medicinesLoading || cosmeticsLoading || lowStockLoading || expiryLoading;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <LoadingSpinner />
          ) : type === "sales" && todaySales ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Salesman</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterData(todaySales).map((sale: any) => (
                  <TableRow key={sale.id}>
                    <TableCell>{format(new Date(sale.sale_date), "HH:mm")}</TableCell>
                    <TableCell>{sale.salesman_name}</TableCell>
                    <TableCell>{sale.sale_items?.length || 0}</TableCell>
                    <TableCell>
                      {sale.sale_items?.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                    </TableCell>
                    <TableCell className="font-bold">{formatCurrency(Number(sale.total_amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : type === "cash" && todaySales ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Salesman</TableHead>
                  <TableHead>Cash Collected</TableHead>
                  <TableHead>Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterData(todaySales).map((sale: any) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {format(new Date(sale.sale_date), "HH:mm")}
                    </TableCell>
                    <TableCell>{sale.salesman_name}</TableCell>
                    <TableCell className="font-semibold text-success">
                      {formatCurrency(Number(sale.total_amount))}
                    </TableCell>
                    <TableCell>
                      {sale.sale_items?.length || 0} items
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : type === "medicines" && medicinesSold ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch No</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Total Tablets</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterData(medicinesSold).map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell>{item.batch_no}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.total_tablets || item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : type === "cosmetics" && cosmeticsSold ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cosmetic</TableHead>
                  <TableHead>Batch No</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterData(cosmeticsSold).map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell>{item.batch_no}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (type === "lowStock" || type === "allLowStock") && lowStockItems ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Rack</TableHead>
                  <TableHead>Supplier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterData(lowStockItems).map((item: any) => (
                  <TableRow key={item.id} className={item.quantity < 5 ? "bg-destructive/10" : ""}>
                    <TableCell>
                      <Badge variant={item.type === "medicine" ? "default" : "secondary"}>
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className={item.quantity < 5 ? "text-destructive font-bold" : "text-warning font-bold"}>
                      {item.quantity}
                    </TableCell>
                    <TableCell>{item.rack_no}</TableCell>
                    <TableCell>{item.supplier}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (type === "expiry" || type === "allExpiry") && expiryAlerts ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch No</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterData(expiryAlerts).map((item: any) => {
                  const daysUntilExpiry = Math.floor(
                    (new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const isUrgent = daysUntilExpiry < 30;
                  
                  return (
                    <TableRow key={item.id} className={isUrgent ? "bg-orange-50" : ""}>
                      <TableCell>{item.medicine_name}</TableCell>
                      <TableCell>{item.batch_no}</TableCell>
                      <TableCell className={isUrgent ? "text-orange-600 font-bold" : ""}>
                        {format(new Date(item.expiry_date), "MMM dd, yyyy")}
                        <span className="text-xs block text-muted-foreground">
                          ({daysUntilExpiry} days)
                        </span>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
