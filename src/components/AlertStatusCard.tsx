import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Package, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function AlertStatusCard() {
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  // Check if user is admin
  const { data: userRole } = useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      return data?.role;
    },
  });

  const { data: alertSettings } = useQuery({
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
    enabled: userRole === "admin",
  });

  const { data: inventoryStatus } = useQuery({
    queryKey: ["inventoryAlertStatus"],
    queryFn: async () => {
      const threshold = alertSettings?.low_stock_threshold || 10;
      const expiryDays = alertSettings?.expiry_warning_days || 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      // Check low stock medicines
      const { data: lowStockMedicines } = await supabase
        .from('medicines')
        .select('id')
        .lte('quantity', threshold);

      // Check low stock cosmetics
      const { data: lowStockCosmetics } = await supabase
        .from('cosmetics')
        .select('id')
        .lte('quantity', threshold);

      // Check near expiry medicines
      const { data: nearExpiryMedicines } = await supabase
        .from('medicines')
        .select('id')
        .lte('expiry_date', expiryDate.toISOString().split('T')[0])
        .gt('expiry_date', new Date().toISOString().split('T')[0]);

      // Check near expiry cosmetics
      const { data: nearExpiryCosmetics } = await supabase
        .from('cosmetics')
        .select('id')
        .lte('expiry_date', expiryDate.toISOString().split('T')[0])
        .gt('expiry_date', new Date().toISOString().split('T')[0]);

      return {
        lowStock: (lowStockMedicines?.length || 0) + (lowStockCosmetics?.length || 0),
        nearExpiry: (nearExpiryMedicines?.length || 0) + (nearExpiryCosmetics?.length || 0),
      };
    },
    enabled: userRole === "admin" && !!alertSettings,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const handleCheckNow = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('inventory-alerts');
      if (error) throw error;
      
      toast({
        title: "Alert check completed",
        description: data.message || `Found ${data.alertsFound} alerts`,
      });
    } catch (error: any) {
      toast({
        title: "Check failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  if (userRole !== "admin" || !alertSettings) {
    return null;
  }

  const totalAlerts = (inventoryStatus?.lowStock || 0) + (inventoryStatus?.nearExpiry || 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Inventory Alerts
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
              <Package className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Low Stock</span>
            </div>
            <p className="text-2xl font-bold text-destructive">
              {inventoryStatus?.lowStock || 0}
            </p>
          </div>
          
          <div className="p-4 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Near Expiry</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {inventoryStatus?.nearExpiry || 0}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Auto-check: Every {alertSettings.check_frequency_hours}h
          </p>
          <Button 
            onClick={handleCheckNow}
            size="sm"
            variant="outline"
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              "Check Now"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}