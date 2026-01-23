import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, AlertTriangle, Camera, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { getSellingTypeLabel, getQuantityUnit } from "@/lib/medicineTypes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MedicineDialog } from "@/components/MedicineDialog";
import { ImageInventoryDialog } from "@/components/ImageInventoryDialog";
import { InvoiceInventoryDialog } from "@/components/InvoiceInventoryDialog";
import { toast } from "sonner";
import { format } from "date-fns";

const Medicines = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: medicines, isLoading } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .order("medicine_name");
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("medicines")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success("Medicine deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete medicine");
    },
  });

  const filteredMedicines = medicines?.filter((medicine) =>
    medicine.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    medicine.batch_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    medicine.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (medicine: any) => {
    setEditingMedicine(medicine);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this medicine?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingMedicine(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-foreground">Medicines Inventory</h2>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => setInvoiceDialogOpen(true)} 
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Import Invoice
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setImageDialogOpen(true)} 
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            Add via Image
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Medicine
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicines..."
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
              <TableHead>Medicine Name</TableHead>
              <TableHead>Batch No</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Rack No</TableHead>
              <TableHead>Selling Type</TableHead>
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
                <TableCell colSpan={10} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredMedicines && filteredMedicines.length > 0 ? (
              filteredMedicines.map((medicine) => {
                const medicineData = medicine as any;
                const sellingType = medicineData.selling_type || "per_tablet";
                const tabletsPerPacket = medicineData.tablets_per_packet || 1;
                const pricePerPacket = medicineData.price_per_packet;
                const isNarcotic = medicineData.is_narcotic || false;
                const quantityUnit = getQuantityUnit(sellingType);
                
                return (
                  <TableRow key={medicine.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {medicine.medicine_name}
                        {isNarcotic && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Narcotic
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{medicine.batch_no}</TableCell>
                    <TableCell>{medicine.company_name}</TableCell>
                    <TableCell>{medicine.rack_no}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {sellingType === "per_packet" ? (
                          <>
                            <span className="font-medium">Per Packet</span>
                            <span className="text-xs text-muted-foreground block">
                              {tabletsPerPacket} tablets/pack
                            </span>
                          </>
                        ) : (
                          <span>{getSellingTypeLabel(sellingType)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={medicine.quantity < 10 ? "text-warning font-bold" : ""}>
                        {medicine.quantity} {quantityUnit !== "Units" ? quantityUnit : ""}
                      </span>
                      {sellingType === "per_packet" && tabletsPerPacket > 0 && (
                        <span className="text-xs text-muted-foreground block">
                          ≈ {Math.floor(medicine.quantity / tabletsPerPacket)} packets
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(Number(medicine.purchase_price))}</TableCell>
                    <TableCell>
                      <div>
                        {sellingType === "per_packet" && pricePerPacket ? (
                          <>
                            <div>{formatCurrency(Number(pricePerPacket))}/pack</div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(Number(medicine.selling_price))}/tab
                            </div>
                          </>
                        ) : (
                          formatCurrency(Number(medicine.selling_price))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {medicine.expiry_date ? (
                        <span className={
                          new Date(medicine.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            ? "text-destructive font-bold"
                            : ""
                        }>
                          {format(new Date(medicine.expiry_date), "MMM dd, yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(medicine)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(medicine.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  No medicines found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <MedicineDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        medicine={editingMedicine}
      />

      <ImageInventoryDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
      />

      <InvoiceInventoryDialog
        open={invoiceDialogOpen}
        onClose={() => setInvoiceDialogOpen(false)}
      />
    </div>
  );
};

export default Medicines;
