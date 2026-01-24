import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, AlertTriangle, Clock, DollarSign } from "lucide-react";
import { format, isToday, isTomorrow, addDays, isBefore } from "date-fns";

export function AlertStatusCard() {
  // Fetch upcoming expense alerts (due within 7 days) - all staff can now view
  const { data: expenseAlerts, isError } = useQuery({
    queryKey: ["expenseAlerts"],
    queryFn: async () => {
      const today = new Date();
      const sevenDaysFromNow = addDays(today, 7);
      
      const { data, error } = await supabase
        .from("expense_alerts")
        .select("*")
        .eq("is_paid", false)
        .lte("due_date", sevenDaysFromNow.toISOString().split('T')[0])
        .order("due_date", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const overdueExpenses = expenseAlerts?.filter(e => isBefore(new Date(e.due_date), new Date()) && !isToday(new Date(e.due_date))) || [];
  const dueTodayExpenses = expenseAlerts?.filter(e => isToday(new Date(e.due_date))) || [];
  const upcomingExpenses = expenseAlerts?.filter(e => !isBefore(new Date(e.due_date), new Date()) && !isToday(new Date(e.due_date))) || [];
  
  const totalAlerts = expenseAlerts?.length || 0;

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Expense Alerts
          </CardTitle>
          {totalAlerts > 0 && (
            <Badge variant="destructive">{totalAlerts} items</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-destructive">
              {overdueExpenses.length}
            </p>
          </div>
          
          <div className="p-4 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Due Today</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {dueTodayExpenses.length}
            </p>
          </div>
        </div>

        {totalAlerts > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...overdueExpenses, ...dueTodayExpenses, ...upcomingExpenses].slice(0, 5).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between text-sm p-2 bg-accent/50 rounded">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{formatCategory(expense.category)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {expense.amount && (
                    <span className="text-muted-foreground">Rs. {expense.amount.toLocaleString()}</span>
                  )}
                  <Badge 
                    variant={isBefore(new Date(expense.due_date), new Date()) && !isToday(new Date(expense.due_date)) ? "destructive" : isToday(new Date(expense.due_date)) ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {format(new Date(expense.due_date), "MMM dd")}
                  </Badge>
                </div>
              </div>
            ))}
            {totalAlerts > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Click to view all {totalAlerts} alerts
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            ✓ No pending expense alerts
          </p>
        )}
      </CardContent>
    </Card>
  );
}