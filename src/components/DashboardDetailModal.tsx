import { useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";

interface DashboardDetailModalProps {
  open: boolean;
  onClose: () => void;
  type: "sales" | "cash" | "expenses" | "netProfit" | "medicines" | "cosmetics" | "lowStock" | "expiry" | "allLowStock" | "allExpiry" | null;
}

export function DashboardDetailModal({ open, onClose, type }: DashboardDetailModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Expiry filter states
  const [expiryMonthFilter, setExpiryMonthFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<string>("all");

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

  // Get unique companies and suppliers from expiry data for filter dropdowns
  const { uniqueCompanies, uniqueSuppliers, uniqueMonths } = useMemo(() => {
    if (!expiryAlerts) return { uniqueCompanies: [], uniqueSuppliers: [], uniqueMonths: [] };
    
    const companies = [...new Set(expiryAlerts.map((item: any) => item.company_name).filter(Boolean))].sort();
    const suppliers = [...new Set(expiryAlerts.map((item: any) => item.supplier).filter(Boolean))].sort();
    
    // Get unique months (format: "YYYY-MM" for sorting, display as "Month YYYY")
    const monthsSet = new Set<string>();
    expiryAlerts.forEach((item: any) => {
      const date = new Date(item.expiry_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthKey);
    });
    const months = [...monthsSet].sort();
    
    return { uniqueCompanies: companies, uniqueSuppliers: suppliers, uniqueMonths: months };
  }, [expiryAlerts]);

  // Format month key for display
  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, "MMM yyyy");
  };

  // Filter expiry data with all filters
  const filterExpiryData = (data: any[]) => {
    let filtered = data;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply month filter
    if (expiryMonthFilter !== "all") {
      filtered = filtered.filter(item => {
        const date = new Date(item.expiry_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === expiryMonthFilter;
      });
    }
    
    // Apply company filter
    if (companyFilter !== "all") {
      filtered = filtered.filter(item => item.company_name === companyFilter);
    }
    
    // Apply supplier filter
    if (supplierFilter !== "all") {
      filtered = filtered.filter(item => item.supplier === supplierFilter);
    }
    
    // Apply expiry status filter
    if (expiryStatusFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter(item => {
        const expiryDate = new Date(item.expiry_date);
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (expiryStatusFilter) {
          case "expired":
            return daysUntilExpiry < 0;
          case "this_month":
            return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
          case "next_3_months":
            return daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
          case "next_6_months":
            return daysUntilExpiry >= 0 && daysUntilExpiry <= 180;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  };

  // Check if any filter is active
  const hasActiveFilters = expiryMonthFilter !== "all" || companyFilter !== "all" || 
    supplierFilter !== "all" || expiryStatusFilter !== "all";

  // Clear all filters
  const clearFilters = () => {
    setExpiryMonthFilter("all");
    setCompanyFilter("all");
    setSupplierFilter("all");
    setExpiryStatusFilter("all");
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

          {/* Expiry Filters - Only shown for expiry modals */}
          {(type === "expiry" || type === "allExpiry") && expiryAlerts && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Expiry Month Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Expiry Month</label>
                  <Select value={expiryMonthFilter} onValueChange={setExpiryMonthFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {uniqueMonths.map((monthKey) => (
                        <SelectItem key={monthKey} value={monthKey}>
                          {formatMonthLabel(monthKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Company Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Company</label>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {uniqueCompanies.map((company) => (
                        <SelectItem key={company} value={company}>
                          {company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Supplier Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Supplier</label>
                  <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {uniqueSuppliers.map((supplier) => (
                        <SelectItem key={supplier} value={supplier}>
                          {supplier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expiry Status Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Expiry Status</label>
                  <Select value={expiryStatusFilter} onValueChange={setExpiryStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="this_month">This Month (30 days)</SelectItem>
                      <SelectItem value="next_3_months">Next 3 Months</SelectItem>
                      <SelectItem value="next_6_months">Next 6 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 px-3 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear Filters
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Showing {filterExpiryData(expiryAlerts).length} of {expiryAlerts.length} items
                  </span>
                </div>
              )}
            </div>
          )}

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
                {filterExpiryData(expiryAlerts).map((item: any) => {
                  const daysUntilExpiry = Math.floor(
                    (new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  
                  // Color coding: red for expired, orange for within 30 days, yellow for within 60 days
                  const isExpired = daysUntilExpiry < 0;
                  const isUrgent = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
                  const isWarning = daysUntilExpiry > 30 && daysUntilExpiry <= 60;
                  
                  const rowClass = isExpired 
                    ? "bg-red-100 dark:bg-red-950/30" 
                    : isUrgent 
                    ? "bg-orange-100 dark:bg-orange-950/30" 
                    : isWarning 
                    ? "bg-yellow-100 dark:bg-yellow-950/30" 
                    : "";
                  
                  const textClass = isExpired 
                    ? "text-red-600 dark:text-red-400 font-bold" 
                    : isUrgent 
                    ? "text-orange-600 dark:text-orange-400 font-bold" 
                    : isWarning 
                    ? "text-yellow-600 dark:text-yellow-400 font-semibold" 
                    : "";
                  
                  const statusLabel = isExpired 
                    ? "Expired" 
                    : `${daysUntilExpiry} days`;
                  
                  return (
                    <TableRow key={item.id} className={rowClass}>
                      <TableCell>{item.medicine_name}</TableCell>
                      <TableCell>{item.batch_no}</TableCell>
                      <TableCell className={textClass}>
                        {format(new Date(item.expiry_date), "MMM dd, yyyy")}
                        <span className={`text-xs block ${isExpired ? 'text-red-500' : 'text-muted-foreground'}`}>
                          ({statusLabel})
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
