import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCurrency } from "@/lib/currency";
import { Receipt } from "lucide-react";
import { expenseCategories } from "@/lib/expenseValidations";

interface Expense {
  amount: number;
  category: string;
}

interface ExpenseBreakdownChartProps {
  expenses: Expense[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(210, 70%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(45, 90%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(330, 70%, 55%)",
  "hsl(180, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(120, 50%, 40%)",
  "hsl(200, 70%, 45%)",
  "hsl(0, 60%, 50%)",
  "hsl(260, 50%, 55%)",
];

export function ExpenseBreakdownChart({ expenses }: ExpenseBreakdownChartProps) {
  const chartData = useMemo(() => {
    const categoryTotals = new Map<string, number>();

    expenses.forEach((expense) => {
      const current = categoryTotals.get(expense.category) || 0;
      categoryTotals.set(expense.category, current + Number(expense.amount));
    });

    return Array.from(categoryTotals.entries())
      .map(([category, total]) => ({
        name: expenseCategories[category as keyof typeof expenseCategories] || category,
        value: total,
        category,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const totalExpenses = useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData]
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = ((payload[0].value / totalExpenses) * 100).toFixed(1);
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-1">{payload[0].payload.name}</p>
          <p className="text-sm text-primary">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-xs text-muted-foreground">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Expense Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No expenses recorded today
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Expense Breakdown (Today)
        </CardTitle>
        <div className="text-sm mt-1">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-semibold text-destructive">{formatCurrency(totalExpenses)}</span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => 
                percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
              }
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              layout="vertical" 
              align="right" 
              verticalAlign="middle"
              formatter={(value) => (
                <span className="text-xs text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}