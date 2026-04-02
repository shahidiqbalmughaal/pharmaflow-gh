import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, Pencil, Trash2, Download, Filter, Replace, RotateCcw, X,
  ChevronDown, ChevronUp, AlertTriangle, Camera, FileText, Printer, Upload
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { getSellingTypeLabel, getQuantityUnit } from "@/lib/medicineTypes";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductDialog } from "@/components/ProductDialog";
import { FindReplaceDialog } from "@/components/FindReplaceDialog";
import { CosmeticFindReplaceDialog } from "@/components/CosmeticFindReplaceDialog";
import { ImageInventoryDialog } from "@/components/ImageInventoryDialog";
import { InvoiceInventoryDialog } from "@/components/InvoiceInventoryDialog";
import { CosmeticImportDialog } from "@/components/CosmeticImportDialog";
import { BulkActionsDialog } from "@/components/BulkActionsDialog";
import { Pagination } from "@/components/Pagination";
import { useCosmeticCategories } from "@/hooks/useCosmeticCategories";
import { useRealtimeInventory } from "@/hooks/useRealtimeInventory";
import { usePharmacySettings } from "@/hooks/usePharmacySettings";
import { useShop } from "@/hooks/useShop";
import { toast } from "sonner";
import { format } from "date-fns";
import { isExpired, isExpiringWithinDays } from "@/hooks/useFEFOSelection";
import { exportToCSV, exportMedicineInventoryToExcel, exportToPDF, printStockList } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";
import { normalizeMedicine, normalizeCosmetic, type UnifiedProduct } from "@/lib/productTypes";
import { getProductTypeLabel, type ProductType } from "@/lib/productCategories";

const LOW_STOCK_THRESHOLD = 10;

