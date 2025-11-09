import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { supabase } from "@/integrations/supabase/client";
import { validateStockAvailability } from "@/lib/validations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Printer } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { QRScanner } from "./QRScanner";
import { SaleReceipt } from "./SaleReceipt";

interface SaleDialogProps {
  open: boolean;
  onClose: () => void;
}

interface SaleItem {
  itemType: "medicine" | "cosmetic";
  itemId: string;
  itemName: string;
  batchNo: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  profit: number;
  purchasePrice: number;
}

export function SaleDialog({ open, onClose }: SaleDialogProps) {
  const queryClient = useQueryClient();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [salesmanId, setSalesmanId] = useState("");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const { data: salesmen } = useQuery({
    queryKey: ["salesmen"],
    queryFn: async () => {
      const { data, error } = await supabase.from("salesmen").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: medicines } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("medicines").select("*").gt("quantity", 0);
      if (error) throw error;
      return data;
    },
  });

  const { data: cosmetics } = useQuery({
    queryKey: ["cosmetics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cosmetics").select("*").gt("quantity", 0);
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validation
      if (!salesmanId) throw new Error("Please select a salesman");
      if (saleItems.length === 0) throw new Error("Please add at least one item");

      const salesman = salesmen?.find((s) => s.id === salesmanId);
      if (!salesman) throw new Error("Salesman not found");

      // Validate all items have required fields
      for (const item of saleItems) {
        if (!item.itemId) throw new Error("Please select an item for all rows");
        if (item.quantity < 1) throw new Error("Quantity must be at least 1");

        // Validate stock availability
        const availableItems = item.itemType === "medicine" ? medicines : cosmetics;
        const validation = validateStockAvailability(
          item.itemType,
          item.itemId,
          item.quantity,
          availableItems || []
        );

        if (!validation.isValid) {
          throw new Error(`${item.itemName}: ${validation.message}`);
        }
      }

      const subtotal = saleItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      // Validate discount
      if (discount < 0) throw new Error("Discount cannot be negative");
      if (discount > subtotal) throw new Error("Discount cannot exceed subtotal");
      
      // Validate tax
      if (tax < 0) throw new Error("Tax cannot be negative");

      const totalProfit = saleItems.reduce((sum, item) => sum + item.profit, 0);
      const totalAmount = subtotal - discount + tax;

      // Insert sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          salesman_id: salesmanId,
          salesman_name: salesman.name,
          subtotal,
          discount,
          tax,
          total_amount: totalAmount,
          total_profit: totalProfit,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Insert sale items
      const saleItemsData = saleItems.map((item) => ({
        sale_id: sale.id,
        item_type: item.itemType,
        item_id: item.itemId,
        item_name: item.itemName,
        batch_no: item.batchNo,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        profit: item.profit,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItemsData);

      if (itemsError) throw itemsError;

      // Update inventory
      for (const item of saleItems) {
        if (item.itemType === "medicine") {
          const { error } = await supabase.rpc("decrement_medicine_quantity", {
            medicine_id: item.itemId,
            qty: item.quantity,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.rpc("decrement_cosmetic_quantity", {
            cosmetic_id: item.itemId,
            qty: item.quantity,
          });
          if (error) throw error;
        }
      }

      return { sale, salesman };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
      queryClient.invalidateQueries({ queryKey: ["todaySales"] });
      queryClient.invalidateQueries({ queryKey: ["medicinesSoldToday"] });
      queryClient.invalidateQueries({ queryKey: ["cosmeticsSoldToday"] });
      
      setCompletedSale({
        saleId: data.sale.id,
        salesmanName: data.salesman.name,
        saleDate: new Date(data.sale.sale_date),
        items: saleItems,
        subtotal,
        discount,
        tax,
        total: data.sale.total_amount,
      });
      setShowReceipt(true);
      toast.success("Sale completed successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to complete sale");
    },
  });

  const resetForm = () => {
    setSalesmanId("");
    setSaleItems([]);
    setDiscount(0);
    setTax(0);
    setCompletedSale(null);
    setShowReceipt(false);
  };

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    onAfterPrint: () => {
      onClose();
      resetForm();
    },
  });

  const handleQRScan = (decodedText: string) => {
    try {
      // Assuming QR code contains item ID in format: "ITEM_ID" or "medicine:ITEM_ID" or "cosmetic:ITEM_ID"
      const parts = decodedText.split(":");
      const itemType = parts.length > 1 ? (parts[0] as "medicine" | "cosmetic") : "medicine";
      const itemId = parts.length > 1 ? parts[1] : decodedText;

      // Find the item
      const allItems = itemType === "medicine" ? medicines : cosmetics;
      const item = allItems?.find((i) => i.id === itemId);

      if (item) {
        // Add item to sale
        const newItem: SaleItem = {
          itemType,
          itemId: item.id,
          itemName: item[itemType === "medicine" ? "medicine_name" : "product_name"],
          batchNo: item.batch_no,
          quantity: 1,
          unitPrice: Number(item.selling_price),
          totalPrice: Number(item.selling_price),
          profit: Number(item.selling_price) - Number(item.purchase_price),
          purchasePrice: Number(item.purchase_price),
        };
        setSaleItems([...saleItems, newItem]);
        toast.success(`Added: ${newItem.itemName}`);
      } else {
        toast.error("Item not found");
      }
    } catch (error) {
      toast.error("Invalid QR code format");
    }
  };

  const addItem = () => {
    setSaleItems([
      ...saleItems,
      {
        itemType: "medicine",
        itemId: "",
        itemName: "",
        batchNo: "",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        profit: 0,
        purchasePrice: 0,
      },
    ]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...saleItems];
    const item = newItems[index];
    
    if (field === "itemType") {
      // Reset item when type changes
      item.itemType = value as "medicine" | "cosmetic";
      item.itemId = "";
      item.itemName = "";
      item.batchNo = "";
      item.unitPrice = 0;
      item.purchasePrice = 0;
      item.totalPrice = 0;
      item.profit = 0;
    } else if (field === "itemId") {
      const allItems = item.itemType === "medicine" ? medicines : cosmetics;
      const selectedItem = allItems?.find((i) => i.id === value);
      if (selectedItem) {
        const availableQuantity = selectedItem.quantity;
        
        item.itemId = value;
        item.itemName = selectedItem[item.itemType === "medicine" ? "medicine_name" : "product_name"];
        item.batchNo = selectedItem.batch_no;
        item.unitPrice = Number(selectedItem.selling_price);
        item.purchasePrice = Number(selectedItem.purchase_price);
        
        // Validate quantity doesn't exceed available stock
        if (item.quantity > availableQuantity) {
          item.quantity = availableQuantity;
          toast.error(`Quantity adjusted to available stock: ${availableQuantity} units`);
        }
        
        item.totalPrice = item.unitPrice * item.quantity;
        item.profit = (item.unitPrice - item.purchasePrice) * item.quantity;
      }
    } else if (field === "quantity") {
      const qty = Number(value);
      
      if (qty < 1) {
        toast.error("Quantity must be at least 1");
        return;
      }

      // Validate against available stock
      if (item.itemId) {
        const allItems = item.itemType === "medicine" ? medicines : cosmetics;
        const validation = validateStockAvailability(
          item.itemType,
          item.itemId,
          qty,
          allItems || []
        );

        if (!validation.isValid) {
          toast.error(validation.message);
          return;
        }
      }

      item.quantity = qty;
      item.totalPrice = item.unitPrice * item.quantity;
      item.profit = (item.unitPrice - item.purchasePrice) * item.quantity;
    } else {
      (item as any)[field] = value;
    }
    
    setSaleItems(newItems);
  };

  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const subtotal = saleItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = subtotal - discount + tax;

  if (showReceipt && completedSale) {
    return (
      <Dialog open={open} onOpenChange={() => {
        onClose();
        resetForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sale Completed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <SaleReceipt ref={receiptRef} {...completedSale} />
            <div className="flex gap-2">
              <Button onClick={handlePrint} className="flex-1 gap-2">
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
              <Button variant="outline" onClick={() => {
                onClose();
                resetForm();
              }} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Sale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Salesman *</Label>
            <Select value={salesmanId} onValueChange={setSalesmanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select salesman" />
              </SelectTrigger>
              <SelectContent>
                {salesmen?.map((salesman) => (
                  <SelectItem key={salesman.id} value={salesman.id}>
                    {salesman.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Items</Label>
              <div className="flex gap-2">
                <QRScanner onScan={handleQRScan} />
                <Button type="button" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </div>
            {saleItems.map((item, index) => (
              <div key={index} className="grid grid-cols-6 gap-2 p-2 border rounded">
                <Select
                  value={item.itemType}
                  onValueChange={(value) => updateItem(index, "itemType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medicine">Medicine</SelectItem>
                    <SelectItem value="cosmetic">Cosmetic</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={item.itemId}
                  onValueChange={(value) => updateItem(index, "itemId", value)}
                >
                  <SelectTrigger className="col-span-2">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {(item.itemType === "medicine" ? medicines : cosmetics)?.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i[item.itemType === "medicine" ? "medicine_name" : "product_name"]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                  placeholder="Qty"
                />
                <div className="flex items-center">
                  <span className="text-sm">{formatCurrency(item.totalPrice)}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Discount</Label>
              <Input
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tax</Label>
              <Input
                type="number"
                step="0.01"
                value={tax}
                onChange={(e) => setTax(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Discount:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Tax:</span>
              <span>+{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => saveMutation.mutate()}>
              Complete Sale
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
