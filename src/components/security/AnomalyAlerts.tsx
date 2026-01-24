import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface Anomaly {
  user_id: string;
  action_type: string;
  resource_type: string;
  total_count: number;
  unique_sessions: number;
  avg_count_per_session: number;
  is_anomaly: boolean;
}

interface AnomalyAlertsProps {
  anomalies: Anomaly[];
  getUserName: (userId: string) => string;
}

export function AnomalyAlerts({ anomalies, getUserName }: AnomalyAlertsProps) {
  if (anomalies.length === 0) return null;

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
          {anomalies.map((anomaly, index) => (
            <div 
              key={`${anomaly.user_id}-${anomaly.action_type}-${anomaly.resource_type}-${index}`}
              className="flex items-center justify-between p-3 rounded-lg bg-background border"
            >
              <div className="space-y-1">
                <p className="font-medium">{getUserName(anomaly.user_id)}</p>
                <div className="flex gap-2 text-sm">
                  <Badge variant="outline">{anomaly.action_type}</Badge>
                  <Badge variant="secondary">{anomaly.resource_type}</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-destructive">{anomaly.total_count}</p>
                <p className="text-xs text-muted-foreground">
                  {anomaly.avg_count_per_session}/session avg
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
