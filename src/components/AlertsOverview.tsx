import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, Bell } from "lucide-react";

export function AlertsOverview() {
  // Get alert settings
  const { data: settings } = useQuery({
    queryKey: ["alertSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_settings")
        .select("*")
        .single();
      
      if (error && error.code !== "PGRST116") {
        throw error;
      }
      
      return data;
    },
  });

  // Check for low stock medicines
  const { data: lowStockMedicines } = useQuery({
    queryKey: ["lowStockMedicines", settings?.low_stock_threshold],
    queryFn: async () => {
      if (!settings) return [];
      
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .lte("quantity", settings.low_stock_threshold);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!settings,
  });

  // Check for low stock cosmetics
  const { data: lowStockCosmetics } = useQuery({
    queryKey: ["lowStockCosmetics", settings?.low_stock_threshold],
    queryFn: async () => {
      if (!settings) return [];
      
      const { data, error } = await supabase
        .from("cosmetics")
        .select("*")
        .lte("quantity", settings.low_stock_threshold);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!settings,
  });

  // Check for near expiry medicines
  const { data: nearExpiryMedicines } = useQuery({
    queryKey: ["nearExpiryMedicines", settings?.expiry_warning_days],
    queryFn: async () => {
      if (!settings) return [];
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + settings.expiry_warning_days);

      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .lte("expiry_date", expiryDate.toISOString().split('T')[0])
        .gt("expiry_date", new Date().toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!settings,
  });

  // Check for near expiry cosmetics
  const { data: nearExpiryCosmetics } = useQuery({
    queryKey: ["nearExpiryCosmetics", settings?.expiry_warning_days],
    queryFn: async () => {
      if (!settings) return [];
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + settings.expiry_warning_days);

      const { data, error } = await supabase
        .from("cosmetics")
        .select("*")
        .lte("expiry_date", expiryDate.toISOString().split('T')[0])
        .gt("expiry_date", new Date().toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!settings,
  });

  const totalLowStock = (lowStockMedicines?.length || 0) + (lowStockCosmetics?.length || 0);
  const totalNearExpiry = (nearExpiryMedicines?.length || 0) + (nearExpiryCosmetics?.length || 0);
  const totalAlerts = totalLowStock + totalNearExpiry;

  if (!settings) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Inventory Alerts
          </span>
          {totalAlerts > 0 && (
            <Badge variant="destructive">{totalAlerts}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg ${totalLowStock > 0 ? 'bg-destructive/10 border border-destructive/20' : 'bg-accent'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-destructive" />
                <span className="font-medium">Low Stock</span>
              </div>
              <span className="text-2xl font-bold">{totalLowStock}</span>
            </div>
            {totalLowStock > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {lowStockMedicines?.length || 0} medicines, {lowStockCosmetics?.length || 0} cosmetics
              </p>
            )}
          </div>

          <div className={`p-4 rounded-lg ${totalNearExpiry > 0 ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800' : 'bg-accent'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="font-medium">Near Expiry</span>
              </div>
              <span className="text-2xl font-bold">{totalNearExpiry}</span>
            </div>
            {totalNearExpiry > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Within {settings.expiry_warning_days} days
              </p>
            )}
          </div>
        </div>

        {totalAlerts === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            ✓ All inventory levels are healthy
          </p>
        )}

        {totalAlerts > 0 && (
          <div className="text-sm text-muted-foreground">
            <p>
              Automated alerts are {settings.email_enabled ? 'enabled' : 'disabled'} and run every {settings.check_frequency_hours} hours.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}