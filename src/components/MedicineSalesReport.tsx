import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Download, Search, Calendar as CalendarIcon, AlertTriangle, Package, MessageCircle, Send } from "lucide-react";
import { format, isWithinInterval, addMonths, differenceInDays } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { exportToCSV, formatForWhatsApp, shareViaWhatsApp } from "@/lib/exportUtils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MedicineSaleItem {
  id: string;
  item_name: string;
  batch_no: string;
  quantity: number;
  total_tablets?: number;
  total_packets?: number;
  tablets_per_packet?: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  sale_date?: string;
  medicine?: {
    expiry_date: string;
    rack_no: string;
    supplier: string;
    quantity: number;
    company_name: string;
  };
}

export function MedicineSalesReport() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setHours(0, 0, 0, 0)),
    to: new Date(new Date().setHours(23, 59, 59, 999)),
  });
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [selectedSupplierForWhatsApp, setSelectedSupplierForWhatsApp] = useState<string>("");

  // Fetch supplier contacts for WhatsApp
  const { data: supplierContacts } = useQuery({
    queryKey: ["supplierContacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch medicine sales with details
  const { data: medicineSales, isLoading } = useQuery({
    queryKey: ["medicineSales", dateRange.from, dateRange.to],
    queryFn: async () => {
      // First get sales within date range
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("id, sale_date")
        .gte("sale_date", dateRange.from.toISOString())
        .lte("sale_date", dateRange.to.toISOString());

      if (salesError) throw salesError;
      if (!sales || sales.length === 0) return [];

      const saleIds = sales.map(s => s.id);

      // Get sale items for these sales (only medicines)
      const { data: saleItems, error: itemsError } = await supabase
        .from("sale_items")
        .select("*")
        .in("sale_id", saleIds)
        .eq("item_type", "medicine");

      if (itemsError) throw itemsError;
      if (!saleItems || saleItems.length === 0) return [];

      // Get medicine details
      const itemIds = [...new Set(saleItems.map(item => item.item_id))];
      const { data: medicines, error: medicinesError } = await supabase
        .from("medicines")
        .select("id, expiry_date, rack_no, supplier, quantity, company_name")
        .in("id", itemIds);

      if (medicinesError) throw medicinesError;

      // Merge data
      const medicineMap = new Map(medicines?.map(m => [m.id, m]) || []);
      const salesMap = new Map(sales.map(s => [s.id, s.sale_date]));

      return saleItems.map(item => ({
        ...item,
        sale_date: salesMap.get(item.sale_id),
        medicine: medicineMap.get(item.item_id),
      })) as MedicineSaleItem[];
    },
  });

  // Get unique suppliers for filter
  const suppliers = useMemo(() => {
    if (!medicineSales) return [];
    const uniqueSuppliers = new Set(
      medicineSales
        .map(item => item.medicine?.supplier)
        .filter((supplier): supplier is string => !!supplier)
    );
    return Array.from(uniqueSuppliers).sort();
  }, [medicineSales]);

  // Filter and search
  const filteredSales = useMemo(() => {
    if (!medicineSales) return [];

    return medicineSales.filter(item => {
      // Supplier filter
      if (selectedSupplier !== "all" && item.medicine?.supplier !== selectedSupplier) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.item_name?.toLowerCase().includes(query) ||
          item.batch_no?.toLowerCase().includes(query) ||
          item.medicine?.rack_no?.toLowerCase().includes(query) ||
          item.medicine?.supplier?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [medicineSales, selectedSupplier, searchQuery]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!filteredSales) return { quantity: 0, amount: 0 };
    return {
      quantity: filteredSales.reduce((sum, item) => sum + (item.total_tablets || item.quantity), 0),
      amount: filteredSales.reduce((sum, item) => sum + Number(item.total_price), 0),
    };
  }, [filteredSales]);

  // Check if medicine is expiring soon or low stock
  const getItemStatus = (item: MedicineSaleItem) => {
    const warnings = [];
    
    if (item.medicine?.expiry_date) {
      const expiryDate = new Date(item.medicine.expiry_date);
      const daysUntilExpiry = differenceInDays(expiryDate, new Date());
      
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        warnings.push({ type: "expiry-critical", label: "Expires in " + daysUntilExpiry + " days" });
      } else if (daysUntilExpiry <= 180 && daysUntilExpiry > 30) {
        warnings.push({ type: "expiry-warning", label: "Expires in " + Math.floor(daysUntilExpiry / 30) + " months" });
      }
    }

    if (item.medicine?.quantity !== undefined && item.medicine.quantity < 10) {
      warnings.push({ 
        type: item.medicine.quantity < 5 ? "stock-critical" : "stock-warning", 
        label: `Low stock: ${item.medicine.quantity}` 
      });
    }

    return warnings;
  };

  // Export function
  const handleExport = () => {
    if (!filteredSales || filteredSales.length === 0) return;

    const exportData = filteredSales.map(item => ({
      "Medicine Name": item.item_name,
      "Batch No": item.batch_no,
      "Quantity (Tablets)": item.total_tablets || item.quantity,
      "Packets": item.total_packets || "-",
      "Tablets/Packet": item.tablets_per_packet || "-",
      "Unit Price": formatCurrency(Number(item.unit_price)),
      "Total Price": formatCurrency(Number(item.total_price)),
      "Sale Date": item.sale_date ? format(new Date(item.sale_date), "MMM dd, yyyy HH:mm") : "-",
      "Expiry Date": item.medicine?.expiry_date ? format(new Date(item.medicine.expiry_date), "MMM dd, yyyy") : "-",
      "Rack Location": item.medicine?.rack_no || "-",
      "Supplier": item.medicine?.supplier || "-",
      "Company": item.medicine?.company_name || "-",
      "Current Stock": item.medicine?.quantity || 0,
    }));

    const fileName = `medicine-sales-report-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}`;
    exportToCSV(exportData, fileName);
  };

  // WhatsApp sharing function
  const handleWhatsAppShare = () => {
    if (!filteredSales || filteredSales.length === 0) {
      toast.error("No data to share");
      return;
    }

    setShowWhatsAppDialog(true);
  };

  const sendWhatsAppMessage = () => {
    if (!selectedSupplierForWhatsApp) {
      toast.error("Please select a supplier");
      return;
    }

    const supplierContact = supplierContacts?.find(s => s.id === selectedSupplierForWhatsApp);
    if (!supplierContact || !supplierContact.whatsapp) {
      toast.error("Selected supplier does not have a WhatsApp number");
      return;
    }

    // Group medicines by supplier name from medicine data
    const supplierGroups = filteredSales?.reduce((acc, item) => {
      const supplierName = item.medicine?.supplier || "Unknown Supplier";
      if (!acc[supplierName]) {
        acc[supplierName] = [];
      }
      acc[supplierName].push(item);
      return acc;
    }, {} as Record<string, typeof filteredSales>);

    // Format message
    let message = `*📋 Medicine Sales Report*\n`;
    message += `📅 Period: ${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}\n`;
    message += `🏢 To: ${supplierContact.name}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Filter items for this supplier
    const supplierItems = supplierGroups?.[supplierContact.name] || [];
    
    if (supplierItems.length > 0) {
      message += `*Medicines from ${supplierContact.name}:*\n\n`;
      
      supplierItems.forEach((item, idx) => {
        message += `${idx + 1}. *${item.item_name}*\n`;
        message += `   📦 Batch: ${item.batch_no}\n`;
        message += `   💊 Quantity: ${item.total_tablets || item.quantity} tablets`;
        
        if (item.total_packets) {
          message += ` (${item.total_packets} packs)\n`;
        } else {
          message += `\n`;
        }
        
        message += `   💰 Total: ${formatCurrency(Number(item.total_price))}\n`;
        message += `   📍 Rack: ${item.medicine?.rack_no || "N/A"}\n`;
        
        if (item.medicine?.expiry_date) {
          const daysUntilExpiry = differenceInDays(new Date(item.medicine.expiry_date), new Date());
          message += `   📅 Expiry: ${format(new Date(item.medicine.expiry_date), "MMM yyyy")}`;
          
          if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
            message += ` ⚠️ (${daysUntilExpiry}d left)`;
          }
          message += `\n`;
        }
        
        if (item.medicine?.quantity !== undefined && item.medicine.quantity < 10) {
          message += `   ⚠️ Low Stock: ${item.medicine.quantity} units\n`;
        }
        
        message += `\n`;
      });

      const supplierTotal = supplierItems.reduce((sum, item) => sum + Number(item.total_price), 0);
      const supplierQty = supplierItems.reduce((sum, item) => sum + (item.total_tablets || item.quantity), 0);
      
      message += `*Summary:*\n`;
      message += `Total Items: ${supplierItems.length}\n`;
      message += `Total Quantity: ${supplierQty} tablets\n`;
      message += `Total Amount: ${formatCurrency(supplierTotal)}\n`;
    } else {
      message += `No medicines sold from ${supplierContact.name} during this period.\n`;
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `_Generated from PharmaFlow POS_`;

    // Share via WhatsApp
    const cleanNumber = supplierContact.whatsapp.replace(/[^0-9]/g, "");
    shareViaWhatsApp(message, cleanNumber);
    
    setShowWhatsAppDialog(false);
    setSelectedSupplierForWhatsApp("");
    toast.success("Opening WhatsApp...");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Medicine Sales Report
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              onClick={handleWhatsAppShare} 
              disabled={!filteredSales || filteredSales.length === 0} 
              size="sm"
              variant="outline"
              className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 dark:bg-green-950 dark:hover:bg-green-900 dark:border-green-800 dark:text-green-400"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Share via WhatsApp
            </Button>
            <Button onClick={handleExport} disabled={!filteredSales || filteredSales.length === 0} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Date From */}
          <div className="space-y-2">
            <Label>From Date</Label>
            <Popover open={showFromCalendar} onOpenChange={setShowFromCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? format(dateRange.from, "MMM dd, yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => {
                    if (date) {
                      setDateRange(prev => ({ ...prev, from: date }));
                      setShowFromCalendar(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label>To Date</Label>
            <Popover open={showToCalendar} onOpenChange={setShowToCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => {
                    if (date) {
                      setDateRange(prev => ({ ...prev, to: date }));
                      setShowToCalendar(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Supplier Filter */}
          <div className="space-y-2">
            <Label>Supplier / Distributor</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier} value={supplier}>
                    {supplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search medicines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-accent rounded-lg">
            <p className="text-sm text-muted-foreground">Total Items</p>
            <p className="text-2xl font-bold">{filteredSales?.length || 0}</p>
          </div>
          <div className="p-4 bg-accent rounded-lg">
            <p className="text-sm text-muted-foreground">Total Quantity</p>
            <p className="text-2xl font-bold">{totals.quantity} tablets</p>
          </div>
          <div className="p-4 bg-accent rounded-lg">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totals.amount)}</p>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <LoadingSpinner className="py-8" />
        ) : !filteredSales || filteredSales.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No sales found"
            description="No medicine sales found for the selected date range and filters."
          />
        ) : (
          <ScrollArea className="h-[500px] rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Medicine Name</TableHead>
                  <TableHead>Batch No</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Sale Date</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Rack</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((item) => {
                  const warnings = getItemStatus(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>{item.batch_no}</TableCell>
                      <TableCell>
                        {item.total_tablets || item.quantity} tablets
                        {item.total_packets && (
                          <span className="text-xs text-muted-foreground block">
                            ({item.total_packets} packs)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(item.total_price))}</TableCell>
                      <TableCell className="text-sm">
                        {item.sale_date ? format(new Date(item.sale_date), "MMM dd, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.medicine?.expiry_date
                          ? format(new Date(item.medicine.expiry_date), "MMM dd, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>{item.medicine?.rack_no || "-"}</TableCell>
                      <TableCell>{item.medicine?.supplier || "-"}</TableCell>
                      <TableCell>
                        {warnings.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {warnings.map((warning, idx) => (
                              <span
                                key={idx}
                                className={cn(
                                  "text-xs px-2 py-1 rounded-full inline-flex items-center gap-1",
                                  warning.type === "expiry-critical" && "bg-destructive/10 text-destructive",
                                  warning.type === "expiry-warning" && "bg-warning/10 text-warning",
                                  warning.type === "stock-critical" && "bg-destructive/10 text-destructive",
                                  warning.type === "stock-warning" && "bg-warning/10 text-warning"
                                )}
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {warning.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>

      {/* WhatsApp Dialog */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share via WhatsApp</DialogTitle>
            <DialogDescription>
              Select a supplier to send the medicine sales report
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Supplier</Label>
              <Select value={selectedSupplierForWhatsApp} onValueChange={setSelectedSupplierForWhatsApp}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {supplierContacts
                    ?.filter(s => s.whatsapp)
                    .map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{supplier.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{supplier.whatsapp}</span>
                        </div>
                      </SelectItem>
                    ))}
                  {(!supplierContacts || supplierContacts.filter(s => s.whatsapp).length === 0) && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No suppliers with WhatsApp numbers found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {selectedSupplierForWhatsApp && (
              <div className="text-sm text-muted-foreground">
                The report will include medicines from the selected supplier only.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowWhatsAppDialog(false);
              setSelectedSupplierForWhatsApp("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={sendWhatsAppMessage}
              disabled={!selectedSupplierForWhatsApp}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Send via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
