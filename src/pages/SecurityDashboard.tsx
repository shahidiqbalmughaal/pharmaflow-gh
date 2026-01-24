import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertTriangle, Activity, Users, Eye, Download, Database, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { AccessPatternsChart } from "@/components/security/AccessPatternsChart";
import { AnomalyAlerts } from "@/components/security/AnomalyAlerts";
import { UserAccessSummary } from "@/components/security/UserAccessSummary";

export default function SecurityDashboard() {
  const { currentShop, isSuperAdmin } = useShop();
  const { shopStaffInfo } = useAuth();
  const [timeRange, setTimeRange] = useState("24");

  const shopRole = shopStaffInfo?.shop_role || null;
  const canViewSecurity = isSuperAdmin || shopRole === 'owner' || shopRole === 'manager';

  // Fetch access logs
  const { data: accessLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["access-logs", currentShop?.shop_id, timeRange],
    queryFn: async () => {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - parseInt(timeRange));

      const { data, error } = await supabase
        .from("access_logs")
        .select("*")
        .eq("shop_id", currentShop?.shop_id)
        .gte("created_at", hoursAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentShop?.shop_id && canViewSecurity,
  });

  // Fetch user profiles for names
  const { data: userProfiles = [] } = useQuery({
    queryKey: ["user-profiles-security"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: canViewSecurity,
  });

  // Fetch anomalies
  const { data: anomalies = [], isLoading: anomaliesLoading } = useQuery({
    queryKey: ["access-anomalies", currentShop?.shop_id, timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_access_anomalies", {
          p_shop_id: currentShop?.shop_id,
          p_hours: parseInt(timeRange)
        });

      if (error) throw error;
      return (data || []).filter((a: { is_anomaly: boolean }) => a.is_anomaly);
    },
    enabled: !!currentShop?.shop_id && canViewSecurity,
  });

  const getUserName = (userId: string) => {
    const profile = userProfiles.find(p => p.id === userId);
    return profile?.full_name || 'Unknown User';
  };

  // Calculate summary stats
  const totalEvents = accessLogs.length;
  const uniqueUsers = new Set(accessLogs.map(l => l.user_id)).size;
  const sensitiveAccesses = accessLogs.filter(l => l.action_type === 'sensitive_access').length;
  const exports = accessLogs.filter(l => l.action_type === 'export').length;

  // Group logs by action type
  const actionTypeCounts = accessLogs.reduce((acc, log) => {
    acc[log.action_type] = (acc[log.action_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group logs by resource type
  const resourceTypeCounts = accessLogs.reduce((acc, log) => {
    acc[log.resource_type] = (acc[log.resource_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!canViewSecurity) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              Only shop owners and managers can view the security dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Security Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor access patterns and detect potential security anomalies
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <Clock className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">Last 6 hours</SelectItem>
            <SelectItem value="24">Last 24 hours</SelectItem>
            <SelectItem value="48">Last 48 hours</SelectItem>
            <SelectItem value="168">Last 7 days</SelectItem>
            <SelectItem value="720">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <AnomalyAlerts anomalies={anomalies} getUserName={getUserName} />
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              in last {timeRange} hours
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">
              unique users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sensitive Access</CardTitle>
            <Eye className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sensitiveAccesses}</div>
            <p className="text-xs text-muted-foreground">
              sensitive data views
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Exports</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exports}</div>
            <p className="text-xs text-muted-foreground">
              export operations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Access Patterns
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Activity
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Raw Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AccessPatternsChart 
              title="Actions by Type"
              data={actionTypeCounts}
              icon={<Activity className="h-4 w-4" />}
            />
            <AccessPatternsChart 
              title="Access by Resource"
              data={resourceTypeCounts}
              icon={<Database className="h-4 w-4" />}
            />
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserAccessSummary 
            accessLogs={accessLogs} 
            getUserName={getUserName}
          />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Access Logs</CardTitle>
              <CardDescription>
                Detailed view of all access events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8">Loading logs...</div>
              ) : accessLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No access logs found for this time period.
                </div>
              ) : (
                <div className="max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessLogs.slice(0, 100).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">
                            <span title={format(new Date(log.created_at), "PPpp")}>
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">
                            {getUserName(log.user_id)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              log.action_type === 'sensitive_access' ? 'destructive' :
                              log.action_type === 'export' ? 'secondary' :
                              log.action_type === 'bulk_query' ? 'outline' :
                              'default'
                            }>
                              {log.action_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.resource_type}</TableCell>
                          <TableCell>{log.resource_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
