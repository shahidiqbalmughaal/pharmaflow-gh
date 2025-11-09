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
  sellingType?: "per_tablet" | "per_packet";
  tabletsPerPacket?: number;
  totalTablets?: number;
  totalPackets?: number;
}

export function SaleDialog({ open, onClose }: SaleDialogProps) {
  const queryClient = useQueryClient();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [salesmanId, setSalesmanId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState(0);
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

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: customerDiscounts } = useQuery({
    queryKey: ["customer-discounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_discounts")
        .select("*")
        .eq("is_active", true);
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

  // Apply customer discount when customer is selected
  useEffect(() => {
    if (customerId) {
      const discount = customerDiscounts?.find((d) => d.customer_id === customerId);
      if (discount) {
        setDiscountPercentage(Number(discount.discount_percentage));
        toast.info(`Customer discount of ${discount.discount_percentage}% applied`);
      } else {
        setDiscountPercentage(0);
      }
    } else {
      setDiscountPercentage(0);
    }
  }, [customerId, customerDiscounts]);

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
        if (item.unitPrice < 0) throw new Error(`${item.itemName}: Rate must be positive`);
        if (item.totalPrice < 0) throw new Error(`${item.itemName}: Total Price must be positive`);
        
        // Validate Quantity × Rate = Total Price
        const calculatedTotal = item.quantity * item.unitPrice;
        const difference = Math.abs(calculatedTotal - item.totalPrice);
        if (difference >= 0.01) {
          throw new Error(
            `${item.itemName}: Total Price (${formatCurrency(item.totalPrice)}) does not match Quantity (${item.quantity}) × Rate (${formatCurrency(item.unitPrice)}) = ${formatCurrency(calculatedTotal)}`
          );
        }

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
      
      // Validate discount percentage
      if (discountPercentage < 0) throw new Error("Discount cannot be negative");
      if (discountPercentage > 100) throw new Error("Discount cannot exceed 100%");
      
      // Calculate discount amount
      const discountAmount = (subtotal * discountPercentage) / 100;
      
      // Validate tax
      if (tax < 0) throw new Error("Tax cannot be negative");

      const totalProfit = saleItems.reduce((sum, item) => sum + item.profit, 0);
      const totalAmount = subtotal - discountAmount + tax;

      // Calculate loyalty points (1 point per 100 currency spent)
      const loyaltyPointsEarned = Math.floor(totalAmount / 100);

      const customer = customerId ? customers?.find((c) => c.id === customerId) : null;

      // Insert sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          salesman_id: salesmanId,
          salesman_name: salesman.name,
          customer_id: customerId || null,
          customer_name: customer?.name || null,
          loyalty_points_earned: loyaltyPointsEarned,
          subtotal,
          discount: discountAmount,
          discount_percentage: discountPercentage,
          tax,
          total_amount: totalAmount,
          total_profit: totalProfit,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Update customer stats if customer is selected
      if (customerId && customer) {
        const { error: updateError } = await supabase
          .from("customers")
          .update({
            loyalty_points: (customer.loyalty_points || 0) + loyaltyPointsEarned,
            total_purchases: (customer.total_purchases || 0) + 1,
            total_spent: (Number(customer.total_spent) || 0) + totalAmount,
          })
          .eq("id", customerId);

        if (updateError) throw updateError;
      }

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
        tablets_per_packet: item.tabletsPerPacket || 1,
        total_tablets: item.totalTablets || item.quantity,
        total_packets: item.totalPackets || 0,
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
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["todaySales"] });
      queryClient.invalidateQueries({ queryKey: ["medicinesSoldToday"] });
      queryClient.invalidateQueries({ queryKey: ["cosmeticsSoldToday"] });
      
      const discountAmount = (subtotal * discountPercentage) / 100;
      setCompletedSale({
        saleId: data.sale.id,
        salesmanName: data.salesman.name,
        customerName: data.sale.customer_name,
        loyaltyPointsEarned: data.sale.loyalty_points_earned,
        saleDate: new Date(data.sale.sale_date),
        items: saleItems,
        subtotal,
        discountPercentage,
        discountAmount,
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
    setCustomerId("");
    setSaleItems([]);
    setDiscountPercentage(0);
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
        let sellingType: "per_tablet" | "per_packet" = "per_tablet";
        let tabletsPerPacket = 1;
        
        if (itemType === "medicine") {
          sellingType = (item as any).selling_type || "per_tablet";
          tabletsPerPacket = (item as any).tablets_per_packet || 1;
        }
        
        const quantity = 1;
        
        const newItem: SaleItem = {
          itemType,
          itemId: item.id,
          itemName: item[itemType === "medicine" ? "medicine_name" : "product_name"],
          batchNo: item.batch_no,
          quantity,
          unitPrice: Number(item.selling_price),
          totalPrice: Number(item.selling_price),
          profit: Number(item.selling_price) - Number(item.purchase_price),
          purchasePrice: Number(item.purchase_price),
          sellingType,
          tabletsPerPacket,
          totalTablets: sellingType === "per_packet" ? quantity * tabletsPerPacket : quantity,
          totalPackets: sellingType === "per_packet" ? quantity : 0,
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
        sellingType: "per_tablet",
        tabletsPerPacket: 1,
        totalTablets: 0,
        totalPackets: 0,
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
        
        // Handle selling type for medicines
        if (item.itemType === "medicine") {
          const medicineItem = selectedItem as any;
          item.sellingType = medicineItem.selling_type || "per_tablet";
          item.tabletsPerPacket = medicineItem.tablets_per_packet || 1;
          
          if (item.sellingType === "per_packet") {
            item.unitPrice = Number(medicineItem.price_per_packet || medicineItem.selling_price);
          } else {
            item.unitPrice = Number(medicineItem.selling_price);
          }
        } else {
          item.sellingType = "per_tablet";
          item.tabletsPerPacket = 1;
          item.unitPrice = Number(selectedItem.selling_price);
        }
        
        item.purchasePrice = Number(selectedItem.purchase_price);
        
        // Validate quantity doesn't exceed available stock
        if (item.quantity > availableQuantity) {
          item.quantity = availableQuantity;
          toast.error(`Quantity adjusted to available stock: ${availableQuantity} units`);
        }
        
        // Calculate totals based on selling type
        if (item.sellingType === "per_packet" && item.tabletsPerPacket) {
          item.totalPackets = item.quantity;
          item.totalTablets = item.quantity * item.tabletsPerPacket;
          item.totalPrice = item.unitPrice * item.quantity;
          item.profit = (item.unitPrice - item.purchasePrice) * item.quantity;
        } else {
          item.totalTablets = item.quantity;
          item.totalPackets = 0;
          item.totalPrice = item.unitPrice * item.quantity;
          item.profit = (item.unitPrice - item.purchasePrice) * item.quantity;
        }
      }
    } else if (field === "quantity") {
      const qty = Number(value);
      
      if (qty < 1) {
        toast.error("Quantity must be at least 1");
        return;
      }

      // For per-packet items, validate against total tablets available
      if (item.itemId) {
        const allItems = item.itemType === "medicine" ? medicines : cosmetics;
        const selectedItem = allItems?.find((i) => i.id === item.itemId);
        
        if (selectedItem) {
          const requiredTablets = item.sellingType === "per_packet" && item.tabletsPerPacket 
            ? qty * item.tabletsPerPacket 
            : qty;
          
          if (requiredTablets > selectedItem.quantity) {
            const maxPackets = item.sellingType === "per_packet" && item.tabletsPerPacket
              ? Math.floor(selectedItem.quantity / item.tabletsPerPacket)
              : selectedItem.quantity;
            toast.error(`Only ${maxPackets} ${item.sellingType === "per_packet" ? "packets" : "tablets"} available (${selectedItem.quantity} tablets in stock)`);
            return;
          }
        }
      }

      item.quantity = qty;
      
      // Auto-calculate Total Price: Total = Quantity × Rate
      item.totalPrice = item.unitPrice * qty;
      
      // Update totals based on selling type
      if (item.sellingType === "per_packet" && item.tabletsPerPacket) {
        item.totalPackets = qty;
        item.totalTablets = qty * item.tabletsPerPacket;
        item.profit = (item.unitPrice - item.purchasePrice) * qty;
      } else {
        item.totalTablets = qty;
        item.totalPackets = 0;
        item.profit = (item.unitPrice - item.purchasePrice) * qty;
      }
    } else if (field === "unitPrice") {
      const rate = Number(value);
      
      if (rate < 0) {
        toast.error("Rate must be positive");
        return;
      }
      
      item.unitPrice = rate;
      
      // Auto-calculate Total Price: Total = Quantity × Rate
      item.totalPrice = item.quantity * rate;
      item.profit = (rate - item.purchasePrice) * item.quantity;
      
    } else if (field === "totalPrice") {
      const total = Number(value);
      
      if (total < 0) {
        toast.error("Total Price must be positive");
        return;
      }
      
      item.totalPrice = total;
      
      // Auto-calculate Rate: Rate = Total ÷ Quantity
      if (item.quantity > 0) {
        item.unitPrice = total / item.quantity;
        item.profit = (item.unitPrice - item.purchasePrice) * item.quantity;
      }
    } else {
      (item as any)[field] = value;
    }
    
    setSaleItems(newItems);
  };

  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const subtotal = saleItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = (subtotal * discountPercentage) / 100;
  const total = subtotal - discountAmount + tax;

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
            <Label>Customer (Optional)</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer or leave blank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Walk-in Customer</SelectItem>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {customerId && (
              <p className="text-xs text-muted-foreground">
                Loyalty Points: {customers?.find(c => c.id === customerId)?.loyalty_points || 0}
              </p>
            )}
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
              <div key={index} className="space-y-2">
                <div className="grid grid-cols-12 gap-2 p-3 border rounded bg-card">
                  <div className="col-span-2">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={item.itemType}
                      onValueChange={(value) => updateItem(index, "itemType", value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medicine">Medicine</SelectItem>
                        <SelectItem value="cosmetic">Cosmetic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs">Item Name</Label>
                    <Select
                      value={item.itemId}
                      onValueChange={(value) => updateItem(index, "itemId", value)}
                    >
                      <SelectTrigger className="h-9">
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
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      className="h-9"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      placeholder={item.sellingType === "per_packet" ? "Packets" : "Qty"}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Rate</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-9"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                      placeholder="Rate"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Total Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-9"
                      value={item.totalPrice}
                      onChange={(e) => updateItem(index, "totalPrice", e.target.value)}
                      placeholder="Total"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex items-end justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {item.sellingType === "per_packet" && item.tabletsPerPacket && item.itemId && (
                  <p className="text-xs text-muted-foreground px-2">
                    Each packet = {item.tabletsPerPacket} tablets | Total = {item.totalTablets} tablets | Profit: {formatCurrency(item.profit)}
                  </p>
                )}
                {item.itemId && item.quantity > 0 && (
                  <p className="text-xs text-success font-medium px-2">
                    Profit: {formatCurrency(item.profit)} | Rate × Qty = {formatCurrency(item.unitPrice * item.quantity)}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Discount (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={discountPercentage}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0 && val <= 100) {
                    setDiscountPercentage(val);
                  }
                }}
              />
              {discountPercentage > 0 && (
                <p className="text-xs text-muted-foreground">
                  Discount amount: {formatCurrency(discountAmount)}
                </p>
              )}
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
            {discountPercentage > 0 && (
              <div className="flex justify-between">
                <span className="font-medium">Discount ({discountPercentage}%):</span>
                <span className="text-success">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between">
                <span className="font-medium">Tax:</span>
                <span>+{formatCurrency(tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Final Total:</span>
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
