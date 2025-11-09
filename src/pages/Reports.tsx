import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, DollarSign, ShoppingCart } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { MedicineSalesReport } from "@/components/MedicineSalesReport";
import { ApiIntegrationSection } from "@/components/ApiIntegrationSection";
import { exportToCSV } from "@/lib/exportUtils";
import { useState, useMemo } from "react";

const Reports = () => {
  const [selectedMonthsBack, setSelectedMonthsBack] = useState(6);

  // Monthly profit report
  const { data: monthlySales } = useQuery({
    queryKey: ["reportMonthlySales", selectedMonthsBack],
    queryFn: async () => {
      const endDate = endOfMonth(new Date());
      const startDate = startOfMonth(subMonths(new Date(), selectedMonthsBack - 1));
      
      const { data, error } = await supabase
        .from("sales")
        .select("sale_date, total_amount, total_profit")
        .gte("sale_date", startDate.toISOString())
        .lte("sale_date", endDate.toISOString())
        .order("sale_date", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Group sales by month
  const monthlyData = useMemo(() => {
    if (!monthlySales) return [];
    
    const grouped = new Map<string, { sales: number; profit: number; count: number }>();
    
    monthlySales.forEach((sale) => {
      const monthKey = format(new Date(sale.sale_date), "yyyy-MM");
      const existing = grouped.get(monthKey) || { sales: 0, profit: 0, count: 0 };
      
      grouped.set(monthKey, {
        sales: existing.sales + Number(sale.total_amount),
        profit: existing.profit + Number(sale.total_profit),
        count: existing.count + 1,
      });
    });
    
    return Array.from(grouped.entries())
      .map(([month, data]) => ({
        month,
        monthLabel: format(new Date(month + "-01"), "MMMM yyyy"),
        ...data,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [monthlySales]);

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

  const handleExportMonthlyProfit = () => {
    if (!monthlyData || monthlyData.length === 0) return;

    const exportData = monthlyData.map(month => ({
      "Month": month.monthLabel,
      "Total Sales": formatCurrency(month.sales),
      "Total Profit": formatCurrency(month.profit),
      "Profit Margin": `${((month.profit / month.sales) * 100).toFixed(2)}%`,
      "Transactions": month.count,
    }));

    exportToCSV(exportData, `monthly-profit-report-${format(new Date(), "yyyy-MM-dd")}`);
  };

  const handleExportDailySales = () => {
    if (!todaySales || todaySales.length === 0) return;

    const exportData = todaySales.flatMap(sale =>
      (sale.sale_items || []).map((item: any) => ({
        "Sale Date": format(new Date(sale.sale_date), "MMM dd, yyyy HH:mm"),
        "Salesman": sale.salesman_name,
        "Item Name": item.item_name,
        "Item Type": item.item_type,
        "Batch No": item.batch_no,
        "Quantity": item.total_tablets || item.quantity,
        "Unit Price": formatCurrency(Number(item.unit_price)),
        "Total Price": formatCurrency(Number(item.total_price)),
        "Profit": formatCurrency(Number(item.profit)),
      }))
    );

    exportToCSV(exportData, `daily-sales-report-${format(new Date(), "yyyy-MM-dd")}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Reports</h2>
      </div>

      {/* Monthly Profit Report - From Sales Only */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Monthly Profit Report
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Profit calculated from actual sales only, not inventory
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportMonthlyProfit}
              disabled={!monthlyData || monthlyData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {monthlyData && monthlyData.length > 0 && (
              <>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <p className="text-sm text-muted-foreground">Total Profit ({selectedMonthsBack} months)</p>
                  </div>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(monthlyData.reduce((sum, m) => sum + m.profit, 0))}
                  </p>
                </div>
                <div className="p-4 bg-accent rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Total Sales ({selectedMonthsBack} months)</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(monthlyData.reduce((sum, m) => sum + m.sales, 0))}
                  </p>
                </div>
                <div className="p-4 bg-accent rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {monthlyData.reduce((sum, m) => sum + m.count, 0)}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Breakdown by Month</h3>
            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Month</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Sales</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Profit</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Margin</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData && monthlyData.length > 0 ? (
                      monthlyData.map((month) => (
                        <tr key={month.month} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{month.monthLabel}</td>
                          <td className="px-4 py-3 text-right text-primary font-semibold">
                            {formatCurrency(month.sales)}
                          </td>
                          <td className="px-4 py-3 text-right text-success font-semibold">
                            {formatCurrency(month.profit)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {((month.profit / month.sales) * 100).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right">{month.count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No sales data available for the selected period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medicine Sales Report - Main Feature */}
      <MedicineSalesReport />

      {/* API Integration Section */}
      <ApiIntegrationSection />

      {/* Daily Sales Summary */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Daily Sales Summary</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportDailySales}
              disabled={!todaySales || todaySales.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <h3 className="font-semibold">Recent Transactions</h3>
            {todaySales && todaySales.length > 0 ? (
              <div className="space-y-2">
                {todaySales.slice(0, 5).map((sale) => (
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
                {todaySales.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    + {todaySales.length - 5} more transactions
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No sales today</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
