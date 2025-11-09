import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RoleManagementDialog } from '@/components/RoleManagementDialog';
import { Shield, Search, UserCog, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: string[];
}

const UserManagement = () => {
  const { userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // First, get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Then, get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get auth metadata to retrieve emails
      // We'll need to get this from the auth.users metadata via a different approach
      // For now, we'll fetch from the auth system
      const userIds = profiles.map(p => p.id);
      const emailsMap: Record<string, string> = {};
      
      // Fetch user emails by querying auth.users through a database function or edge function
      // For now, we'll use the RPC approach or direct query
      for (const profile of profiles) {
        const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
        if (authData?.user?.email) {
          emailsMap[profile.id] = authData.user.email;
        }
      }

      // Combine the data
      const usersWithRoles: UserWithRoles[] = profiles.map(profile => {
        const roles = userRoles
          .filter(ur => ur.user_id === profile.id)
          .map(ur => ur.role);

        return {
          id: profile.id,
          email: emailsMap[profile.id] || 'N/A',
          full_name: profile.full_name,
          created_at: profile.created_at,
          roles: roles,
        };
      });

      return usersWithRoles;
    },
    enabled: userRole === 'admin',
  });

  // Filter users based on search query
  const filteredUsers = users?.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleManageRoles = (user: UserWithRoles) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTimeout(() => setSelectedUser(null), 300);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'salesman':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Check if user is admin
  if (userRole !== 'admin') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">User Management</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-foreground">Access Denied</p>
              <p className="text-sm text-muted-foreground mt-2">
                Only administrators can access user management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">Manage user accounts and role assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Admin Only</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View and manage user roles across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'No name'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge
                                key={role}
                                variant={getRoleBadgeVariant(role)}
                                className="capitalize"
                              >
                                {role}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              No roles
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageRoles(user)}
                        >
                          <UserCog className="h-4 w-4 mr-2" />
                          Manage Roles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <RoleManagementDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        user={selectedUser}
      />
    </div>
  );
};

export default UserManagement;
