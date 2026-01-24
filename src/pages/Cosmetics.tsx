import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CosmeticDialog } from "@/components/CosmeticDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRealtimeInventory } from "@/hooks/useRealtimeInventory";

const Cosmetics = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCosmetic, setEditingCosmetic] = useState<any>(null);
  const queryClient = useQueryClient();

  // Enable real-time sync for cosmetics
  useRealtimeInventory({
    tableName: 'cosmetics',
    queryKey: ['cosmetics'],
    showNotifications: true,
  });

  const { data: cosmetics, isLoading } = useQuery({
    queryKey: ["cosmetics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cosmetics")
        .select("*")
        .order("product_name");
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cosmetics")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
      toast.success("Cosmetic deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete cosmetic");
    },
  });

  const filteredCosmetics = cosmetics?.filter((cosmetic) =>
    cosmetic.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cosmetic.batch_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cosmetic.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (cosmetic: any) => {
    setEditingCosmetic(cosmetic);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this cosmetic?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingCosmetic(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Cosmetics Inventory</h2>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Cosmetic
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cosmetics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Batch No</TableHead>
              <TableHead>Rack No</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Purchase Price</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredCosmetics && filteredCosmetics.length > 0 ? (
              filteredCosmetics.map((cosmetic) => (
                <TableRow key={cosmetic.id}>
                  <TableCell className="font-medium">{cosmetic.product_name}</TableCell>
                  <TableCell>{cosmetic.brand}</TableCell>
                  <TableCell>{cosmetic.batch_no}</TableCell>
                  <TableCell>{cosmetic.rack_no}</TableCell>
                  <TableCell>
                    <span className={cosmetic.quantity < 10 ? "text-warning font-bold" : ""}>
                      {cosmetic.quantity}
                    </span>
                  </TableCell>
                  <TableCell>{formatCurrency(Number(cosmetic.purchase_price))}</TableCell>
                  <TableCell>{formatCurrency(Number(cosmetic.selling_price))}</TableCell>
                  <TableCell>
                    <span className={
                      new Date(cosmetic.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        ? "text-destructive font-bold"
                        : ""
                    }>
                      {format(new Date(cosmetic.expiry_date), "MMM dd, yyyy")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(cosmetic)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cosmetic.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No cosmetics found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CosmeticDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        cosmetic={editingCosmetic}
      />
    </div>
  );
};

export default Cosmetics;
