import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/currency";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { Search, RotateCcw, AlertTriangle, Snowflake } from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";

interface ReturnDialogProps {
  open: boolean;
  onClose: () => void;
}

interface SaleItem {
  id: string;
  item_name: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  batch_no: string;
  return_status: string;
  return_quantity: number;
  is_fridge_item: boolean;
}

interface Sale {
  id: string;
  sale_date: string;
  salesman_name: string;
  customer_name: string | null;
  total_amount: number;
  return_status: string;
  sale_items: SaleItem[];
}

export const ReturnDialog = ({ open, onClose }: ReturnDialogProps) => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, { quantity: number; returnType: "return" | "replace" }>>(new Map());
  const [reason, setReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedSale(null);
      setSelectedItems(new Map());
      setReason("");
    }
  }, [open]);

  // Search sales by ID
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["searchSalesForReturn", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 3) return [];
      
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          sale_date,
          salesman_name,
          customer_name,
          total_amount,
          return_status,
          sale_items (
            id,
            item_name,
            item_type,
            quantity,
            unit_price,
            total_price,
            batch_no,
            return_status,
            return_quantity,
            is_fridge_item
          )
        `)
        .ilike("id", `%${searchQuery}%`)
        .order("sale_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Sale[];
    },
    enabled: searchQuery.length >= 3,
  });

  const isWithinReturnPeriod = (saleDate: string) => {
    const daysSinceSale = differenceInDays(new Date(), new Date(saleDate));
    return daysSinceSale <= 7;
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Map(selectedItems);
    if (checked) {
      const item = selectedSale?.sale_items.find(i => i.id === itemId);
      if (item) {
        const availableQty = item.quantity - (item.return_quantity || 0);
        newSelected.set(itemId, { quantity: availableQty, returnType: "return" });
      }
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const newSelected = new Map(selectedItems);
    const current = newSelected.get(itemId);
    if (current) {
      newSelected.set(itemId, { ...current, quantity });
    }
    setSelectedItems(newSelected);
  };

  const handleReturnTypeChange = (itemId: string, returnType: "return" | "replace") => {
    const newSelected = new Map(selectedItems);
    const current = newSelected.get(itemId);
    if (current) {
      newSelected.set(itemId, { ...current, returnType });
    }
    setSelectedItems(newSelected);
  };

  const calculateRefundTotal = () => {
    let total = 0;
    selectedItems.forEach((value, itemId) => {
      const item = selectedSale?.sale_items.find(i => i.id === itemId);
      if (item && value.returnType === "return") {
        total += item.unit_price * value.quantity;
      }
    });
    return total;
  };

  const handleProcessReturn = async () => {
    if (!selectedSale || selectedItems.size === 0 || !user) {
      toast.error("Please select items to return");
      return;
    }

    setIsProcessing(true);

    try {
      const processedBy = user.email || "Unknown";

      // Process each selected item
      for (const [itemId, { quantity, returnType }] of selectedItems) {
        const item = selectedSale.sale_items.find(i => i.id === itemId);
        if (!item) continue;

        // Insert return record
        const { error: returnError } = await supabase
          .from("returns")
          .insert({
            sale_id: selectedSale.id,
            sale_item_id: itemId,
            return_type: returnType,
            quantity: quantity,
            refund_amount: returnType === "return" ? item.unit_price * quantity : 0,
            reason: reason,
            processed_by: processedBy,
          });

        if (returnError) throw returnError;

        // Update sale_item return status
        const newReturnQty = (item.return_quantity || 0) + quantity;
        const newStatus = newReturnQty >= item.quantity ? "returned" : "none";
        
        const { error: itemUpdateError } = await supabase
          .from("sale_items")
          .update({
            return_status: newStatus,
            return_quantity: newReturnQty,
            return_date: new Date().toISOString(),
          })
          .eq("id", itemId);

        if (itemUpdateError) throw itemUpdateError;

        // Restore inventory if returning (not replacing)
        if (returnType === "return") {
          if (item.item_type === "medicine") {
            // Get current quantity and update
            const { data: medicine } = await supabase
              .from("medicines")
              .select("quantity")
              .eq("id", item.id)
              .single();
            
            if (medicine) {
              await supabase
                .from("medicines")
                .update({ quantity: medicine.quantity + quantity })
                .eq("id", item.id);
            }
          } else if (item.item_type === "cosmetic") {
            // Get current quantity and update
            const { data: cosmetic } = await supabase
              .from("cosmetics")
              .select("quantity")
              .eq("id", item.id)
              .single();
            
            if (cosmetic) {
              await supabase
                .from("cosmetics")
                .update({ quantity: cosmetic.quantity + quantity })
                .eq("id", item.id);
            }
          }
        }
      }

      // Update sale return status
      const allReturned = selectedSale.sale_items.every(item => {
        const selected = selectedItems.get(item.id);
        if (selected) {
          return (item.return_quantity || 0) + selected.quantity >= item.quantity;
        }
        return item.return_status === "returned";
      });

      const anyReturned = selectedItems.size > 0;

      const { error: saleUpdateError } = await supabase
        .from("sales")
        .update({
          return_status: allReturned ? "full" : anyReturned ? "partial" : "none",
          return_date: new Date().toISOString(),
          return_reason: reason,
          return_processed_by: processedBy,
        })
        .eq("id", selectedSale.id);

      if (saleUpdateError) throw saleUpdateError;

      toast.success("Return processed successfully");
      queryClient.invalidateQueries({ queryKey: ["salesHistory"] });
      queryClient.invalidateQueries({ queryKey: ["todaySales"] });
      onClose();
    } catch (error: any) {
      console.error("Return processing error:", error);
      toast.error(error.message || "Failed to process return");
    } finally {
      setIsProcessing(false);
    }
  };

  const canProcessReturn = userRole === "admin" || userRole === "manager" || userRole === "salesman";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Process Return / Exchange
          </DialogTitle>
          <DialogDescription>
            Search for a sale by receipt ID to process returns or exchanges.
            Returns must be within 7 days of purchase.
          </DialogDescription>
        </DialogHeader>

        {!canProcessReturn ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-4" />
            <p>You must be logged in to process returns.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search-receipt">Search by Receipt ID</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-receipt"
                  placeholder="Enter receipt ID (at least 3 characters)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Search Results */}
            {isSearching && <LoadingSpinner text="Searching..." />}
            
            {searchResults && searchResults.length > 0 && !selectedSale && (
              <div className="border rounded-lg divide-y">
                {searchResults.map((sale) => {
                  const withinPeriod = isWithinReturnPeriod(sale.sale_date);
                  return (
                    <div
                      key={sale.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 ${!withinPeriod ? "opacity-50" : ""}`}
                      onClick={() => withinPeriod && setSelectedSale(sale)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-sm">{sale.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(sale.sale_date), "MMM dd, yyyy HH:mm")}
                          </p>
                          <p className="text-sm">{sale.customer_name || "Walk-in Customer"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(sale.total_amount)}</p>
                          {sale.return_status !== "none" && (
                            <Badge variant={sale.return_status === "full" ? "destructive" : "secondary"}>
                              {sale.return_status === "full" ? "Fully Returned" : "Partial Return"}
                            </Badge>
                          )}
                          {!withinPeriod && (
                            <Badge variant="outline" className="mt-1">
                              Return period expired
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected Sale Details */}
            {selectedSale && (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-mono text-lg">{selectedSale.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedSale.sale_date), "MMM dd, yyyy HH:mm")} • {selectedSale.salesman_name}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedSale(null)}>
                    Change
                  </Button>
                </div>

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-center">Return Qty</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.sale_items.map((item) => {
                        const isSelected = selectedItems.has(item.id);
                        const selectedData = selectedItems.get(item.id);
                        const availableQty = item.quantity - (item.return_quantity || 0);
                        const canReturn = availableQty > 0 && !item.is_fridge_item;

                        return (
                          <TableRow key={item.id} className={item.is_fridge_item ? "bg-blue-50" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                disabled={!canReturn}
                                onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {item.is_fridge_item && (
                                  <Snowflake className="h-4 w-4 text-blue-500" />
                                )}
                                <div>
                                  <p className="font-medium">{item.item_name}</p>
                                  <p className="text-xs text-muted-foreground">Batch: {item.batch_no}</p>
                                </div>
                              </div>
                              {item.is_fridge_item && (
                                <p className="text-xs text-destructive mt-1">Fridge item - No returns</p>
                              )}
                              {item.return_status === "returned" && (
                                <Badge variant="secondary" className="mt-1">Already Returned</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell className="text-center">
                              {isSelected ? (
                                <Input
                                  type="number"
                                  min={1}
                                  max={availableQty}
                                  value={selectedData?.quantity || 1}
                                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                  className="w-20 mx-auto"
                                />
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {isSelected && (
                                <Select
                                  value={selectedData?.returnType}
                                  onValueChange={(value: "return" | "replace") => handleReturnTypeChange(item.id, value)}
                                >
                                  <SelectTrigger className="w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="return">Refund</SelectItem>
                                    <SelectItem value="replace">Replace</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="return-reason">Reason for Return</Label>
                  <Textarea
                    id="return-reason"
                    placeholder="Enter reason for return/exchange..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                {/* Refund Summary */}
                {selectedItems.size > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Refund Amount:</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(calculateRefundTotal())}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Replacements do not incur a refund
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {canProcessReturn && selectedSale && (
            <Button
              onClick={handleProcessReturn}
              disabled={isProcessing || selectedItems.size === 0}
            >
              {isProcessing ? "Processing..." : "Process Return"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
