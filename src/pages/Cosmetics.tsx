import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Plus, Search, Pencil, Trash2, Download, Filter, Replace, RotateCcw, X, Upload,
  ChevronDown, ChevronUp, AlertTriangle
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CosmeticDialog } from "@/components/CosmeticDialog";
import { CosmeticFindReplaceDialog } from "@/components/CosmeticFindReplaceDialog";
import { CosmeticImportDialog } from "@/components/CosmeticImportDialog";
import { useCosmeticCategories } from "@/hooks/useCosmeticCategories";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRealtimeInventory } from "@/hooks/useRealtimeInventory";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/exportUtils";
import { isExpired, isExpiringWithinDays } from "@/hooks/useFEFOSelection";

const Cosmetics = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCosmetic, setEditingCosmetic] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [batchWise, setBatchWise] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Filters
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSubcategory, setFilterSubcategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterRack, setFilterRack] = useState("all");
  const [filterStockStatus, setFilterStockStatus] = useState("all");
  
  const queryClient = useQueryClient();
  const { categories, subcategories, getCategoryName, getSubcategoryName, getSubcategories } = useCosmeticCategories();

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
      const { error } = await supabase.from("cosmetics").delete().eq("id", id);
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

  // Filter options
  const filterOptions = useMemo(() => {
    const all = cosmetics ?? [];
    return {
      brands: [...new Set(all.map(c => c.brand).filter(Boolean))].sort(),
      suppliers: [...new Set(all.map(c => c.supplier).filter(Boolean))].sort(),
      racks: [...new Set(all.map(c => c.rack_no).filter(Boolean))].sort(),
    };
  }, [cosmetics]);

  const filteredSubcategoryOptions = useMemo(() => {
    if (filterCategory === "all") return subcategories;
    return getSubcategories(filterCategory);
  }, [filterCategory, subcategories, getSubcategories]);

  const hasActiveFilters = filterCategory !== "all" || filterSubcategory !== "all" || filterBrand !== "all" || filterSupplier !== "all" || filterRack !== "all" || filterStockStatus !== "all";

  const resetFilters = () => {
    setFilterCategory("all");
    setFilterSubcategory("all");
    setFilterBrand("all");
    setFilterSupplier("all");
    setFilterRack("all");
    setFilterStockStatus("all");
  };

  const displayCosmetics = useMemo(() => {
    let result = cosmetics ?? [];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.product_name.toLowerCase().includes(q) ||
        c.batch_no.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        c.supplier.toLowerCase().includes(q)
      );
    }

    if (filterCategory !== "all") result = result.filter(c => (c as any).category_id === filterCategory);
    if (filterSubcategory !== "all") result = result.filter(c => (c as any).subcategory_id === filterSubcategory);
    if (filterBrand !== "all") result = result.filter(c => c.brand === filterBrand);
    if (filterSupplier !== "all") result = result.filter(c => c.supplier === filterSupplier);
    if (filterRack !== "all") result = result.filter(c => c.rack_no === filterRack);
    if (filterStockStatus !== "all") {
      result = result.filter(c => {
        const minStock = (c as any).minimum_stock ?? 10;
        if (filterStockStatus === "low") return c.quantity > 0 && c.quantity <= minStock;
        if (filterStockStatus === "out") return c.quantity === 0;
        if (filterStockStatus === "expiring") return !isExpired(c.expiry_date) && isExpiringWithinDays(c.expiry_date, 30);
        if (filterStockStatus === "expired") return isExpired(c.expiry_date);
        if (filterStockStatus === "warning") return !isExpired(c.expiry_date) && !isExpiringWithinDays(c.expiry_date, 30) && isExpiringWithinDays(c.expiry_date, 90);
        return true;
      });
    }

    return result;
  }, [cosmetics, searchQuery, filterCategory, filterSubcategory, filterBrand, filterSupplier, filterRack, filterStockStatus]);

  // Group cosmetics by product name for batch-wise view
  const groupedCosmetics = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const c of displayCosmetics) {
      const name = c.product_name.toLowerCase();
      const existing = groups.get(name) || [];
      existing.push(c);
      groups.set(name, existing);
    }
    // Sort batches within each group by expiry date
    groups.forEach((batches) => {
      batches.sort((a: any, b: any) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
    });
    return groups;
  }, [displayCosmetics]);

  const toggleGroup = (name: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(name)) newExpanded.delete(name);
    else newExpanded.add(name);
    setExpandedGroups(newExpanded);
  };

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

  const fetchAllCosmetics = async () => {
    const all: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from("cosmetics")
        .select("*")
        .order("product_name")
        .range(from, from + batchSize - 1);
      if (error) throw error;
      if (data && data.length > 0) {
        all.push(...data);
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }
    return all;
  };

  const handleExportExcel = async () => {
    toast.info("Fetching complete inventory...");
    try {
      const ExcelJS = await import("exceljs");
      const allCosmetics = await fetchAllCosmetics();
      if (!allCosmetics.length) { toast.error("No cosmetics found"); return; }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Cosmetics Inventory");
      
      worksheet.columns = [
        { header: "Product Name", key: "product_name", width: 30 },
        { header: "Category", key: "category", width: 20 },
        { header: "Sub Category", key: "subcategory", width: 25 },
        { header: "Brand", key: "brand", width: 20 },
        { header: "Batch No", key: "batch_no", width: 15 },
        { header: "Rack No", key: "rack_no", width: 10 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Minimum Stock", key: "minimum_stock", width: 14 },
        { header: "Purchase Price", key: "purchase_price", width: 15 },
        { header: "Selling Price", key: "selling_price", width: 15 },
        { header: "Manufacturing Date", key: "manufacturing_date", width: 18 },
        { header: "Expiry Date", key: "expiry_date", width: 18 },
        { header: "Supplier", key: "supplier", width: 20 },
        { header: "Status", key: "status", width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      allCosmetics.forEach((c) => {
        const minStock = (c as any).minimum_stock ?? 10;
        const expired = isExpired(c.expiry_date);
        const expSoon = !expired && isExpiringWithinDays(c.expiry_date, 30);
        const lowStock = c.quantity <= minStock;
        let status = "OK";
        if (expired) status = "Expired";
        else if (expSoon) status = "Expiring Soon";
        else if (lowStock) status = "Low Stock";

        worksheet.addRow({
          product_name: c.product_name,
          category: getCategoryName((c as any).category_id || ""),
          subcategory: getSubcategoryName((c as any).subcategory_id || ""),
          brand: c.brand,
          batch_no: c.batch_no,
          rack_no: c.rack_no,
          quantity: c.quantity,
          minimum_stock: minStock,
          purchase_price: Number(c.purchase_price),
          selling_price: Number(c.selling_price),
          manufacturing_date: c.manufacturing_date,
          expiry_date: c.expiry_date,
          supplier: c.supplier,
          status,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cosmetics-inventory.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${allCosmetics.length} cosmetics`);
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    }
  };

  const handleExportCSV = async () => {
    toast.info("Fetching complete inventory...");
    try {
      const allCosmetics = await fetchAllCosmetics();
      if (!allCosmetics.length) { toast.error("No cosmetics found"); return; }
      const data = allCosmetics.map((c) => {
        const minStock = (c as any).minimum_stock ?? 10;
        const expired = isExpired(c.expiry_date);
        const expSoon = !expired && isExpiringWithinDays(c.expiry_date, 30);
        const lowStock = c.quantity <= minStock;
        let status = "OK";
        if (expired) status = "Expired";
        else if (expSoon) status = "Expiring Soon";
        else if (lowStock) status = "Low Stock";

        return {
          "Product Name": c.product_name,
          "Category": getCategoryName((c as any).category_id || ""),
          "Sub Category": getSubcategoryName((c as any).subcategory_id || ""),
          "Brand": c.brand,
          "Batch No": c.batch_no,
          "Rack No": c.rack_no,
          "Quantity": c.quantity,
          "Minimum Stock": minStock,
          "Purchase Price": Number(c.purchase_price),
          "Selling Price": Number(c.selling_price),
          "Manufacturing Date": c.manufacturing_date,
          "Expiry Date": c.expiry_date,
          "Supplier": c.supplier,
          "Status": status,
        };
      });
      exportToCSV(data, "cosmetics-inventory");
      toast.success(`Exported ${allCosmetics.length} cosmetics`);
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const getRowClassName = (cosmetic: any) => {
    const minStock = (cosmetic as any).minimum_stock ?? 10;
    const expired = isExpired(cosmetic.expiry_date);
    const expSoon = !expired && isExpiringWithinDays(cosmetic.expiry_date, 30);
    const warning = !expired && !expSoon && isExpiringWithinDays(cosmetic.expiry_date, 90);
    const lowStock = cosmetic.quantity <= minStock;
    if (expired) return "bg-destructive/20 opacity-75";
    if (lowStock) return "bg-red-50 dark:bg-red-950/30";
    if (expSoon) return "bg-orange-50 dark:bg-orange-950/30";
    if (warning) return "bg-yellow-50 dark:bg-yellow-950/20";
    return "";
  };

  const getStatusBadges = (cosmetic: any) => {
    const minStock = (cosmetic as any).minimum_stock ?? 10;
    const expired = isExpired(cosmetic.expiry_date);
    const expSoon = !expired && isExpiringWithinDays(cosmetic.expiry_date, 30);
    const warning = !expired && !expSoon && isExpiringWithinDays(cosmetic.expiry_date, 90);
    const lowStock = cosmetic.quantity <= minStock;

    return (
      <>
        {expired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
        {expSoon && <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">Expiring Soon</Badge>}
        {warning && <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">Warning</Badge>}
        {lowStock && !expired && <Badge variant="outline" className="text-xs border-red-500 text-red-600">Low Stock</Badge>}
      </>
    );
  };

  const renderCosmeticRow = (cosmetic: any) => {
    const minStock = (cosmetic as any).minimum_stock ?? 10;
    const expired = isExpired(cosmetic.expiry_date);
    const expSoon = !expired && isExpiringWithinDays(cosmetic.expiry_date, 30);
    const lowStock = cosmetic.quantity <= minStock;

    return (
      <TableRow key={cosmetic.id} className={cn("transition-colors hover:bg-muted/50", getRowClassName(cosmetic))}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2 flex-wrap">
            {cosmetic.product_name}
            {getStatusBadges(cosmetic)}
          </div>
        </TableCell>
        <TableCell>{getCategoryName((cosmetic as any).category_id || "")}</TableCell>
        <TableCell>{getSubcategoryName((cosmetic as any).subcategory_id || "")}</TableCell>
        <TableCell>{cosmetic.brand}</TableCell>
        <TableCell>{cosmetic.batch_no}</TableCell>
        <TableCell>{cosmetic.rack_no}</TableCell>
        <TableCell>
          <span className={cn(lowStock && "text-destructive font-bold")}>
            {cosmetic.quantity}
          </span>
        </TableCell>
        <TableCell>{minStock}</TableCell>
        <TableCell>{formatCurrency(Number(cosmetic.purchase_price))}</TableCell>
        <TableCell>{formatCurrency(Number(cosmetic.selling_price))}</TableCell>
        <TableCell>
          <span className={cn(
            expired && "text-destructive font-bold",
            expSoon && "text-orange-600 font-semibold"
          )}>
            {format(new Date(cosmetic.expiry_date), "MMM dd, yyyy")}
          </span>
        </TableCell>
        <TableCell><span className="text-sm">{cosmetic.supplier || "—"}</span></TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(cosmetic)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(cosmetic.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const tableHeaders = (
    <TableRow>
      <TableHead>Product Name</TableHead>
      <TableHead>Category</TableHead>
      <TableHead>Sub Category</TableHead>
      <TableHead>Brand</TableHead>
      <TableHead>Batch No</TableHead>
      <TableHead>Rack No</TableHead>
      <TableHead>Quantity</TableHead>
      <TableHead>Min Stock</TableHead>
      <TableHead>Purchase Price</TableHead>
      <TableHead>Selling Price</TableHead>
      <TableHead>Expiry Date</TableHead>
      <TableHead>Supplier</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-foreground">Cosmetics Inventory</h2>
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportExcel}>Export to Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>Export to CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Cosmetic
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cosmetics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery("")}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Batch-wise toggle */}
        <div className="flex items-center gap-2">
          <Switch id="batch-wise-cosmetics" checked={batchWise} onCheckedChange={setBatchWise} />
          <Label htmlFor="batch-wise-cosmetics" className="text-sm cursor-pointer">Batch-wise</Label>
        </div>

        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
              {[filterCategory, filterSubcategory, filterBrand, filterSupplier, filterRack, filterStockStatus].filter(v => v !== "all").length}
            </Badge>
          )}
        </Button>

        <Button variant="outline" size="sm" onClick={() => setFindReplaceOpen(true)} className="gap-2">
          <Replace className="h-4 w-4" /> Find & Replace
        </Button>

        {searchQuery && (
          <Badge variant="secondary" className="text-sm">
            {displayCosmetics.length} results
          </Badge>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Category</span>
              <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setFilterSubcategory("all"); }}>
                <SelectTrigger className="h-9 w-[180px] text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Sub Category</span>
              <Select value={filterSubcategory} onValueChange={setFilterSubcategory}>
                <SelectTrigger className="h-9 w-[200px] text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub Categories</SelectItem>
                  {filteredSubcategoryOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Brand</span>
              <Select value={filterBrand} onValueChange={setFilterBrand}>
                <SelectTrigger className="h-9 w-[160px] text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {filterOptions.brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Supplier</span>
              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger className="h-9 w-[160px] text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {filterOptions.suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Rack</span>
              <Select value={filterRack} onValueChange={setFilterRack}>
                <SelectTrigger className="h-9 w-[120px] text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Racks</SelectItem>
                  {filterOptions.racks.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Stock</span>
              <Select value={filterStockStatus} onValueChange={setFilterStockStatus}>
                <SelectTrigger className="h-9 w-[160px] text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="expiring">Expiring Soon (30d)</SelectItem>
                  <SelectItem value="warning">Warning (90d)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-destructive hover:text-destructive">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              {tableHeaders}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : batchWise ? (
                // Batch-wise grouped view
                groupedCosmetics.size > 0 ? (
                  Array.from(groupedCosmetics.entries()).map(([name, batches]) => {
                    const isExpanded = expandedGroups.has(name);
                    const firstBatch = batches[0];
                    const totalQty = batches.reduce((sum: number, b: any) => sum + b.quantity, 0);
                    const hasLowStock = batches.some((b: any) => b.quantity <= ((b as any).minimum_stock ?? 10));
                    const hasExpired = batches.some((b: any) => isExpired(b.expiry_date));
                    const hasExpiringSoon = batches.some((b: any) => !isExpired(b.expiry_date) && isExpiringWithinDays(b.expiry_date, 30));

                    return (
                      <>{/* Group header row */}
                        <TableRow
                          key={`group-${name}`}
                          className={cn("cursor-pointer hover:bg-muted/50 bg-muted/20 font-medium")}
                          onClick={() => toggleGroup(name)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              <span className="font-semibold">{firstBatch.product_name}</span>
                              <Badge variant="secondary" className="text-xs">{batches.length} batch{batches.length > 1 ? "es" : ""}</Badge>
                              {hasExpired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                              {hasExpiringSoon && <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">Expiring Soon</Badge>}
                              {hasLowStock && !hasExpired && <Badge variant="outline" className="text-xs border-red-500 text-red-600">Low Stock</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{getCategoryName((firstBatch as any).category_id || "")}</TableCell>
                          <TableCell>{getSubcategoryName((firstBatch as any).subcategory_id || "")}</TableCell>
                          <TableCell>{firstBatch.brand}</TableCell>
                          <TableCell colSpan={2}>—</TableCell>
                          <TableCell className="font-bold">{totalQty}</TableCell>
                          <TableCell>—</TableCell>
                          <TableCell colSpan={5}>—</TableCell>
                        </TableRow>
                        {/* Expanded batch rows */}
                        {isExpanded && batches.map((cosmetic: any) => renderCosmeticRow(cosmetic))}
                      </>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-muted-foreground">No cosmetics found</TableCell>
                  </TableRow>
                )
              ) : displayCosmetics.length > 0 ? (
                displayCosmetics.map((cosmetic) => renderCosmeticRow(cosmetic))
              ) : (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground">
                    No cosmetics found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CosmeticDialog open={dialogOpen} onClose={handleDialogClose} cosmetic={editingCosmetic} />
      <CosmeticFindReplaceDialog open={findReplaceOpen} onClose={() => setFindReplaceOpen(false)} />
      <CosmeticImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
};

export default Cosmetics;
