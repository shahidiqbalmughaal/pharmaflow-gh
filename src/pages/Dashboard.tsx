import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  DollarSign, 
  Pill, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  ShoppingCart,
  History,
  FileText,
  Search
} from "lucide-react";
import { format, subDays } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { SaleDialog } from "@/components/SaleDialog";
import { SalesChart } from "@/components/SalesChart";
import { Pagination } from "@/components/Pagination";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";

const Dashboard = () => {
  const { userRole } = useAuth();
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  
  // Sales history filters
  const today = new Date();
  const sevenDaysAgo = subDays(today, 7);
  
  const [startDate, setStartDate] = useState(format(sevenDaysAgo, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const [selectedSalesman, setSelectedSalesman] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch salesmen for filter
  const { data: salesmen } = useQuery({
    queryKey: ["salesmen"],
    queryFn: async () => {
      const { data, error } = await supabase.from("salesmen").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch sales history with filters
  const { data: salesHistory, isLoading: isLoadingSalesHistory, error: salesHistoryError } = useQuery({
    queryKey: ["salesHistory", startDate, endDate, selectedSalesman],
    queryFn: async () => {
      let query = supabase
        .from("sales")
        .select("*", { count: "exact" })
        .gte("sale_date", new Date(startDate).toISOString())
        .lte("sale_date", new Date(endDate + "T23:59:59").toISOString())
        .order("sale_date", { ascending: false });

      if (selectedSalesman !== "all") {
        query = query.eq("salesman_id", selectedSalesman);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch chart data (last 7 days for visualization)
  const { data: chartSales } = useQuery({
    queryKey: ["chartSales"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7);
      const { data, error } = await supabase
        .from("sales")
        .select("sale_date, total_amount, total_profit")
        .gte("sale_date", sevenDaysAgo.toISOString())
        .order("sale_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Filter and paginate sales
  const filteredSales = useMemo(() => {
    if (!salesHistory) return [];
    if (!searchQuery) return salesHistory;
    
    const query = searchQuery.toLowerCase();
    return salesHistory.filter(
      (sale) =>
        sale.salesman_name.toLowerCase().includes(query) ||
        sale.id.toLowerCase().includes(query)
    );
  }, [salesHistory, searchQuery]);

  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredSales.slice(startIndex, endIndex);
  }, [filteredSales, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredSales.length / pageSize);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Fetch today's sales
  const { data: todaySales } = useQuery({
    queryKey: ["todaySales"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("sales")
        .select("total_amount, total_profit")
        .gte("sale_date", today.toISOString());
      
      if (error) throw error;
      
      const totalSales = data.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
      const totalProfit = data.reduce((sum, sale) => sum + Number(sale.total_profit), 0);
      
      return { totalSales, totalProfit, count: data.length };
    },
  });

  // Fetch medicines sold today
  const { data: medicinesSold } = useQuery({
    queryKey: ["medicinesSoldToday"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: sales } = await supabase
        .from("sales")
        .select("id")
        .gte("sale_date", today.toISOString());
      
      if (!sales) return 0;
      
      const saleIds = sales.map(s => s.id);
      const { data, error } = await supabase
        .from("sale_items")
        .select("quantity")
        .in("sale_id", saleIds)
        .eq("item_type", "medicine");
      
      if (error) throw error;
      
      return data.reduce((sum, item) => sum + item.quantity, 0);
    },
  });

  // Fetch cosmetics sold today
  const { data: cosmeticsSold } = useQuery({
    queryKey: ["cosmeticsSoldToday"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: sales } = await supabase
        .from("sales")
        .select("id")
        .gte("sale_date", today.toISOString());
      
      if (!sales) return 0;
      
      const saleIds = sales.map(s => s.id);
      const { data, error } = await supabase
        .from("sale_items")
        .select("quantity")
        .in("sale_id", saleIds)
        .eq("item_type", "cosmetic");
      
      if (error) throw error;
      
      return data.reduce((sum, item) => sum + item.quantity, 0);
    },
  });

  // Fetch low stock alerts
  const { data: lowStockMedicines } = useQuery({
    queryKey: ["lowStockMedicines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .lt("quantity", 10)
        .order("quantity", { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch expiry alerts
  const { data: expiryAlerts } = useQuery({
    queryKey: ["expiryAlerts"],
    queryFn: async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .lte("expiry_date", thirtyDaysFromNow.toISOString())
        .order("expiry_date", { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  // Role-based view control
  const canProcessSales = userRole === "admin" || userRole === "manager" || userRole === "salesman";
  const canViewFullDashboard = userRole === "admin" || userRole === "manager";

  return (
    <TooltipProvider>
      <div className="space-y-6" role="main" aria-label="Dashboard">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome to Al-Rehman Pharmacy & Cosmetics
            </p>
          </div>
          {canProcessSales && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setIsSaleDialogOpen(true)}
                  size="lg"
                  className="gap-2 w-full sm:w-auto"
                  aria-label="Process a new sale"
                >
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  Process Sale
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create a new sales transaction</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="cursor-help transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary" aria-label={`Today's sales: ${formatCurrency(todaySales?.totalSales || 0)}`}>
                  {formatCurrency(todaySales?.totalSales || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {todaySales?.count || 0} transactions
                </p>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total sales revenue for today</p>
          </TooltipContent>
        </Tooltip>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(todaySales?.totalProfit || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Net profit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medicines Sold</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {medicinesSold || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cosmetics Sold</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cosmeticsSold || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {lowStockMedicines?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Items below 10 units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiry Alert</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {expiryAlerts?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Expiring within 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart */}
      {chartSales && chartSales.length > 0 && (
        <SalesChart sales={chartSales} days={7} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2" role="list" aria-label="Low stock items">
              {lowStockMedicines && lowStockMedicines.length > 0 ? (
                lowStockMedicines.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-accent rounded" role="listitem">
                    <div>
                      <p className="font-medium text-sm">{item.medicine_name}</p>
                      <p className="text-xs text-muted-foreground">Batch: {item.batch_no}</p>
                    </div>
                    <span className="text-warning font-bold">{item.quantity} units</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No low stock items</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-destructive" aria-hidden="true" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2" role="list" aria-label="Items expiring soon">
              {expiryAlerts && expiryAlerts.length > 0 ? (
                expiryAlerts.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-accent rounded" role="listitem">
                    <div>
                      <p className="font-medium text-sm">{item.medicine_name}</p>
                      <p className="text-xs text-muted-foreground">Batch: {item.batch_no}</p>
                    </div>
                    <span className="text-destructive font-bold text-sm">
                      {format(new Date(item.expiry_date), "MMM dd, yyyy")}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No expiry alerts</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" aria-hidden="true" />
            Sales History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  handleFilterChange();
                }}
                aria-label="Select start date for sales history"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  handleFilterChange();
                }}
                aria-label="Select end date for sales history"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salesman-filter">Salesman</Label>
              <Select value={selectedSalesman} onValueChange={(value) => {
                setSelectedSalesman(value);
                handleFilterChange();
              }}>
                <SelectTrigger id="salesman-filter" aria-label="Filter by salesman">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Salesmen</SelectItem>
                  {salesmen?.map((salesman) => (
                    <SelectItem key={salesman.id} value={salesman.id}>
                      {salesman.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-sales">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="search-sales"
                  placeholder="Search by salesman or ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleFilterChange();
                  }}
                  className="pl-8"
                  aria-label="Search sales by salesman name or transaction ID"
                />
              </div>
            </div>
          </div>

          {/* Sales Table */}
          {salesHistoryError ? (
            <div className="border rounded-lg p-8">
              <EmptyState
                icon={AlertTriangle}
                title="Error Loading Sales"
                description="There was an error loading the sales history. Please try again."
                action={{
                  label: "Retry",
                  onClick: () => window.location.reload(),
                }}
              />
            </div>
          ) : isLoadingSalesHistory ? (
            <div className="border rounded-lg p-8">
              <LoadingSpinner size="lg" text="Loading sales history..." />
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="border rounded-lg p-8">
              <EmptyState
                icon={FileText}
                title="No Sales Found"
                description={searchQuery ? "No sales match your search criteria. Try adjusting your filters." : "No sales found for the selected date range."}
              />
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Salesman</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSales.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">
                          {format(new Date(sale.sale_date), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>{sale.salesman_name}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(sale.subtotal))}
                        </TableCell>
                        <TableCell className="text-right text-warning">
                          -{formatCurrency(Number(sale.discount))}
                        </TableCell>
                        <TableCell className="text-right">
                          +{formatCurrency(Number(sale.tax))}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(Number(sale.total_amount))}
                        </TableCell>
                        <TableCell className="text-right text-success font-semibold">
                          {formatCurrency(Number(sale.total_profit))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredSales.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />

              {/* Summary */}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Transactions: </span>
                    <span className="font-semibold text-foreground">{filteredSales.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Sales: </span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(filteredSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0))}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Profit: </span>
                    <span className="font-semibold text-success">
                      {formatCurrency(filteredSales.reduce((sum, sale) => sum + Number(sale.total_profit), 0))}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SaleDialog 
        open={isSaleDialogOpen} 
        onClose={() => setIsSaleDialogOpen(false)} 
      />
    </div>
  </TooltipProvider>
  );
};

export default Dashboard;
