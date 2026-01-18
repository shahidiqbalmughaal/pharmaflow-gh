import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Store, Users, TrendingUp, Package, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import StaffManagement from "@/components/StaffManagement";

export default function AdminDashboard() {
  const { isSuperAdmin, refreshShops } = useShop();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    address: "",
    phone: "",
    email: "",
  });

  // Fetch all shops
  const { data: shops = [], isLoading: shopsLoading } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Fetch shop analytics
  const { data: analytics = [] } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("shop_id, total_amount, total_profit");

      if (salesError) throw salesError;

      const shopStats: Record<string, { sales: number; profit: number; count: number }> = {};
      salesData?.forEach((sale) => {
        if (!sale.shop_id) return;
        if (!shopStats[sale.shop_id]) {
          shopStats[sale.shop_id] = { sales: 0, profit: 0, count: 0 };
        }
        shopStats[sale.shop_id].sales += sale.total_amount || 0;
        shopStats[sale.shop_id].profit += sale.total_profit || 0;
        shopStats[sale.shop_id].count += 1;
      });

      return Object.entries(shopStats).map(([shop_id, stats]) => ({
        shop_id,
        ...stats,
      }));
    },
    enabled: isSuperAdmin,
  });

  // Fetch staff counts per shop
  const { data: staffCounts = [] } = useQuery({
    queryKey: ["admin-staff-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_staff")
        .select("shop_id")
        .eq("is_active", true);
      
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((staff) => {
        counts[staff.shop_id] = (counts[staff.shop_id] || 0) + 1;
      });

      return Object.entries(counts).map(([shop_id, count]) => ({
        shop_id,
        count,
      }));
    },
    enabled: isSuperAdmin,
  });

  // Create shop mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: shop, error } = await supabase
        .from("shops")
        .insert({
          name: data.name,
          location: data.location,
          address: data.address,
          phone: data.phone,
          email: data.email,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await supabase.from("shop_staff").insert({
          user_id: user.id,
          shop_id: shop.id,
          role: "owner",
          is_active: true,
        });
      }

      return shop;
    },
    onSuccess: () => {
      toast.success("Shop created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      queryClient.invalidateQueries({ queryKey: ["all-staff"] });
      refreshShops();
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create shop");
    },
  });

  // Update shop mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("shops")
        .update({
          name: data.name,
          location: data.location,
          address: data.address,
          phone: data.phone,
          email: data.email,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shop updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      refreshShops();
      setEditingShop(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update shop");
    },
  });

  // Delete shop mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shops")
        .update({ status: "inactive" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shop deactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      refreshShops();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to deactivate shop");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      location: "",
      address: "",
      phone: "",
      email: "",
    });
  };

  const handleEdit = (shop: any) => {
    setEditingShop(shop);
    setFormData({
      name: shop.name || "",
      location: shop.location || "",
      address: shop.address || "",
      phone: shop.phone || "",
      email: shop.email || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingShop) {
      updateMutation.mutate({ id: editingShop.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getShopAnalytics = (shopId: string) => {
    return analytics.find((a) => a.shop_id === shopId) || { sales: 0, profit: 0, count: 0 };
  };

  const getStaffCount = (shopId: string) => {
    return staffCounts.find((s) => s.shop_id === shopId)?.count || 0;
  };

  const totalSales = analytics.reduce((sum, a) => sum + a.sales, 0);
  const totalProfit = analytics.reduce((sum, a) => sum + a.profit, 0);
  const totalTransactions = analytics.reduce((sum, a) => sum + a.count, 0);

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage all shops, staff, and view cross-shop analytics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shops.filter(s => s.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">
              {shops.filter(s => s.status === 'inactive').length} inactive
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {totalTransactions} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalProfit)}</div>
            <p className="text-xs text-muted-foreground">
              Across all shops
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staffCounts.reduce((sum, s) => sum + s.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Active staff members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Shops and Staff */}
      <Tabs defaultValue="shops" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shops" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Shops
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Staff Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shops" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCreateOpen || !!editingShop} onOpenChange={(open) => {
              if (!open) {
                setIsCreateOpen(false);
                setEditingShop(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Shop
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingShop ? "Edit Shop" : "Create New Shop"}</DialogTitle>
                    <DialogDescription>
                      {editingShop ? "Update shop details" : "Add a new shop to your network"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Shop Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingShop ? "Update Shop" : "Create Shop"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Shops</CardTitle>
              <CardDescription>Overview of all shops in the network</CardDescription>
            </CardHeader>
            <CardContent>
              {shopsLoading ? (
                <div className="text-center py-8">Loading shops...</div>
              ) : shops.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No shops found. Create your first shop to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shops.map((shop) => {
                      const stats = getShopAnalytics(shop.id);
                      const staffCount = getStaffCount(shop.id);
                      return (
                        <TableRow key={shop.id}>
                          <TableCell className="font-medium">{shop.name}</TableCell>
                          <TableCell>{shop.location || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={shop.status === "active" ? "default" : "secondary"}>
                              {shop.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{staffCount}</TableCell>
                          <TableCell className="text-right">{formatCurrency(stats.sales)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(stats.profit)}</TableCell>
                          <TableCell>{format(new Date(shop.created_at), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(shop)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {shop.status === "active" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to deactivate this shop?")) {
                                      deleteMutation.mutate(shop.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <StaffManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
