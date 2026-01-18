import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, UserCog } from "lucide-react";
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("cashier");
  const [filterShop, setFilterShop] = useState<string>("all");

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

  // Add staff mutation
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

  const handleAdd = () => {
    if (!selectedUser || !selectedShop || !selectedRole) {
      toast.error("Please fill in all fields");
      return;
    }
    addMutation.mutate({ userId: selectedUser, shopId: selectedShop, role: selectedRole });
  };

  const filteredStaff = filterShop === "all" 
    ? staff 
    : staff.filter(s => s.shop_id === filterShop);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Staff Management
            </CardTitle>
            <CardDescription>Assign users to shops and manage their roles</CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
                <DialogDescription>
                  Assign a user to a shop with a specific role
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
                      {shops.map((shop) => (
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
                      {STAFF_ROLES.map((role) => (
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
                  {addMutation.isPending ? "Adding..." : "Add Staff"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter */}
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

        {isLoading ? (
          <div className="text-center py-8">Loading staff...</div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No staff members found. Add staff to get started.
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
                    <Select
                      value={member.role}
                      onValueChange={(role) => updateRoleMutation.mutate({ id: member.id, role })}
                    >
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAFF_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
