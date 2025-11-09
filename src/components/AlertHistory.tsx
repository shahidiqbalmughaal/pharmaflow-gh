import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Mail, MessageCircle, AlertTriangle, Package } from "lucide-react";

export function AlertHistory() {
  const { data: alertHistory, isLoading } = useQuery({
    queryKey: ["alertHistory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_history")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : alertHistory && alertHistory.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Alert Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Sent To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertHistory.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="text-sm">
                      {format(new Date(alert.sent_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={alert.alert_type === 'low_stock' ? 'destructive' : 'secondary'}>
                        {alert.alert_type === 'low_stock' ? (
                          <>
                            <Package className="h-3 w-3 mr-1" />
                            Low Stock
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Near Expiry
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{alert.item_name}</TableCell>
                    <TableCell className="text-sm">{alert.batch_no}</TableCell>
                    <TableCell className="text-sm">
                      {alert.alert_type === 'low_stock' ? (
                        <span className="text-destructive">Qty: {alert.current_quantity}</span>
                      ) : (
                        <span className="text-amber-600">
                          Exp: {alert.expiry_date && format(new Date(alert.expiry_date), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {alert.notification_method === 'email' ? (
                          <>
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </>
                        ) : (
                          <>
                            <MessageCircle className="h-3 w-3 mr-1" />
                            WhatsApp
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[200px]">
                      {alert.sent_to}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground">No alerts sent yet</p>
        )}
      </CardContent>
    </Card>
  );
}