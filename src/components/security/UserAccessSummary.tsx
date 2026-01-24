import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";

interface AccessLog {
  id: string;
  user_id: string;
  action_type: string;
  resource_type: string;
  resource_count: number;
  created_at: string;
}

interface UserAccessSummaryProps {
  accessLogs: AccessLog[];
  getUserName: (userId: string) => string;
}

export function UserAccessSummary({ accessLogs, getUserName }: UserAccessSummaryProps) {
  // Group by user
  const userSummaries = accessLogs.reduce((acc, log) => {
    if (!acc[log.user_id]) {
      acc[log.user_id] = {
        totalEvents: 0,
        views: 0,
        exports: 0,
        sensitiveAccess: 0,
        bulkQueries: 0,
        resources: new Set<string>(),
        lastActive: log.created_at,
      };
    }
    
    acc[log.user_id].totalEvents++;
    acc[log.user_id].resources.add(log.resource_type);
    
    if (log.action_type === 'view') acc[log.user_id].views++;
    if (log.action_type === 'export') acc[log.user_id].exports++;
    if (log.action_type === 'sensitive_access') acc[log.user_id].sensitiveAccess++;
    if (log.action_type === 'bulk_query') acc[log.user_id].bulkQueries++;
    
    if (new Date(log.created_at) > new Date(acc[log.user_id].lastActive)) {
      acc[log.user_id].lastActive = log.created_at;
    }
    
    return acc;
  }, {} as Record<string, {
    totalEvents: number;
    views: number;
    exports: number;
    sensitiveAccess: number;
    bulkQueries: number;
    resources: Set<string>;
    lastActive: string;
  }>);

  const sortedUsers = Object.entries(userSummaries)
    .sort((a, b) => b[1].totalEvents - a[1].totalEvents);

  if (sortedUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Activity Summary
          </CardTitle>
          <CardDescription>
            No user activity found for this time period
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Activity Summary
        </CardTitle>
        <CardDescription>
          Overview of each user's access patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="text-center">Total Events</TableHead>
              <TableHead className="text-center">Views</TableHead>
              <TableHead className="text-center">Exports</TableHead>
              <TableHead className="text-center">Sensitive</TableHead>
              <TableHead>Resources Accessed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map(([userId, summary]) => (
              <TableRow key={userId}>
                <TableCell className="font-medium">
                  {getUserName(userId)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{summary.totalEvents}</Badge>
                </TableCell>
                <TableCell className="text-center">{summary.views}</TableCell>
                <TableCell className="text-center">
                  {summary.exports > 0 ? (
                    <Badge variant="secondary">{summary.exports}</Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {summary.sensitiveAccess > 0 ? (
                    <Badge variant="destructive">{summary.sensitiveAccess}</Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(summary.resources).slice(0, 4).map(resource => (
                      <Badge key={resource} variant="outline" className="text-xs">
                        {resource}
                      </Badge>
                    ))}
                    {summary.resources.size > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{summary.resources.size - 4}
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
