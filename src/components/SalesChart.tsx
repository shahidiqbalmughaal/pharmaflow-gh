import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/currency";
import { format, subDays } from "date-fns";
import { TrendingUp } from "lucide-react";

interface Sale {
  sale_date: string;
  total_amount: number;
}

interface SalesChartProps {
  sales: Sale[];
  days?: number;
}

export function SalesChart({ sales, days = 7 }: SalesChartProps) {
  const chartData = useMemo(() => {
    const today = new Date();
    const dataMap = new Map<string, { sales: number; count: number }>();

    // Initialize all days with zero values
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dateKey = format(date, "MMM dd");
      dataMap.set(dateKey, { sales: 0, count: 0 });
    }

    // Aggregate sales data
    sales.forEach((sale) => {
      const dateKey = format(new Date(sale.sale_date), "MMM dd");
      const existing = dataMap.get(dateKey);
      if (existing) {
        existing.sales += Number(sale.total_amount);
        existing.count += 1;
        dataMap.set(dateKey, existing);
      }
    });

    return Array.from(dataMap.entries()).map(([date, data]) => ({
      date,
      sales: data.sales,
      count: data.count,
    }));
  }, [sales, days]);

  const totalSales = useMemo(
    () => chartData.reduce((sum, item) => sum + item.sales, 0),
    [chartData]
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{payload[0].payload.date}</p>
          <p className="text-sm text-primary">
            Sales: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm text-muted-foreground">
            Transactions: {payload[0].payload.count}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Sales Overview (Last {days} Days)
        </CardTitle>
        <div className="flex gap-6 text-sm mt-2">
          <div>
            <span className="text-muted-foreground">Total Sales: </span>
            <span className="font-semibold text-primary">{formatCurrency(totalSales)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs" 
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) => `PKR ${value / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="sales" fill="hsl(var(--primary))" name="Sales" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
