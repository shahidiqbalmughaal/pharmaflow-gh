import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  DollarSign, 
  Pill, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  ShoppingCart,
  History
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { SaleDialog } from "@/components/SaleDialog";

const Dashboard = () => {
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  
  // Sales history filters
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  const [startDate, setStartDate] = useState(format(sevenDaysAgo, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const [selectedSalesman, setSelectedSalesman] = useState<string>("all");

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
  const { data: salesHistory, isLoading: isLoadingSalesHistory } = useQuery({
    queryKey: ["salesHistory", startDate, endDate, selectedSalesman],
    queryFn: async () => {
      let query = supabase
        .from("sales")
        .select("*")
        .gte("sale_date", new Date(startDate).toISOString())
        .lte("sale_date", new Date(endDate + "T23:59:59").toISOString())
        .order("sale_date", { ascending: false })
        .limit(50);

      if (selectedSalesman !== "all") {
        query = query.eq("salesman_id", selectedSalesman);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button 
          onClick={() => setIsSaleDialogOpen(true)}
          size="lg"
          className="gap-2"
        >
          <ShoppingCart className="h-5 w-5" />
          Process Sale
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(todaySales?.totalSales || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {todaySales?.count || 0} transactions
            </p>
          </CardContent>
        </Card>

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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockMedicines && lowStockMedicines.length > 0 ? (
                lowStockMedicines.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-accent rounded">
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
              <Clock className="h-5 w-5 text-destructive" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiryAlerts && expiryAlerts.length > 0 ? (
                expiryAlerts.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-accent rounded">
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
            <History className="h-5 w-5" />
            Sales History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salesman-filter">Salesman</Label>
              <Select value={selectedSalesman} onValueChange={setSelectedSalesman}>
                <SelectTrigger id="salesman-filter">
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
          </div>

          {/* Sales Table */}
          <div className="border rounded-lg">
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
                {isLoadingSalesHistory ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading sales history...
                    </TableCell>
                  </TableRow>
                ) : salesHistory && salesHistory.length > 0 ? (
                  salesHistory.map((sale) => (
                    <TableRow key={sale.id}>
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sales found for the selected filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {salesHistory && salesHistory.length > 0 && (
            <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
              <span>Showing {salesHistory.length} transaction(s)</span>
              <div className="flex gap-4">
                <span>
                  Total Sales:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(
                      salesHistory.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
                    )}
                  </span>
                </span>
                <span>
                  Total Profit:{" "}
                  <span className="font-semibold text-success">
                    {formatCurrency(
                      salesHistory.reduce((sum, sale) => sum + Number(sale.total_profit), 0)
                    )}
                  </span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SaleDialog 
        open={isSaleDialogOpen} 
        onClose={() => setIsSaleDialogOpen(false)} 
      />
    </div>
  );
};

export default Dashboard;
