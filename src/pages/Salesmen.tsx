import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SalesmanDialog } from "@/components/SalesmanDialog";
import { toast } from "sonner";
import { format } from "date-fns";

const Salesmen = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: salesmen, isLoading } = useQuery({
    queryKey: ["salesmen"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salesmen")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("salesmen")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesmen"] });
      toast.success("Salesman deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete salesman");
    },
  });

  const handleEdit = (salesman: any) => {
    setEditingSalesman(salesman);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this salesman?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingSalesman(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Salesmen Management</h2>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Salesman
        </Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>CNIC</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead>Assigned Counter</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : salesmen && salesmen.length > 0 ? (
              salesmen.map((salesman) => (
                <TableRow key={salesman.id}>
                  <TableCell className="font-medium">{salesman.name}</TableCell>
                  <TableCell>{salesman.contact}</TableCell>
                  <TableCell>{salesman.cnic}</TableCell>
                  <TableCell>{format(new Date(salesman.joining_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{salesman.assigned_counter}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(salesman)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(salesman.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No salesmen found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SalesmanDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        salesman={editingSalesman}
      />
    </div>
  );
};

export default Salesmen;