type ProductTab = 'all' | 'medicine' | 'cosmetic' | 'herbal_medicine';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("type") as ProductTab) || "all";
  
  const [activeTab, setActiveTab] = useState<ProductTab>(initialTab);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDefaultType, setDialogDefaultType] = useState<ProductType>('medicine');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [showFilters, setShowFilters] = useState(false);
  const [batchWise, setBatchWise] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionType, setBulkActionType] = useState<"delete" | "selling_price" | "rack_no" | "expiry_date" | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [cosmeticFindReplaceOpen, setCosmeticFindReplaceOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Filters
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterRack, setFilterRack] = useState("all");
  const [filterSellingType, setFilterSellingType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterStockStatus, setFilterStockStatus] = useState("all");

  const queryClient = useQueryClient();
  const { settings: pharmacySettings } = usePharmacySettings();
  const { currentShop } = useShop();
  const { categories, getSubcategories, getCategoryName, getSubcategoryName } = useCosmeticCategories();

  // Debounce search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [searchQuery]);

  // Pagination state for medicines
  const [medPage, setMedPage] = useState(1);
  const [medPageSize, setMedPageSize] = useState(50);

  // Realtime
  useRealtimeInventory({ tableName: 'medicines', queryKey: ['products-medicines'], showNotifications: true });
  useRealtimeInventory({ tableName: 'cosmetics', queryKey: ['products-cosmetics'], showNotifications: true });

  // Query medicines
  const { data: medicinesCount } = useQuery({
    queryKey: ['products-medicines-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('medicines').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const medTotalPages = Math.max(1, Math.ceil((medicinesCount || 0) / medPageSize));

  const { data: medicines, isLoading: medLoading } = useQuery({
    queryKey: ['products-medicines', medPage, medPageSize],
    queryFn: async () => {
      const from = (medPage - 1) * medPageSize;
      const to = from + medPageSize - 1;
      const { data, error } = await supabase.from('medicines').select('*').order('medicine_name').range(from, to);
      if (error) throw error;
      return data || [];
    },
  });

  // Search medicines globally
  const { data: medSearchResults } = useQuery({
    queryKey: ['products-med-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim()) return [];
      const q = debouncedSearch.toLowerCase();
      const { data, error } = await supabase.from('medicines').select('*')
        .or(`medicine_name.ilike.%${q}%,batch_no.ilike.%${q}%,company_name.ilike.%${q}%,barcode.ilike.%${q}%`)
        .order('medicine_name').limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: debouncedSearch.trim().length > 0,
    staleTime: 30000,
  });

  // Query cosmetics  
  const { data: cosmetics, isLoading: cosLoading } = useQuery({
    queryKey: ['products-cosmetics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cosmetics').select('*').order('product_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Filter options from full database
  const { data: filterOptions } = useQuery({
    queryKey: ['products-filter-options', activeTab],
    queryFn: async () => {
      const [medRes, cosRes] = await Promise.all([
        supabase.from('medicines').select('company_name, supplier, rack_no, selling_type'),
        supabase.from('cosmetics').select('supplier, rack_no, brand'),
      ]);
      const meds = medRes.data ?? [];
      const cos = cosRes.data ?? [];
      return {
        companies: [...new Set(meds.map(m => m.company_name).filter(Boolean))].sort(),
        suppliers: [...new Set([...meds.map(m => m.supplier), ...cos.map(c => c.supplier)].filter(Boolean))].sort(),
        racks: [...new Set([...meds.map(m => m.rack_no), ...cos.map(c => c.rack_no)].filter(Boolean))].sort(),
        types: [...new Set(meds.map(m => (m as any).selling_type || "per_tablet").filter(Boolean))].sort(),
        brands: [...new Set(cos.map(c => c.brand).filter(Boolean))].sort(),
      };
    },
    staleTime: 60000,
  });

  const safeFilterOpts = filterOptions ?? { companies: [], suppliers: [], racks: [], types: [], brands: [] };

  const isSearching = debouncedSearch.trim().length > 0;
  const isLoading = medLoading || cosLoading;

  // Normalize and merge products
  const unifiedProducts = useMemo(() => {
    const isSearch = isSearching;
    const medSource = isSearch ? (medSearchResults ?? []) : (medicines ?? []);
    const cosSource = cosmetics ?? [];

    // Apply client-side search for cosmetics
    let filteredCos = cosSource;
    if (isSearch) {
      const q = debouncedSearch.toLowerCase();
      filteredCos = cosSource.filter(c =>
        c.product_name.toLowerCase().includes(q) ||
        c.batch_no.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        c.supplier.toLowerCase().includes(q)
      );
    }

    const normalizedMeds = medSource.map(normalizeMedicine);
    const normalizedCos = filteredCos.map(normalizeCosmetic);

    let result: UnifiedProduct[] = [];
    if (activeTab === 'medicine') result = normalizedMeds.filter(m => m.product_type === 'medicine');
    else if (activeTab === 'herbal_medicine') result = normalizedMeds.filter(m => m.product_type === 'herbal_medicine');
    else if (activeTab === 'cosmetic') result = normalizedCos;
    else result = [...normalizedMeds, ...normalizedCos];

    // Apply filters
    if (filterCompany !== "all") result = result.filter(p => p.company_name === filterCompany);
    if (filterSupplier !== "all") result = result.filter(p => p.supplier === filterSupplier);
    if (filterRack !== "all") result = result.filter(p => p.rack_no === filterRack);
    if (filterSellingType !== "all") result = result.filter(p => (p.selling_type || "per_tablet") === filterSellingType);
    if (filterCategory !== "all") result = result.filter(p => p.category_id === filterCategory);
    if (filterBrand !== "all") result = result.filter(p => p.brand === filterBrand);
    if (filterStockStatus !== "all") {
      result = result.filter(p => {
        const minStock = p.minimum_stock ?? LOW_STOCK_THRESHOLD;
        if (filterStockStatus === "low") return p.quantity > 0 && p.quantity <= minStock;
        if (filterStockStatus === "out") return p.quantity === 0;
        if (filterStockStatus === "expiring") return !isExpired(p.expiry_date) && isExpiringWithinDays(p.expiry_date, 60);
        if (filterStockStatus === "expired") return isExpired(p.expiry_date);
        return true;
      });
    }

    // Sort by name
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [medicines, cosmetics, medSearchResults, debouncedSearch, isSearching, activeTab, filterCompany, filterSupplier, filterRack, filterSellingType, filterCategory, filterBrand, filterStockStatus]);

  // Grouped view
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, UnifiedProduct[]>();
    for (const p of unifiedProducts) {
      const key = p.name.toLowerCase();
      const existing = groups.get(key) || [];
      existing.push(p);
      groups.set(key, existing);
    }
    groups.forEach((batches) => {
      batches.sort((a, b) => {
        const aDate = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
        const bDate = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
        return aDate - bDate;
      });
    });
    return groups;
  }, [unifiedProducts]);

  const hasActiveFilters = filterCompany !== "all" || filterSupplier !== "all" || filterRack !== "all" || filterSellingType !== "all" || filterCategory !== "all" || filterBrand !== "all" || filterStockStatus !== "all";

  const resetFilters = () => {
    setFilterCompany("all");
    setFilterSupplier("all");
    setFilterRack("all");
    setFilterSellingType("all");
    setFilterCategory("all");
    setFilterBrand("all");
    setFilterStockStatus("all");
  };

  // Mutations
  const deleteMedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("medicines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-medicines"] });
      queryClient.invalidateQueries({ queryKey: ["products-medicines-count"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success("Medicine deleted successfully");
    },
  });

  const deleteCosMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cosmetics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-cosmetics"] });
      queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
      toast.success("Cosmetic deleted successfully");
    },
  });

  const bulkDeleteMedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("medicines").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-medicines"] });
      queryClient.invalidateQueries({ queryKey: ["products-medicines-count"] });
      setSelectedIds(new Set());
      toast.success("Selected items deleted");
    },
  });

  const bulkUpdateMedMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Record<string, any> }) => {
      const { error } = await supabase.from("medicines").update(updates).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-medicines"] });
      setSelectedIds(new Set());
      toast.success("Selected items updated");
    },
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ProductTab);
    setSelectedIds(new Set());
    setSearchParams(tab === 'all' ? {} : { type: tab });
  };

  const handleEdit = (product: UnifiedProduct) => {
    // Find the original record
    if (product.product_type === 'medicine') {
      const original = (isSearching ? medSearchResults : medicines)?.find(m => m.id === product.id);
      if (original) {
        setEditingProduct({ ...original, _product_type: 'medicine' });
        setDialogDefaultType('medicine');
        setDialogOpen(true);
      }
    } else {
      const original = cosmetics?.find(c => c.id === product.id);
      if (original) {
        setEditingProduct({ ...original, _product_type: 'cosmetic' });
        setDialogDefaultType('cosmetic');
        setDialogOpen(true);
      }
    }
  };

  const handleDelete = (product: UnifiedProduct) => {
    const label = product.product_type === 'medicine' ? 'medicine' : 'cosmetic';
    if (confirm(`Are you sure you want to delete this ${label}?`)) {
      if (product.product_type === 'medicine') {
        deleteMedMutation.mutate(product.id);
      } else {
        deleteCosMutation.mutate(product.id);
      }
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingProduct(null);
  };

  const handleAddNew = (type?: 'medicine' | 'cosmetic') => {
    setEditingProduct(null);
    setDialogDefaultType(type || (activeTab === 'cosmetic' ? 'cosmetic' : 'medicine'));
    setDialogOpen(true);
  };

  const toggleSelect = (id: string) => {
    const newSel = new Set(selectedIds);
    if (newSel.has(id)) newSel.delete(id); else newSel.add(id);
    setSelectedIds(newSel);
  };

  const toggleSelectAll = () => {
    const selectable = unifiedProducts.filter(p => !isExpired(p.expiry_date));
    if (selectedIds.size === selectable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable.map(p => p.id)));
    }
  };

  const toggleGroup = (name: string) => {
    const n = new Set(expandedGroups);
    if (n.has(name)) n.delete(name); else n.add(name);
    setExpandedGroups(n);
  };

  const handleBulkAction = async (value?: string | number) => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    const ids = Array.from(selectedIds);
    try {
      if (bulkActionType === "delete") {
        // Only medicines support bulk operations currently
        await bulkDeleteMedMutation.mutateAsync(ids);
      } else if (bulkActionType === "selling_price" && typeof value === "number") {
        await bulkUpdateMedMutation.mutateAsync({ ids, updates: { selling_price: value } });
      } else if (bulkActionType === "rack_no" && typeof value === "string") {
        await bulkUpdateMedMutation.mutateAsync({ ids, updates: { rack_no: value } });
      } else if (bulkActionType === "expiry_date" && typeof value === "string") {
        await bulkUpdateMedMutation.mutateAsync({ ids, updates: { expiry_date: value } });
      }
    } finally {
      setBulkActionLoading(false);
      setBulkActionType(null);
    }
  };

  // Export helpers
  const fetchAllMedicines = async () => {
    const all: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase.from("medicines").select("*").order("medicine_name").range(from, from + batchSize - 1);
      if (error) throw error;
      if (data && data.length > 0) { all.push(...data); from += batchSize; hasMore = data.length === batchSize; } else { hasMore = false; }
    }
    return all;
  };

  const handleExportExcel = async () => {
    toast.info("Fetching complete inventory...");
    try {
      const allMeds = await fetchAllMedicines();
      if (!allMeds.length) { toast.error("No medicines found"); return; }
      await exportMedicineInventoryToExcel(allMeds, "medicines-complete-inventory", LOW_STOCK_THRESHOLD);
      toast.success(`Exported ${allMeds.length} medicines`);
    } catch { toast.error("Export failed"); }
  };

  const handleExportPDF = async () => {
    toast.info("Fetching complete inventory...");
    try {
      const allMeds = await fetchAllMedicines();
      if (!allMeds.length) { toast.error("No medicines found"); return; }
      const exportData = allMeds.map(m => ({
        "Name": m.medicine_name, "Batch": m.batch_no, "Qty": m.quantity,
        "Rack": m.rack_no, "Price": formatCurrency(Number(m.selling_price)),
        "Expiry": m.expiry_date ? format(new Date(m.expiry_date), "MMM dd, yyyy") : "N/A",
      }));
      exportToPDF(exportData, "Medicines Inventory", "medicines-complete-inventory");
    } catch { toast.error("Export failed"); }
  };

  const handlePrintStockList = async () => {
    toast.info("Fetching complete inventory...");
    try {
      const allMeds = await fetchAllMedicines();
      if (!allMeds.length) { toast.error("No medicines found"); return; }
      printStockList(allMeds, pharmacySettings?.pharmacy_name || "Pharmacy", "Stock List");
    } catch { toast.error("Print failed"); }
  };

  const getRowClassName = (p: UnifiedProduct) => {
    const minStock = p.minimum_stock ?? LOW_STOCK_THRESHOLD;
    const expired = isExpired(p.expiry_date);
    const expSoon = !expired && isExpiringWithinDays(p.expiry_date, 60);
    const lowStock = p.quantity <= minStock;
    if (expired) return "bg-destructive/20 opacity-75";
    if (lowStock) return "bg-red-50 dark:bg-red-950/30";
    if (expSoon) return "bg-orange-50 dark:bg-orange-950/30";
    return "";
  };

  const getStatusBadges = (p: UnifiedProduct) => {
    const minStock = p.minimum_stock ?? LOW_STOCK_THRESHOLD;
    const expired = isExpired(p.expiry_date);
    const expSoon = !expired && isExpiringWithinDays(p.expiry_date, 30);
    const lowStock = p.quantity <= minStock;
    return (
      <>
        {p.is_narcotic && <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Narcotic</Badge>}
        {expired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
        {expSoon && <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">Expiring Soon</Badge>}
        {lowStock && !expired && <Badge variant="outline" className="text-xs border-red-500 text-red-600">Low Stock</Badge>}
      </>
    );
  };

  const renderProductRow = (p: UnifiedProduct) => {
    const expired = isExpired(p.expiry_date);
    return (
      <TableRow key={`${p.product_type}-${p.id}`} className={cn("transition-colors hover:bg-muted/50", getRowClassName(p))}>
        <TableCell>
          <Checkbox
            checked={selectedIds.has(p.id)}
            onCheckedChange={() => toggleSelect(p.id)}
            disabled={expired}
          />
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2 flex-wrap">
            {p.name}
            {getStatusBadges(p)}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={p.product_type === 'medicine' ? 'default' : 'secondary'} className="text-xs">
            {p.product_type === 'medicine' ? 'Medicine' : 'Cosmetic'}
          </Badge>
        </TableCell>
        <TableCell>{p.batch_no}</TableCell>
        <TableCell>{p.product_type === 'medicine' ? p.company_name : (p.brand || '—')}</TableCell>
        <TableCell>{p.rack_no}</TableCell>
        <TableCell>
          <span className={cn(p.quantity <= (p.minimum_stock ?? LOW_STOCK_THRESHOLD) && "text-destructive font-bold")}>
            {p.quantity}
          </span>
        </TableCell>
        <TableCell>{formatCurrency(p.purchase_price)}</TableCell>
        <TableCell>{formatCurrency(p.selling_price)}</TableCell>
        <TableCell>
          {p.expiry_date ? (
            <span className={cn(
              expired && "text-destructive font-bold",
              !expired && isExpiringWithinDays(p.expiry_date, 30) && "text-orange-600 font-semibold"
            )}>
              {format(new Date(p.expiry_date), "MMM dd, yyyy")}
            </span>
          ) : <span className="text-muted-foreground text-sm">N/A</span>}
        </TableCell>
        <TableCell><span className="text-sm">{p.supplier || "—"}</span></TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} disabled={expired}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(p)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-foreground">Products Inventory</h2>
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportExcel}>Export Medicines to Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>Export Medicines to PDF</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrintStockList}><Printer className="mr-2 h-4 w-4" /> Print Stock List</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setInvoiceDialogOpen(true)} className="gap-2">
            <FileText className="h-4 w-4" /> Import Invoice
          </Button>
          <Button variant="outline" onClick={() => setImageDialogOpen(true)} className="gap-2">
            <Camera className="h-4 w-4" /> Add via Image
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Import Cosmetics
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleAddNew('medicine')}>Add Medicine</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddNew('cosmetic')}>Add Cosmetic</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All Products</TabsTrigger>
          <TabsTrigger value="medicine">Medicines</TabsTrigger>
          <TabsTrigger value="cosmetic">Cosmetics</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search & Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7" onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Switch id="batch-wise" checked={batchWise} onCheckedChange={setBatchWise} />
          <Label htmlFor="batch-wise" className="text-sm cursor-pointer">Batch-wise</Label>
        </div>

        <Button variant={showFilters ? "secondary" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <Filter className="h-4 w-4" /> Filters
          {hasActiveFilters && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">{[filterCompany, filterSupplier, filterRack, filterSellingType, filterCategory, filterBrand, filterStockStatus].filter(v => v !== "all").length}</Badge>}
        </Button>

        {(activeTab === 'all' || activeTab === 'medicine') && (
          <Button variant="outline" size="sm" onClick={() => setFindReplaceOpen(true)} className="gap-2">
            <Replace className="h-4 w-4" /> Find & Replace (Med)
          </Button>
        )}
        {(activeTab === 'all' || activeTab === 'cosmetic') && (
          <Button variant="outline" size="sm" onClick={() => setCosmeticFindReplaceOpen(true)} className="gap-2">
            <Replace className="h-4 w-4" /> Find & Replace (Cos)
          </Button>
        )}

        {isSearching && (
          <Badge variant="secondary" className="text-sm">{unifiedProducts.length} results</Badge>
        )}

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Bulk Actions <ChevronDown className="ml-1 h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setBulkActionType("delete")}><Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete Selected</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setBulkActionType("selling_price")}>Update Selling Price</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulkActionType("rack_no")}>Update Rack No</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulkActionType("expiry_date")}>Update Expiry Date</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {(activeTab === 'all' || activeTab === 'medicine') && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Company</span>
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger className="h-9 w-[180px] text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {safeFilterOpts.companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Supplier</span>
              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger className="h-9 w-[180px] text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {safeFilterOpts.suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Rack</span>
              <Select value={filterRack} onValueChange={setFilterRack}>
                <SelectTrigger className="h-9 w-[120px] text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Racks</SelectItem>
                  {safeFilterOpts.racks.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {(activeTab === 'all' || activeTab === 'medicine') && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Selling Type</span>
                <Select value={filterSellingType} onValueChange={setFilterSellingType}>
                  <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {safeFilterOpts.types.map(t => <SelectItem key={t} value={t}>{getSellingTypeLabel(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'cosmetic') && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Category</span>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-9 w-[160px] text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Brand</span>
                  <Select value={filterBrand} onValueChange={setFilterBrand}>
                    <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {safeFilterOpts.brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Stock</span>
              <Select value={filterStockStatus} onValueChange={setFilterStockStatus}>
                <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
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

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <div className="overflow-auto max-h-[calc(100vh-320px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === unifiedProducts.filter(p => !isExpired(p.expiry_date)).length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Batch No</TableHead>
                <TableHead>Company / Brand</TableHead>
                <TableHead>Rack No</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : batchWise && unifiedProducts.length > 0 ? (
                Array.from(groupedProducts.entries()).map(([name, batches]) => {
                  const isExpanded = expandedGroups.has(name);
                  const first = batches[0];
                  const totalQty = batches.reduce((sum, b) => sum + b.quantity, 0);
                  const hasExp = batches.some(b => isExpired(b.expiry_date));
                  const hasExpSoon = batches.some(b => !isExpired(b.expiry_date) && isExpiringWithinDays(b.expiry_date, 30));
                  const hasLow = batches.some(b => b.quantity <= (b.minimum_stock ?? LOW_STOCK_THRESHOLD));
                  const mixedTypes = new Set(batches.map(b => b.product_type)).size > 1;

                  return (
                    <>{/* Group header */}
                      <TableRow
                        key={`group-${name}`}
                        className="cursor-pointer hover:bg-muted/50 bg-muted/20 font-medium"
                        onClick={() => toggleGroup(name)}
                      >
                        <TableCell><Checkbox disabled /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="font-semibold">{first.name}</span>
                            <Badge variant="secondary" className="text-xs">{batches.length} batch{batches.length > 1 ? "es" : ""}</Badge>
                            {hasExp && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                            {hasExpSoon && <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">Expiring Soon</Badge>}
                            {hasLow && !hasExp && <Badge variant="outline" className="text-xs border-red-500 text-red-600">Low Stock</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {mixedTypes ? <Badge variant="outline" className="text-xs">Mixed</Badge> :
                            <Badge variant={first.product_type === 'medicine' ? 'default' : 'secondary'} className="text-xs">
                              {first.product_type === 'medicine' ? 'Medicine' : 'Cosmetic'}
                            </Badge>
                          }
                        </TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>{first.company_name || first.brand || '—'}</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell className="font-bold">{totalQty}</TableCell>
                        <TableCell colSpan={5}>—</TableCell>
                      </TableRow>
                      {isExpanded && batches.map(p => renderProductRow(p))}
                    </>
                  );
                })
              ) : unifiedProducts.length > 0 ? (
                unifiedProducts.map(p => renderProductRow(p))
              ) : (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground">No products found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination for medicines when not searching and on medicine/all tab */}
      {!isSearching && activeTab !== 'cosmetic' && (medicinesCount || 0) > medPageSize && (
        <Pagination
          currentPage={medPage}
          totalPages={medTotalPages}
          pageSize={medPageSize}
          totalItems={medicinesCount || 0}
          onPageChange={setMedPage}
          onPageSizeChange={(size) => { setMedPageSize(size); setMedPage(1); }}
        />
      )}

      {/* Dialogs */}
      <ProductDialog open={dialogOpen} onClose={handleDialogClose} product={editingProduct} defaultType={dialogDefaultType} />
      <ImageInventoryDialog open={imageDialogOpen} onClose={() => setImageDialogOpen(false)} />
      <InvoiceInventoryDialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} />
      <CosmeticImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <BulkActionsDialog
        open={bulkActionType !== null}
        onClose={() => setBulkActionType(null)}
        actionType={bulkActionType}
        selectedCount={selectedIds.size}
        onConfirm={handleBulkAction}
        isLoading={bulkActionLoading}
      />
      <FindReplaceDialog open={findReplaceOpen} onClose={() => setFindReplaceOpen(false)} />
      <CosmeticFindReplaceDialog open={cosmeticFindReplaceOpen} onClose={() => setCosmeticFindReplaceOpen(false)} />
    </div>
  );
};

export default Products;
