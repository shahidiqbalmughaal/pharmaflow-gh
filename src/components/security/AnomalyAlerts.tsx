import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Database, Download, Eye } from "lucide-react";

interface Anomaly {
  user_id: string;
  action_type: string;
  resource_type: string;
  total_count: number;
  unique_sessions: number;
  avg_count_per_session: number;
  is_anomaly: boolean;
  anomaly_reason?: string;
}

interface AnomalyAlertsProps {
  anomalies: Anomaly[];
  getUserName: (userId: string) => string;
}

const getAnomalyIcon = (actionType: string, resourceType: string) => {
  if (actionType === 'export') return Download;
  if (resourceType === 'customers') return Users;
  if (actionType === 'sensitive_access') return Eye;
  return Database;
};

const getAnomalyBadgeVariant = (actionType: string): "destructive" | "outline" | "secondary" => {
  if (actionType === 'export' || actionType === 'bulk_query') return "destructive";
  if (actionType === 'sensitive_access') return "outline";
  return "secondary";
};

export function AnomalyAlerts({ anomalies, getUserName }: AnomalyAlertsProps) {
  if (anomalies.length === 0) return null;

  // Prioritize customer-related anomalies
  const sortedAnomalies = [...anomalies].sort((a, b) => {
    if (a.resource_type === 'customers' && b.resource_type !== 'customers') return -1;
    if (b.resource_type === 'customers' && a.resource_type !== 'customers') return 1;
    if (a.action_type === 'export' && b.action_type !== 'export') return -1;
    if (b.action_type === 'export' && a.action_type !== 'export') return 1;
    return b.total_count - a.total_count;
  });

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Security Anomalies Detected
        </CardTitle>
        <CardDescription>
          Unusual access patterns that may require investigation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedAnomalies.map((anomaly, index) => {
            const Icon = getAnomalyIcon(anomaly.action_type, anomaly.resource_type);
            const isCustomerRelated = anomaly.resource_type === 'customers';
            
            return (
              <div 
                key={`${anomaly.user_id}-${anomaly.action_type}-${anomaly.resource_type}-${index}`}
                className={`flex items-center justify-between p-3 rounded-lg bg-background border ${
                  isCustomerRelated ? 'border-destructive/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isCustomerRelated ? 'bg-destructive/10' : 'bg-muted'}`}>
                    <Icon className={`h-4 w-4 ${isCustomerRelated ? 'text-destructive' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{getUserName(anomaly.user_id)}</p>
                    {anomaly.anomaly_reason && (
                      <p className="text-sm text-muted-foreground">{anomaly.anomaly_reason}</p>
                    )}
                    <div className="flex gap-2 text-sm">
                      <Badge variant={getAnomalyBadgeVariant(anomaly.action_type)}>
                        {anomaly.action_type}
                      </Badge>
                      <Badge variant="secondary">{anomaly.resource_type}</Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-destructive">{anomaly.total_count}</p>
                  <p className="text-xs text-muted-foreground">
                    {anomaly.avg_count_per_session}/session avg
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
