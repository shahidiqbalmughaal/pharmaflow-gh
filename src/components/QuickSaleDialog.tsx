import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Zap, Loader2, Printer, Package, MapPin, Check } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { SaleReceipt } from "./SaleReceipt";
import { usePharmacySettings } from "@/hooks/usePharmacySettings";

interface QuickSaleProduct {
  type: 'medicine' | 'cosmetic';
  id: string;
  name: string;
  batch_no: string;
  quantity: number;
  selling_price: number;
  purchase_price: number;
  rack_no: string;
  selling_type?: string;
  tablets_per_packet?: number;
  price_per_packet?: number;
}

interface QuickSaleDialogProps {
  open: boolean;
  onClose: () => void;
  product: QuickSaleProduct | null;
}

export function QuickSaleDialog({ open, onClose, product }: QuickSaleDialogProps) {
  const queryClient = useQueryClient();
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const [salesmanId, setSalesmanId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  
  // Pharmacy settings for receipt
  const { settings: pharmacySettings } = usePharmacySettings();

  // Use salesmen_list view for dropdown (excludes sensitive CNIC/contact data)
  const { data: salesmen } = useQuery({
    queryKey: ["salesmen-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("salesmen_list").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setCompletedSale(null);
      setShowReceipt(false);
    }
  }, [open]);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-Quick-${completedSale?.id?.slice(0, 8) || 'sale'}`,
  });

  const unitPrice = product?.type === 'medicine' && product.selling_type === 'per_packet'
    ? (product.price_per_packet || product.selling_price * (product.tablets_per_packet || 1))
    : product?.selling_price || 0;

  const totalPrice = quantity * unitPrice;
  const profit = quantity * (unitPrice - (product?.purchase_price || 0));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!salesmanId) throw new Error("Please select a salesman");
      if (!product) throw new Error("No product selected");
      if (quantity < 1) throw new Error("Quantity must be at least 1");
      if (quantity > product.quantity) throw new Error(`Only ${product.quantity} available in stock`);

      const salesman = salesmen?.find((s) => s.id === salesmanId);
      if (!salesman) throw new Error("Salesman not found");

      // Insert sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          salesman_id: salesmanId,
          salesman_name: salesman.name,
          subtotal: totalPrice,
          discount: 0,
          discount_percentage: 0,
          tax: 0,
          total_amount: totalPrice,
          total_profit: profit,
          loyalty_points_earned: Math.floor(totalPrice / 100),
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Insert sale item
      const { error: itemError } = await supabase.from("sale_items").insert({
        sale_id: sale.id,
        item_type: product.type,
        item_id: product.id,
        item_name: product.name,
        batch_no: product.batch_no,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        profit: profit,
        tablets_per_packet: product.tablets_per_packet || 1,
        total_tablets: product.type === 'medicine' && product.selling_type === 'per_packet' 
          ? quantity * (product.tablets_per_packet || 1) : 0,
        total_packets: product.type === 'medicine' && product.selling_type === 'per_packet' 
          ? quantity : 0,
      });

      if (itemError) throw itemError;

      // Decrement stock
      if (product.type === "medicine") {
        await supabase.rpc("decrement_medicine_quantity", {
          medicine_id: product.id,
          qty: quantity,
        });
      } else {
        await supabase.rpc("decrement_cosmetic_quantity", {
          cosmetic_id: product.id,
          qty: quantity,
        });
      }

      return {
        ...sale,
        items: [{
          item_name: product.name,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
        }],
      };
    },
    onSuccess: (data) => {
      toast.success("Quick sale completed!");
      setCompletedSale(data);
      setShowReceipt(true);
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
      queryClient.invalidateQueries({ queryKey: ["todaySales"] });
      queryClient.invalidateQueries({ queryKey: ["salesHistory"] });
      queryClient.invalidateQueries({ queryKey: ["quickProductSearch"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleClose = () => {
    setSalesmanId("");
    setQuantity(1);
    setCompletedSale(null);
    setShowReceipt(false);
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            Quick Sale
          </DialogTitle>
          <DialogDescription>
            Fast checkout for single-item transactions
          </DialogDescription>
        </DialogHeader>

        {!showReceipt ? (
          <div className="space-y-4">
            {/* Product Info */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Batch: {product.batch_no}
                  </p>
                </div>
                <Badge variant={product.type === 'medicine' ? 'default' : 'secondary'}>
                  {product.type === 'medicine' ? 'Medicine' : 'Cosmetic'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  {product.quantity} in stock
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Rack {product.rack_no}
                </span>
              </div>
            </div>

            {/* Salesman Selection */}
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

            {/* Quantity & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  max={product.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted/30 flex items-center font-medium">
                  {formatCurrency(unitPrice)}
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Amount</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => saveMutation.mutate()} 
                disabled={saveMutation.isPending || !salesmanId}
                className="flex-1 gap-2"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Complete Sale
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success Message */}
            <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
              <Check className="h-12 w-12 text-success mx-auto mb-2" />
              <h3 className="font-semibold text-lg">Sale Complete!</h3>
              <p className="text-2xl font-bold text-success mt-1">
                {formatCurrency(totalPrice)}
              </p>
            </div>

            {/* Receipt Preview (Hidden) */}
            <div className="hidden">
              <div ref={receiptRef}>
                {completedSale && (
                  <SaleReceipt 
                    saleId={completedSale.id}
                    salesmanName={completedSale.salesman_name}
                    saleDate={new Date(completedSale.sale_date || completedSale.created_at)}
                    items={[{
                      itemName: product.name,
                      batchNo: product.batch_no,
                      quantity: quantity,
                      unitPrice: unitPrice,
                      totalPrice: totalPrice,
                    }]}
                    subtotal={totalPrice}
                    tax={0}
                    total={totalPrice}
                    pharmacyInfo={pharmacySettings}
                  />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Done
              </Button>
              <Button onClick={() => handlePrint()} className="flex-1 gap-2">
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
