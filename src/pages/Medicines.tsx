import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePaginatedMedicines } from "@/hooks/usePaginatedMedicines";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, Search, Pencil, Trash2, AlertTriangle, Camera, FileText, 
  Download, Printer, ChevronDown, ChevronUp, MoreVertical 
} from "lucide-react";
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
import { BulkActionsDialog } from "@/components/BulkActionsDialog";
import { MedicineCard } from "@/components/MedicineCard";
import { toast } from "sonner";
import { format } from "date-fns";
import { isExpired, isExpiringWithinDays, groupMedicinesByName } from "@/hooks/useFEFOSelection";
import { exportToCSV, exportToExcel, exportToPDF, printStockList } from "@/lib/exportUtils";
import { usePharmacySettings } from "@/hooks/usePharmacySettings";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRealtimeInventory } from "@/hooks/useRealtimeInventory";
import { useShop } from "@/hooks/useShop";

const LOW_STOCK_THRESHOLD = 10;

const Medicines = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [bulkActionType, setBulkActionType] = useState<"delete" | "selling_price" | "rack_no" | "expiry_date" | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  const queryClient = useQueryClient();
  const { settings: pharmacySettings } = usePharmacySettings();
  const isMobile = useIsMobile();
  const { currentShop } = useShop();

  // Paginated medicine data
  const {
    medicines,
    isLoading,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
  } = usePaginatedMedicines({ pageSize: 50 });

  // Enable real-time sync for medicines (invalidates paginated queries)
  useRealtimeInventory({
    tableName: 'medicines',
    queryKey: ['medicines'],
    showNotifications: true,
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
      queryClient.invalidateQueries({ queryKey: ["medicines-count"] });
      toast.success("Medicine deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete medicine");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("medicines")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["medicines-count"] });
      setSelectedIds(new Set());
      toast.success("Selected medicines deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete selected medicines");
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("medicines")
        .update(updates)
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      setSelectedIds(new Set());
      toast.success("Selected medicines updated successfully");
    },
    onError: () => {
      toast.error("Failed to update selected medicines");
    },
  });

  // Group medicines by name
  const groupedMedicines = useMemo(() => {
    if (!medicines) return new Map();
    return groupMedicinesByName(medicines);
  }, [medicines]);

  // Filter medicines based on search (search by name, batch, company, or barcode)
  const filteredMedicines = useMemo(() => {
    if (!medicines) return [];
    const query = searchQuery.toLowerCase();
    return medicines.filter((medicine) =>
      medicine.medicine_name.toLowerCase().includes(query) ||
      medicine.batch_no.toLowerCase().includes(query) ||
      medicine.company_name.toLowerCase().includes(query) ||
      (medicine.barcode && medicine.barcode.toLowerCase().includes(query))
    );
  }, [medicines, searchQuery]);

  // Get unique medicine names from filtered results
  const uniqueFilteredNames = useMemo(() => {
    const names = new Set<string>();
    filteredMedicines.forEach((m) => names.add(m.medicine_name.toLowerCase()));
    return names;
  }, [filteredMedicines]);

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

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMedicines.filter(m => !isExpired(m.expiry_date)).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(
        filteredMedicines
          .filter(m => !isExpired(m.expiry_date))
          .map(m => m.id)
      ));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleGroup = (name: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedGroups(newExpanded);
  };

  const handleBulkAction = async (value?: string | number) => {
    if (selectedIds.size === 0) return;
    
    setBulkActionLoading(true);
    const ids = Array.from(selectedIds);
    
    try {
      if (bulkActionType === "delete") {
        await bulkDeleteMutation.mutateAsync(ids);
      } else if (bulkActionType === "selling_price" && typeof value === "number") {
        await bulkUpdateMutation.mutateAsync({ ids, updates: { selling_price: value } });
      } else if (bulkActionType === "rack_no" && typeof value === "string") {
        await bulkUpdateMutation.mutateAsync({ ids, updates: { rack_no: value } });
      } else if (bulkActionType === "expiry_date" && typeof value === "string") {
        await bulkUpdateMutation.mutateAsync({ ids, updates: { expiry_date: value } });
      }
    } finally {
      setBulkActionLoading(false);
      setBulkActionType(null);
    }
  };

  const handleExportExcel = () => {
    if (!filteredMedicines.length) return;
    const exportData = filteredMedicines.map(m => ({
      "Medicine Name": m.medicine_name,
      "Batch No": m.batch_no,
      "Company": m.company_name,
      "Quantity": m.quantity,
      "Rack No": m.rack_no,
      "Selling Price": m.selling_price,
      "Purchase Price": m.purchase_price,
      "Expiry Date": m.expiry_date ? format(new Date(m.expiry_date), "yyyy-MM-dd") : "N/A",
      "Supplier": m.supplier,
      "Barcode": m.barcode || "",
      "Last Updated": m.updated_at ? format(new Date(m.updated_at), "yyyy-MM-dd HH:mm") : "",
    }));
    exportToExcel(exportData, "medicines-inventory");
    toast.success("Excel export started");
  };

  const handleExportPDF = () => {
    if (!filteredMedicines.length) return;
    const exportData = filteredMedicines.map(m => ({
      "Name": m.medicine_name,
      "Batch": m.batch_no,
      "Qty": m.quantity,
      "Rack": m.rack_no,
      "Price": formatCurrency(Number(m.selling_price)),
      "Expiry": m.expiry_date ? format(new Date(m.expiry_date), "MMM dd, yyyy") : "N/A",
    }));
    exportToPDF(exportData, "Medicines Inventory", "medicines-inventory");
  };

  const handlePrintStockList = () => {
    if (!filteredMedicines.length) return;
    printStockList(
      filteredMedicines,
      pharmacySettings?.pharmacy_name || "Pharmacy",
      "Stock List"
    );
  };

  const getRowClassName = (medicine: any) => {
    const expired = isExpired(medicine.expiry_date);
    const expiringSoon = !expired && isExpiringWithinDays(medicine.expiry_date, 60);
    const lowStock = medicine.quantity <= LOW_STOCK_THRESHOLD;

    if (expired) return "bg-destructive/20 opacity-75";
    if (lowStock) return "bg-red-50 dark:bg-red-950/30";
    if (expiringSoon) return "bg-orange-50 dark:bg-orange-950/30";
    return "";
  };

  // Render mobile view with cards
  if (isMobile) {
    return (
      <div className="space-y-4 pb-20">
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-foreground">Medicines Inventory</h2>
          <div className="flex gap-2 flex-wrap">
            <Button 
              size="sm"
              variant="outline" 
              onClick={() => setInvoiceDialogOpen(true)} 
              className="gap-1"
            >
              <FileText className="h-4 w-4" />
              Import
            </Button>
            <Button 
              size="sm"
              variant="outline" 
              onClick={() => setImageDialogOpen(true)} 
              className="gap-1"
            >
              <Camera className="h-4 w-4" />
              Image
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, batch, barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <span className="text-sm">{selectedIds.size} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  Bulk Actions <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setBulkActionType("delete")}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setBulkActionType("selling_price")}>
                  Update Selling Price
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulkActionType("rack_no")}>
                  Update Rack No
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulkActionType("expiry_date")}>
                  Update Expiry Date
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredMedicines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No medicines found</div>
          ) : (
            filteredMedicines.map((medicine) => (
              <MedicineCard
                key={medicine.id}
                medicine={medicine}
                isSelected={selectedIds.has(medicine.id)}
                onSelect={(checked) => {
                  if (checked) {
                    toggleSelect(medicine.id);
                  } else {
                    toggleSelect(medicine.id);
                  }
                }}
                onEdit={() => handleEdit(medicine)}
                onDelete={() => handleDelete(medicine.id)}
                lowStockThreshold={LOW_STOCK_THRESHOLD}
              />
            ))
          )}
        </div>

        {/* Mobile pagination */}
        {totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        )}
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
        <BulkActionsDialog
          open={bulkActionType !== null}
          onClose={() => setBulkActionType(null)}
          actionType={bulkActionType}
          selectedCount={selectedIds.size}
          onConfirm={handleBulkAction}
          isLoading={bulkActionLoading}
        />
      </div>
    );
  }

  // Desktop view with table
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-foreground">Medicines Inventory</h2>
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportExcel}>
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                Export to PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrintStockList}>
                <Printer className="mr-2 h-4 w-4" /> Print Stock List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, batch, company, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Actions <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setBulkActionType("delete")}>
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete Selected
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setBulkActionType("selling_price")}>
                  Update Selling Price
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulkActionType("rack_no")}>
                  Update Rack No
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulkActionType("expiry_date")}>
                  Update Expiry Date
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === filteredMedicines.filter(m => !isExpired(m.expiry_date)).length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Medicine Name</TableHead>
                <TableHead>Batch No</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Rack No</TableHead>
                <TableHead>Selling Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center">
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
                  const expired = isExpired(medicine.expiry_date);
                  const expiringSoon = !expired && isExpiringWithinDays(medicine.expiry_date, 60);
                  const lowStock = medicine.quantity <= LOW_STOCK_THRESHOLD;
                  
                  return (
                    <TableRow 
                      key={medicine.id} 
                      className={cn(
                        "transition-colors hover:bg-muted/50",
                        getRowClassName(medicine)
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(medicine.id)}
                          onCheckedChange={() => toggleSelect(medicine.id)}
                          disabled={expired}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          {medicine.medicine_name}
                          {isNarcotic && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Narcotic
                            </Badge>
                          )}
                          {expired && (
                            <Badge variant="destructive" className="text-xs">Expired</Badge>
                          )}
                          {expiringSoon && (
                            <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                              Expiring Soon
                            </Badge>
                          )}
                          {lowStock && !expired && (
                            <Badge variant="outline" className="text-xs border-red-500 text-red-600">
                              Low Stock
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
                        <span className={cn(
                          lowStock && "text-destructive font-bold"
                        )}>
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
                          <span className={cn(
                            expired && "text-destructive font-bold",
                            expiringSoon && "text-orange-600 font-semibold"
                          )}>
                            {format(new Date(medicine.expiry_date), "MMM dd, yyyy")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{medicine.supplier || "—"}</span>
                      </TableCell>
                      <TableCell>
                        {medicine.updated_at ? (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(medicine.updated_at), "MMM dd, HH:mm")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(medicine)}
                            disabled={expired}
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
                  <TableCell colSpan={13} className="text-center text-muted-foreground">
                    No medicines found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Desktop pagination */}
      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
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

      <BulkActionsDialog
        open={bulkActionType !== null}
        onClose={() => setBulkActionType(null)}
        actionType={bulkActionType}
        selectedCount={selectedIds.size}
        onConfirm={handleBulkAction}
        isLoading={bulkActionLoading}
      />
    </div>
  );
};

export default Medicines;