import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Trash2 } from "lucide-react";

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
  const [salesmanId, setSalesmanId] = useState("");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);

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
      const salesman = salesmen?.find((s) => s.id === salesmanId);
      if (!salesman) throw new Error("Salesman not found");
      if (saleItems.length === 0) throw new Error("No items in sale");

      const subtotal = saleItems.reduce((sum, item) => sum + item.totalPrice, 0);
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
      toast.success("Sale completed successfully");
      onClose();
      resetForm();
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
    
    if (field === "itemId") {
      const allItems = item.itemType === "medicine" ? medicines : cosmetics;
      const selectedItem = allItems?.find((i) => i.id === value);
      if (selectedItem) {
        item.itemId = value;
        item.itemName = selectedItem[item.itemType === "medicine" ? "medicine_name" : "product_name"];
        item.batchNo = selectedItem.batch_no;
        item.unitPrice = Number(selectedItem.selling_price);
        item.purchasePrice = Number(selectedItem.purchase_price);
        item.totalPrice = item.unitPrice * item.quantity;
        item.profit = (item.unitPrice - item.purchasePrice) * item.quantity;
      }
    } else if (field === "quantity") {
      item.quantity = Number(value);
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
              <Button type="button" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
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
                  <span className="text-sm">${item.totalPrice.toFixed(2)}</span>
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
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Discount:</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Tax:</span>
              <span>+${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">${total.toFixed(2)}</span>
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
