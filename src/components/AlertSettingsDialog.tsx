import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Bell, Loader2, Mail, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AlertSettingsDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [expiryWarningDays, setExpiryWarningDays] = useState(30);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [adminEmails, setAdminEmails] = useState("");
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [checkFrequency, setCheckFrequency] = useState(24);

  // Fetch existing settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["alertSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_settings")
        .select("*")
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      return data;
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && settings) {
      setLowStockThreshold(settings.low_stock_threshold);
      setExpiryWarningDays(settings.expiry_warning_days);
      setEmailEnabled(settings.email_enabled);
      setWhatsappEnabled(settings.whatsapp_enabled);
      setAdminEmails(settings.admin_emails.join(", "));
      setAdminWhatsapp(settings.admin_whatsapp_numbers.join(", "));
      setCheckFrequency(settings.check_frequency_hours);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const emailArray = adminEmails.split(",").map(e => e.trim()).filter(e => e);
      const whatsappArray = adminWhatsapp.split(",").map(n => n.trim()).filter(n => n);

      const newSettings = {
        low_stock_threshold: lowStockThreshold,
        expiry_warning_days: expiryWarningDays,
        email_enabled: emailEnabled,
        whatsapp_enabled: whatsappEnabled,
        admin_emails: emailArray,
        admin_whatsapp_numbers: whatsappArray,
        check_frequency_hours: checkFrequency,
      };

      if (settings) {
        const { error } = await supabase
          .from("alert_settings")
          .update(newSettings)
          .eq("id", settings.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("alert_settings")
          .insert([newSettings]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertSettings"] });
      toast({
        title: "Settings saved",
        description: "Alert settings have been updated successfully",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test alert function
  const testAlertMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('inventory-alerts');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Test completed",
        description: data.message || `Found ${data.alertsFound} alerts`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Bell className="h-4 w-4 mr-2" />
          Alert Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventory Alert Settings</DialogTitle>
          <DialogDescription>
            Configure automatic notifications for low stock and near-expiry items
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Thresholds */}
            <div className="space-y-4">
              <h4 className="font-medium">Alert Thresholds</h4>
              
              <div className="space-y-2">
                <Label htmlFor="lowStock">Low Stock Threshold (units)</Label>
                <Input
                  id="lowStock"
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Alert when quantity falls below this number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDays">Expiry Warning (days)</Label>
                <Input
                  id="expiryDays"
                  type="number"
                  min="0"
                  value={expiryWarningDays}
                  onChange={(e) => setExpiryWarningDays(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Alert when items expire within this many days
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Check Frequency (hours)</Label>
                <Input
                  id="frequency"
                  type="number"
                  min="1"
                  value={checkFrequency}
                  onChange={(e) => setCheckFrequency(parseInt(e.target.value) || 24)}
                />
                <p className="text-xs text-muted-foreground">
                  How often to check inventory for alerts
                </p>
              </div>
            </div>

            {/* Email Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <h4 className="font-medium">Email Notifications</h4>
                </div>
                <Switch
                  checked={emailEnabled}
                  onCheckedChange={setEmailEnabled}
                />
              </div>
              
              {emailEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="emails">Admin Email Addresses</Label>
                  <Input
                    id="emails"
                    placeholder="admin1@example.com, admin2@example.com"
                    value={adminEmails}
                    onChange={(e) => setAdminEmails(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of email addresses
                  </p>
                </div>
              )}
            </div>

            {/* WhatsApp Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <h4 className="font-medium">WhatsApp Notifications</h4>
                  <Badge variant="secondary" className="text-xs">Manual</Badge>
                </div>
                <Switch
                  checked={whatsappEnabled}
                  onCheckedChange={setWhatsappEnabled}
                />
              </div>
              
              {whatsappEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Numbers</Label>
                  <Input
                    id="whatsapp"
                    placeholder="+1234567890, +9876543210"
                    value={adminWhatsapp}
                    onChange={(e) => setAdminWhatsapp(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list with country codes (e.g., +1234567890)
                  </p>
                  <p className="text-xs text-amber-600">
                    Note: WhatsApp alerts generate links that need to be opened manually
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => testAlertMutation.mutate()}
                variant="outline"
                disabled={testAlertMutation.isPending}
              >
                {testAlertMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Alerts Now"
                )}
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="ml-auto"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}