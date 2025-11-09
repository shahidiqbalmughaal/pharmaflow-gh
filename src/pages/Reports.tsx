import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";

const Reports = () => {
  // Today's sales report
  const { data: todaySales } = useQuery({
    queryKey: ["reportTodaySales"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          sale_items(*)
        `)
        .gte("sale_date", today.toISOString());
      
      if (error) throw error;
      return data;
    },
  });

  const totalSales = todaySales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
  const totalProfit = todaySales?.reduce((sum, sale) => sum + Number(sale.total_profit), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Reports</h2>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Daily Sales Report</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-accent rounded-lg">
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalSales)}</p>
            </div>
            <div className="p-4 bg-accent rounded-lg">
              <p className="text-sm text-muted-foreground">Total Profit</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalProfit)}</p>
            </div>
            <div className="p-4 bg-accent rounded-lg">
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold">{todaySales?.length || 0}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Transaction Details</h3>
            {todaySales && todaySales.length > 0 ? (
              <div className="space-y-2">
                {todaySales.map((sale) => (
                  <div key={sale.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{sale.salesman_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(sale.sale_date), "MMM dd, yyyy HH:mm")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.sale_items?.length || 0} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatCurrency(Number(sale.total_amount))}</p>
                        <p className="text-sm text-success">Profit: {formatCurrency(Number(sale.total_profit))}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No sales today</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Low Stock Report</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Items with quantity below 10 units require reordering
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
