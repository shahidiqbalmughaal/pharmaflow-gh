import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface RoleManagementDialogProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    full_name: string | null;
    email: string;
    roles: string[];
  } | null;
}

const AVAILABLE_ROLES = ['admin', 'manager', 'salesman'] as const;

export function RoleManagementDialog({ open, onClose, user }: RoleManagementDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user?.roles || []);
  const queryClient = useQueryClient();

  // Reset selected roles when user changes
  useState(() => {
    if (user) {
      setSelectedRoles(user.roles);
    }
  });

  const updateRolesMutation = useMutation({
    mutationFn: async (roles: string[]) => {
      if (!user) return;

      // First, delete all existing roles for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Then, insert the new roles
      if (roles.length > 0) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(roles.map(role => ({ 
            user_id: user.id, 
            role: role as 'admin' | 'manager' | 'salesman'
          })));

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User roles updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user roles');
    },
  });

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSave = () => {
    updateRolesMutation.mutate(selectedRoles);
  };

  const handleClose = () => {
    setSelectedRoles(user?.roles || []);
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage User Roles</DialogTitle>
          <DialogDescription>
            Update roles for {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {AVAILABLE_ROLES.map((role) => (
              <div key={role} className="flex items-center space-x-2">
                <Checkbox
                  id={`role-${role}`}
                  checked={selectedRoles.includes(role)}
                  onCheckedChange={() => handleRoleToggle(role)}
                  disabled={updateRolesMutation.isPending}
                />
                <Label
                  htmlFor={`role-${role}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                >
                  {role}
                </Label>
              </div>
            ))}
          </div>

          {selectedRoles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Warning: User must have at least one role to access the system.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={updateRolesMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateRolesMutation.isPending}>
            {updateRolesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
