import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, UserCog, UserPlus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface StaffMember {
  id: string;
  user_id: string;
  shop_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  user_email?: string;
  shop_name?: string;
}

interface Shop {
  id: string;
  name: string;
  status: string;
}

interface UserInfo {
  id: string;
  email: string;
}

const STAFF_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "cashier", label: "Cashier" },
];

export default function StaffManagement() {
  const queryClient = useQueryClient();
  const { userRole, shopStaffInfo } = useAuth();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("cashier");
  const [filterShop, setFilterShop] = useState<string>("all");
  
  // New staff creation fields
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Permission checks
  const isAdmin = userRole === 'admin';
  const isOwner = shopStaffInfo?.shop_role === 'owner';
  const canManageStaff = isAdmin || isOwner;

  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  // Fetch all shops
  const { data: shops = [] } = useQuery({
    queryKey: ["staff-shops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, status")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as Shop[];
    },
  });

  // Fetch all staff with user emails
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["all-staff"],
    queryFn: async () => {
      // Get staff records
      const { data: staffData, error: staffError } = await supabase
        .from("shop_staff")
        .select("*")
        .order("created_at", { ascending: false });

      if (staffError) throw staffError;

      // Get user emails via edge function
      const userIds = [...new Set(staffData?.map(s => s.user_id) || [])];
      
      let userEmails: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: emailData } = await supabase.functions.invoke('get-user-emails', {
          body: { userIds }
        });
        if (emailData?.emails) {
          userEmails = emailData.emails;
        }
      }

      // Get shop names
      const { data: shopsData } = await supabase
        .from("shops")
        .select("id, name");

      const shopNames: Record<string, string> = {};
      shopsData?.forEach(shop => {
        shopNames[shop.id] = shop.name;
      });

      // Combine data
      return (staffData || []).map(s => ({
        ...s,
        user_email: userEmails[s.user_id] || "Unknown",
        shop_name: shopNames[s.shop_id] || "Unknown",
      })) as StaffMember[];
    },
  });

  // Fetch users that can be assigned (get from user_roles)
  const { data: users = [] } = useQuery({
    queryKey: ["assignable-users"],
    queryFn: async () => {
      // Get all user IDs from user_roles
      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("user_id");
      
      if (error) throw error;

      const userIds = [...new Set(rolesData?.map(r => r.user_id) || [])];
      
      if (userIds.length === 0) return [];

      // Get emails via edge function
      const { data: emailData } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds }
      });

      if (!emailData?.emails) return [];

      return Object.entries(emailData.emails).map(([id, email]) => ({
        id,
        email: email as string,
      })) as UserInfo[];
    },
  });

  // Create new staff user mutation
  const createStaffMutation = useMutation({
    mutationFn: async ({ email, password, fullName, shopId, role }: {
      email: string;
      password: string;
      fullName: string;
      shopId: string;
      role: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('create-staff-user', {
        body: { email, password, fullName, shopId, role }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Staff member created successfully");
      queryClient.invalidateQueries({ queryKey: ["all-staff"] });
      queryClient.invalidateQueries({ queryKey: ["assignable-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-staff-counts"] });
      setIsCreateOpen(false);
      resetCreateForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create staff member");
    },
  });

  // Add existing user as staff mutation
  const addMutation = useMutation({
    mutationFn: async ({ userId, shopId, role }: { userId: string; shopId: string; role: string }) => {
      // Check if already exists
      const { data: existing } = await supabase
        .from("shop_staff")
        .select("id")
        .eq("user_id", userId)
        .eq("shop_id", shopId)
        .maybeSingle();

      if (existing) {
        throw new Error("User is already assigned to this shop");
      }

      const { error } = await supabase.from("shop_staff").insert({
        user_id: userId,
        shop_id: shopId,
        role,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Staff member added successfully");
      queryClient.invalidateQueries({ queryKey: ["all-staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin-staff-counts"] });
      setIsAddOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add staff member");
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase
        .from("shop_staff")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["all-staff"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("shop_staff")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? "Staff member activated" : "Staff member deactivated");
      queryClient.invalidateQueries({ queryKey: ["all-staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin-staff-counts"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  // Remove staff mutation
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shop_staff")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Staff member removed");
      queryClient.invalidateQueries({ queryKey: ["all-staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin-staff-counts"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove staff member");
    },
  });

  const resetForm = () => {
    setSelectedShop("");
    setSelectedUser("");
    setSelectedRole("cashier");
  };

  const resetCreateForm = () => {
    setNewEmail("");
    setNewPassword("");
    setNewFullName("");
    setSelectedShop("");
    setSelectedRole("cashier");
    setShowPassword(false);
  };

  const handleAdd = () => {
    if (!selectedUser || !selectedShop || !selectedRole) {
      toast.error("Please fill in all fields");
      return;
    }
    addMutation.mutate({ userId: selectedUser, shopId: selectedShop, role: selectedRole });
  };

  const handleCreateStaff = () => {
    if (!newEmail || !newPassword || !newFullName || !selectedShop || !selectedRole) {
      toast.error("Please fill in all fields");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    createStaffMutation.mutate({
      email: newEmail,
      password: newPassword,
      fullName: newFullName,
      shopId: selectedShop,
      role: selectedRole
    });
  };

  // Filter staff based on shop filter and user permissions
  const filteredStaff = (() => {
    let filtered = staff;
    
    // Non-admins can only see staff from their shops
    if (!isAdmin && isOwner && shopStaffInfo) {
      filtered = staff.filter(s => s.shop_id === shopStaffInfo.shop_id);
    }
    
    // Apply shop filter
    if (filterShop !== "all") {
      filtered = filtered.filter(s => s.shop_id === filterShop);
    }
    
    return filtered;
  })();

  // Available shops for filtering (non-admins only see their shops)
  const availableShops = isAdmin ? shops : shops.filter(s => s.id === shopStaffInfo?.shop_id);

  // Can only modify roles based on permissions
  const canModifyRole = (staffRole: string) => {
    if (isAdmin) return true;
    // Owners cannot modify other owners
    if (isOwner && staffRole === 'owner') return false;
    return isOwner;
  };

  if (!canManageStaff) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Staff Management
          </CardTitle>
          <CardDescription>You don't have permission to manage staff</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Staff Management
            </CardTitle>
            <CardDescription>Create new staff accounts or assign existing users to shops</CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Create New Staff Button */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Staff Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Staff Account</DialogTitle>
                  <DialogDescription>
                    Create a new user account and assign them to a shop
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Full Name *</Label>
                    <Input
                      placeholder="Enter full name"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Password *</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password (min 6 chars)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button type="button" variant="outline" onClick={generatePassword}>
                        Generate
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Shop *</Label>
                    <Select value={selectedShop} onValueChange={setSelectedShop}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableShops.map((shop) => (
                          <SelectItem key={shop.id} value={shop.id}>
                            {shop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Role *</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAFF_ROLES.filter(role => isAdmin || role.value !== 'owner').map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetCreateForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateStaff} disabled={createStaffMutation.isPending}>
                    {createStaffMutation.isPending ? "Creating..." : "Create Account"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Assign Existing User Button */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Existing User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign User to Shop</DialogTitle>
                  <DialogDescription>
                    Assign an existing user to a shop with a specific role
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>User *</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Shop *</Label>
                    <Select value={selectedShop} onValueChange={setSelectedShop}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableShops.map((shop) => (
                          <SelectItem key={shop.id} value={shop.id}>
                            {shop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Role *</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAFF_ROLES.filter(role => isAdmin || role.value !== 'owner').map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdd} disabled={addMutation.isPending}>
                    {addMutation.isPending ? "Adding..." : "Assign User"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter */}
        {isAdmin && (
          <div className="mb-4 flex items-center gap-2">
            <Label>Filter by Shop:</Label>
            <Select value={filterShop} onValueChange={setFilterShop}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Shops" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shops</SelectItem>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">Loading staff...</div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No staff members found. Create a new staff account to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Email</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.user_email}</TableCell>
                  <TableCell>{member.shop_name}</TableCell>
                  <TableCell>
                    {canModifyRole(member.role) ? (
                      <Select
                        value={member.role}
                        onValueChange={(role) => updateRoleMutation.mutate({ id: member.id, role })}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_ROLES.filter(role => isAdmin || role.value !== 'owner').map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="capitalize">
                        {member.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.is_active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() =>
                        toggleActiveMutation.mutate({ id: member.id, isActive: !member.is_active })
                      }
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(member.created_at), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {canModifyRole(member.role) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to remove this staff member?")) {
                            removeMutation.mutate(member.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}