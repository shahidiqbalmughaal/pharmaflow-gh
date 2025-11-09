import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  Pill, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";

const Dashboard = () => {
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
    </div>
  );
};

export default Dashboard;
