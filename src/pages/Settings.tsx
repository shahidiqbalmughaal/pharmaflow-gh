import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiSettingsDialog } from "@/components/ApiSettingsDialog";
import { AlertSettingsDialog } from "@/components/AlertSettingsDialog";
import { AlertHistory } from "@/components/AlertHistory";
import { PharmacySettingsCard } from "@/components/PharmacySettingsCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Info } from "lucide-react";

const Settings = () => {
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

  const isAdmin = userRole === "admin";
  const isAdminOrManager = userRole === "admin" || userRole === "manager";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        {isAdmin && (
          <div className="flex gap-2">
            <AlertSettingsDialog />
            <ApiSettingsDialog />
          </div>
        )}
      </div>
      
      {/* Pharmacy Settings - Available to Admin and Manager */}
      {isAdminOrManager && (
        <PharmacySettingsCard />
      )}

      {isAdmin ? (
        <>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Admin-only section: Configure alerts and API integration settings
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Configure automatic notifications for low stock levels and near-expiry items.
                Receive alerts via email or WhatsApp to ensure timely reordering and inventory management.
              </p>
              <div className="space-y-2">
                <h4 className="font-medium">Features:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Low stock threshold alerts</li>
                  <li>Near expiry date warnings</li>
                  <li>Email notifications to multiple admins</li>
                  <li>WhatsApp notification links</li>
                  <li>Customizable check frequency</li>
                  <li>Alert history tracking</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <AlertHistory />

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> After configuring alert settings, remember to set up your Resend account at{" "}
              <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">
                resend.com
              </a>{" "}
              and verify your domain to enable email notifications.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>API Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Configure external API endpoints and authentication to enable advanced reporting features.
                Your API credentials are stored securely and never exposed to the client.
              </p>
              <div className="space-y-2">
                <h4 className="font-medium">Available Features:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Daily sold medicines report</li>
                  <li>Date range sales analysis</li>
                  <li>Export reports to CSV/Excel</li>
                  <li>Filter by distributor and date</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </>
      ) : !isAdminOrManager ? (
        <Card>
          <CardHeader>
            <CardTitle>Application Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              General settings available. Contact your administrator for advanced configuration access.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default Settings;
