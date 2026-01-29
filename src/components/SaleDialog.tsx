import { useState, useEffect, useRef, useCallback, KeyboardEvent, useMemo } from "react";
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
import { Plus, Trash2, Printer, Sparkles, Loader2, X, QrCode } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { QRScanner } from "./QRScanner";
import { SaleReceipt } from "./SaleReceipt";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { usePharmacySettings } from "@/hooks/usePharmacySettings";
import { useShop } from "@/hooks/useShop";
import { cn } from "@/lib/utils";

interface InitialProduct {
  type: 'medicine' | 'cosmetic';
  id: string;
  name: string;
  batch_no: string;
  quantity: number;
  selling_price: number;
  rack_no: string;
}

interface SaleDialogProps {
  open: boolean;
  onClose: () => void;
  initialProduct?: InitialProduct | null;
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

// Create an empty row template
const createEmptyRow = (): SaleItem => ({
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
});

export function SaleDialog({ open, onClose, initialProduct }: SaleDialogProps) {
  const queryClient = useQueryClient();
  const receiptRef = useRef<HTMLDivElement>(null);
  const { currentShop } = useShop();
  const [salesmanId, setSalesmanId] = useState("");
  const [customerId, setCustomerId] = useState("walk-in");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([createEmptyRow()]);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [tax, setTax] = useState(0);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  // Refs for keyboard navigation
  const itemInputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Pharmacy settings for receipt
  const { settings: pharmacySettings } = usePharmacySettings();
  
  // AI Recommendations state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiSymptoms, setAiSymptoms] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);

  const { data: salesmen } = useQuery({
    queryKey: ["salesmen-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("salesmen_list").select("*");
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

  const { data: medicines, isLoading: medicinesLoading } = useQuery({
    queryKey: ["medicines-for-sale"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .gt("quantity", 0)
        .order("medicine_name");
      if (error) {
        console.error("Error fetching medicines:", error);
        throw error;
      }
      console.log("Fetched medicines for sale:", data?.length || 0);
      return data || [];
    },
  });

  const { data: cosmetics, isLoading: cosmeticsLoading } = useQuery({
    queryKey: ["cosmetics-for-sale"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cosmetics")
        .select("*")
        .gt("quantity", 0)
        .order("product_name");
      if (error) {
        console.error("Error fetching cosmetics:", error);
        throw error;
      }
      console.log("Fetched cosmetics for sale:", data?.length || 0);
      return data || [];
    },
  });

  // Combine all products for search - memoized to prevent unnecessary recalculations
  const allProducts = useMemo(() => {
    const medicineProducts = (medicines || []).map(m => ({ 
      ...m, 
      type: 'medicine' as const, 
      displayName: m.medicine_name 
    }));
    const cosmeticProducts = (cosmetics || []).map(c => ({ 
      ...c, 
      type: 'cosmetic' as const, 
      displayName: c.product_name 
    }));
    const combined = [...medicineProducts, ...cosmeticProducts];
    console.log("All products available for search:", combined.length);
    return combined;
  }, [medicines, cosmetics]);

  // Filter products based on search query - show all items when query is empty on focus
  const filteredProducts = useMemo(() => {
    if (searchQuery.length === 0) {
      // Show first 15 items when no search query (for immediate dropdown)
      return allProducts.slice(0, 15);
    }
    const lowerQuery = searchQuery.toLowerCase();
    return allProducts
      .filter((p: any) => {
        const name = String(p.displayName ?? "").toLowerCase();
        const batchNo = String(p.batch_no ?? "").toLowerCase();
        return name.includes(lowerQuery) || batchNo.includes(lowerQuery);
      })
      .slice(0, 15);
  }, [searchQuery, allProducts]);

  // Auto-focus on first item input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const firstInput = itemInputRefs.current[0]?.[0];
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    }
  }, [open]);

  // Apply customer discount when customer is selected
  useEffect(() => {
    if (customerId && customerId !== "walk-in") {
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

  // Handle initial product from quick search
  useEffect(() => {
    if (open && initialProduct && medicines && cosmetics) {
      const allItems = initialProduct.type === 'medicine' ? medicines : cosmetics;
      const selectedItem = allItems?.find((i: any) => i.id === initialProduct.id);
      
      if (selectedItem) {
        const isMedicine = initialProduct.type === 'medicine';
        const medicineItem = selectedItem as any;
        const sellingType = isMedicine ? (medicineItem.selling_type || 'per_tablet') : 'per_tablet';
        const tabletsPerPacket = isMedicine ? (medicineItem.tablets_per_packet || 1) : 1;
        
        let unitPrice = selectedItem.selling_price;
        if (isMedicine && sellingType === 'per_packet') {
          unitPrice = medicineItem.price_per_packet || (selectedItem.selling_price * tabletsPerPacket);
        }
        
        const newItem: SaleItem = {
          itemType: initialProduct.type,
          itemId: initialProduct.id,
          itemName: initialProduct.name,
          batchNo: initialProduct.batch_no,
          quantity: 1,
          unitPrice: unitPrice,
          totalPrice: unitPrice,
          profit: unitPrice - selectedItem.purchase_price,
          purchasePrice: selectedItem.purchase_price,
          sellingType: sellingType,
          tabletsPerPacket: tabletsPerPacket,
          totalTablets: isMedicine && sellingType === 'per_packet' ? tabletsPerPacket : 0,
          totalPackets: isMedicine && sellingType === 'per_packet' ? 1 : 0,
        };
        
        const existingIndex = saleItems.findIndex(
          (item) => item.itemId === initialProduct.id && item.itemType === initialProduct.type
        );
        
        if (existingIndex === -1) {
          // Replace empty first row or add to existing items
          if (saleItems.length === 1 && !saleItems[0].itemId) {
            setSaleItems([newItem, createEmptyRow()]);
          } else {
            setSaleItems((prev) => [...prev, newItem]);
          }
          toast.success(`${initialProduct.name} added to sale`);
        } else {
          toast.info(`${initialProduct.name} is already in the sale`);
        }
      }
    }
  }, [open, initialProduct, medicines, cosmetics]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentShop?.shop_id) throw new Error("No shop selected");
      if (!salesmanId) throw new Error("Please select a salesman");
      
      // Filter out empty rows
      const validItems = saleItems.filter(item => item.itemId);
      if (validItems.length === 0) throw new Error("Please add at least one item");

      const salesman = salesmen?.find((s) => s.id === salesmanId);
      if (!salesman) throw new Error("Salesman not found");

      for (const item of validItems) {
        if (item.quantity < 1) throw new Error("Quantity must be at least 1");
        if (item.unitPrice < 0) throw new Error(`${item.itemName}: Rate must be positive`);
        if (item.totalPrice < 0) throw new Error(`${item.itemName}: Total Price must be positive`);
        
        const calculatedTotal = item.quantity * item.unitPrice;
        const difference = Math.abs(calculatedTotal - item.totalPrice);
        if (difference >= 0.01) {
          throw new Error(
            `${item.itemName}: Total Price (${formatCurrency(item.totalPrice)}) does not match Quantity (${item.quantity}) × Rate (${formatCurrency(item.unitPrice)}) = ${formatCurrency(calculatedTotal)}`
          );
        }

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

      const subtotal = validItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      if (discountPercentage < 0) throw new Error("Discount cannot be negative");
      if (discountPercentage > 100) throw new Error("Discount cannot exceed 100%");
      
      const discountAmount = (subtotal * discountPercentage) / 100;
      
      if (tax < 0) throw new Error("Tax cannot be negative");

      const totalProfit = validItems.reduce((sum, item) => sum + item.profit, 0);
      const totalAmount = subtotal - discountAmount + tax;
      const loyaltyPointsEarned = Math.floor(totalAmount / 100);
      const customer = customerId && customerId !== "walk-in" ? customers?.find((c) => c.id === customerId) : null;

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          shop_id: currentShop.shop_id,
          salesman_id: salesmanId,
          salesman_name: salesman.name,
          customer_id: customer?.id || null,
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

      if (customer) {
        const { error: updateError } = await supabase
          .from("customers")
          .update({
            loyalty_points: (customer.loyalty_points || 0) + loyaltyPointsEarned,
            total_purchases: (customer.total_purchases || 0) + 1,
            total_spent: (Number(customer.total_spent) || 0) + totalAmount,
          })
          .eq("id", customer.id);

        if (updateError) throw updateError;
      }

      const saleItemsData = validItems.map((item) => ({
        shop_id: currentShop.shop_id,
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

      for (const item of validItems) {
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

      return { sale, salesman, validItems };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["todaySales"] });
      queryClient.invalidateQueries({ queryKey: ["medicinesSoldToday"] });
      queryClient.invalidateQueries({ queryKey: ["cosmeticsSoldToday"] });
      
      const validItems = data.validItems;
      const itemSubtotal = validItems.reduce((sum: number, item: SaleItem) => sum + item.totalPrice, 0);
      const discAmount = (itemSubtotal * discountPercentage) / 100;
      
      setCompletedSale({
        saleId: data.sale.id,
        salesmanName: data.salesman.name,
        customerName: data.sale.customer_name,
        loyaltyPointsEarned: data.sale.loyalty_points_earned,
        saleDate: new Date(data.sale.sale_date),
        items: validItems,
        subtotal: itemSubtotal,
        discountPercentage,
        discountAmount: discAmount,
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
    setCustomerId("walk-in");
    setSaleItems([createEmptyRow()]);
    setDiscountPercentage(0);
    setTax(0);
    setCompletedSale(null);
    setShowReceipt(false);
    setShowAIPanel(false);
    setAiSymptoms("");
    setAiRecommendations([]);
    setSearchQuery("");
    setActiveCell({ row: 0, col: 0 });
  };

  const handleGetAIRecommendations = async () => {
    if (!aiSymptoms.trim()) {
      toast.error("Please describe the symptoms");
      return;
    }

    setAiLoading(true);
    setAiRecommendations([]);

    try {
      const { data, error } = await supabase.functions.invoke('medicine-recommendations', {
        body: { symptoms: aiSymptoms.trim() }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAiRecommendations(data.recommendations || []);
      
      if (data.consult_doctor) {
        toast.info("Doctor consultation recommended for these symptoms");
      }
    } catch (error: any) {
      console.error('Error getting AI recommendations:', error);
      toast.error(error.message || 'Failed to get recommendations');
    } finally {
      setAiLoading(false);
    }
  };

  const addRecommendedMedicine = (rec: any) => {
    if (!rec.id) return;
    
    const medicine = medicines?.find(m => m.id === rec.id);
    if (!medicine) {
      toast.error("Medicine not found in inventory");
      return;
    }

    const sellingType = (medicine as any).selling_type || "per_tablet";
    const tabletsPerPacket = (medicine as any).tablets_per_packet || 1;

    const newItem: SaleItem = {
      itemType: "medicine",
      itemId: medicine.id,
      itemName: medicine.medicine_name,
      batchNo: medicine.batch_no,
      quantity: 1,
      unitPrice: Number(medicine.selling_price),
      totalPrice: Number(medicine.selling_price),
      profit: Number(medicine.selling_price) - Number(medicine.purchase_price),
      purchasePrice: Number(medicine.purchase_price),
      sellingType,
      tabletsPerPacket,
      totalTablets: sellingType === "per_packet" ? tabletsPerPacket : 1,
      totalPackets: sellingType === "per_packet" ? 1 : 0,
    };

    // Find the last empty row or add new one
    const emptyIndex = saleItems.findIndex(item => !item.itemId);
    if (emptyIndex !== -1) {
      const newItems = [...saleItems];
      newItems[emptyIndex] = newItem;
      newItems.push(createEmptyRow());
      setSaleItems(newItems);
    } else {
      setSaleItems([...saleItems, newItem, createEmptyRow()]);
    }
    toast.success(`Added: ${medicine.medicine_name}`);
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
      const parts = decodedText.split(":");
      const itemType = parts.length > 1 ? (parts[0] as "medicine" | "cosmetic") : "medicine";
      const itemId = parts.length > 1 ? parts[1] : decodedText;

      const allItems = itemType === "medicine" ? medicines : cosmetics;
      const item = allItems?.find((i) => i.id === itemId);

      if (item) {
        let sellingType: "per_tablet" | "per_packet" = "per_tablet";
        let tabletsPerPacket = 1;
        
        if (itemType === "medicine") {
          sellingType = (item as any).selling_type || "per_tablet";
          tabletsPerPacket = (item as any).tablets_per_packet || 1;
        }
        
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
          sellingType,
          tabletsPerPacket,
          totalTablets: sellingType === "per_packet" ? tabletsPerPacket : 1,
          totalPackets: sellingType === "per_packet" ? 1 : 0,
        };
        
        // Find empty row or add new
        const emptyIndex = saleItems.findIndex(i => !i.itemId);
        if (emptyIndex !== -1) {
          const newItems = [...saleItems];
          newItems[emptyIndex] = newItem;
          newItems.push(createEmptyRow());
          setSaleItems(newItems);
        } else {
          setSaleItems([...saleItems, newItem, createEmptyRow()]);
        }
        toast.success(`Added: ${newItem.itemName}`);
      } else {
        toast.error("Item not found");
      }
    } catch (error) {
      toast.error("Invalid QR code format");
    }
  };

  const selectProduct = useCallback((product: typeof allProducts[0], rowIndex: number) => {
    const newItems = [...saleItems];
    const isMedicine = product.type === 'medicine';
    
    const medicineItem = product as any;
    const sellingType = isMedicine ? (medicineItem.selling_type || 'per_tablet') : 'per_tablet';
    const tabletsPerPacket = isMedicine ? (medicineItem.tablets_per_packet || 1) : 1;
    
    let unitPrice = product.selling_price;
    if (isMedicine && sellingType === 'per_packet') {
      unitPrice = medicineItem.price_per_packet || (product.selling_price * tabletsPerPacket);
    }

    newItems[rowIndex] = {
      itemType: product.type,
      itemId: product.id,
      itemName: product.displayName,
      batchNo: product.batch_no,
      quantity: 1,
      unitPrice: Number(unitPrice),
      totalPrice: Number(unitPrice),
      profit: Number(unitPrice) - Number(product.purchase_price),
      purchasePrice: Number(product.purchase_price),
      sellingType,
      tabletsPerPacket,
      totalTablets: isMedicine && sellingType === 'per_packet' ? tabletsPerPacket : 1,
      totalPackets: isMedicine && sellingType === 'per_packet' ? 1 : 0,
    };

    // Ensure there's always an empty row at the end for the next item
    const hasEmptyRowAfter = newItems.slice(rowIndex + 1).some(i => !i.itemId);
    if (!hasEmptyRowAfter) {
      newItems.push(createEmptyRow());
    }

    setSaleItems(newItems);
    setSearchQuery("");
    setShowItemDropdown(false);
    
    // Move focus to quantity field
    setTimeout(() => {
      const qtyInput = itemInputRefs.current[rowIndex]?.[1];
      if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
      }
    }, 50);
  }, [saleItems]);

  const updateItemField = useCallback((index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...saleItems];
    const item = newItems[index];

    if (field === "quantity") {
      const qty = Number(value) || 1;
      if (qty < 1) return;

      if (item.itemId) {
        const allItems = item.itemType === "medicine" ? medicines : cosmetics;
        const selectedItem = allItems?.find((i) => i.id === item.itemId);
        
        if (selectedItem) {
          const requiredTablets = item.sellingType === "per_packet" && item.tabletsPerPacket 
            ? qty * item.tabletsPerPacket 
            : qty;
          
          if (requiredTablets > selectedItem.quantity) {
            toast.error(`Only ${selectedItem.quantity} units available`);
            return;
          }
        }
      }

      item.quantity = qty;
      item.totalPrice = item.unitPrice * qty;
      
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
      const rate = Number(value) || 0;
      if (rate < 0) return;
      
      item.unitPrice = rate;
      item.totalPrice = item.quantity * rate;
      item.profit = (rate - item.purchasePrice) * item.quantity;
    } else if (field === "totalPrice") {
      const total = Number(value) || 0;
      if (total < 0) return;
      
      item.totalPrice = total;
      if (item.quantity > 0) {
        item.unitPrice = total / item.quantity;
        item.profit = (item.unitPrice - item.purchasePrice) * item.quantity;
      }
    }

    setSaleItems(newItems);
  }, [saleItems, medicines, cosmetics]);

  const removeItem = useCallback((index: number) => {
    if (saleItems.length === 1) {
      setSaleItems([createEmptyRow()]);
    } else {
      setSaleItems(saleItems.filter((_, i) => i !== index));
    }
  }, [saleItems]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    const item = saleItems[rowIndex];
    
    // Handle dropdown navigation when dropdown is visible (only for item name column)
    if (colIndex === 0 && showItemDropdown && filteredProducts.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredProducts.length - 1
        );
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        selectProduct(filteredProducts[highlightedIndex], rowIndex);
        setHighlightedIndex(-1);
        return;
      }
    }
    
    // Tab key support - move between fields
    if (e.key === "Tab") {
      if (e.shiftKey) {
        // Shift+Tab - go to previous field
        if (colIndex > 0) {
          e.preventDefault();
          const prevInput = itemInputRefs.current[rowIndex]?.[colIndex - 1];
          if (prevInput) prevInput.focus();
        } else if (rowIndex > 0) {
          e.preventDefault();
          const prevInput = itemInputRefs.current[rowIndex - 1]?.[2];
          if (prevInput) prevInput.focus();
        }
      } else {
        // Tab - go to next field
        if (colIndex === 0 && item.itemId) {
          e.preventDefault();
          const nextInput = itemInputRefs.current[rowIndex]?.[1];
          if (nextInput) nextInput.focus();
        } else if (colIndex === 1) {
          e.preventDefault();
          const nextInput = itemInputRefs.current[rowIndex]?.[2];
          if (nextInput) nextInput.focus();
        } else if (colIndex === 2 && item.itemId && item.quantity > 0) {
          e.preventDefault();
          // Create new row if needed and focus it
          const hasEmptyRowAfter = saleItems.slice(rowIndex + 1).some(i => !i.itemId);
          if (!hasEmptyRowAfter) {
            const newItems = [...saleItems, createEmptyRow()];
            setSaleItems(newItems);
            setTimeout(() => {
              const nextInput = itemInputRefs.current[newItems.length - 1]?.[0];
              if (nextInput) nextInput.focus();
            }, 100);
          } else {
            const nextEmptyIndex = saleItems.findIndex((i, idx) => idx > rowIndex && !i.itemId);
            if (nextEmptyIndex !== -1) {
              setTimeout(() => {
                const nextInput = itemInputRefs.current[nextEmptyIndex]?.[0];
                if (nextInput) nextInput.focus();
              }, 50);
            }
          }
        }
      }
      return;
    }
    
    if (e.key === "Enter") {
      e.preventDefault();
      
      // If on item name column and no dropdown selection, move to quantity if item selected
      if (colIndex === 0 && item.itemId) {
        const qtyInput = itemInputRefs.current[rowIndex]?.[1];
        if (qtyInput) {
          qtyInput.focus();
          qtyInput.select();
        }
      }
      // If on quantity column, move to rate
      else if (colIndex === 1) {
        const rateInput = itemInputRefs.current[rowIndex]?.[2];
        if (rateInput) {
          rateInput.focus();
          rateInput.select();
        }
      }
      // If on rate column, save row and create new row
      else if (colIndex === 2) {
        if (item.itemId && item.quantity > 0) {
          // Always ensure there's an empty row for the next item
          const hasEmptyRowAfter = saleItems.slice(rowIndex + 1).some(i => !i.itemId);
          
          if (!hasEmptyRowAfter) {
            // Add new empty row and focus it
            const newItems = [...saleItems, createEmptyRow()];
            setSaleItems(newItems);
            
            // Focus the newly created row's item search
            setTimeout(() => {
              const nextInput = itemInputRefs.current[newItems.length - 1]?.[0];
              if (nextInput) {
                nextInput.focus();
              }
            }, 100);
          } else {
            // Find next empty row after current and focus it
            const nextEmptyIndex = saleItems.findIndex((i, idx) => idx > rowIndex && !i.itemId);
            setTimeout(() => {
              const nextInput = itemInputRefs.current[nextEmptyIndex]?.[0];
              if (nextInput) {
                nextInput.focus();
              }
            }, 50);
          }
        }
      }
    }
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextRow = rowIndex + 1;
      if (nextRow < saleItems.length) {
        const nextInput = itemInputRefs.current[nextRow]?.[colIndex];
        if (nextInput) nextInput.focus();
      }
    }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevRow = rowIndex - 1;
      if (prevRow >= 0) {
        const prevInput = itemInputRefs.current[prevRow]?.[colIndex];
        if (prevInput) prevInput.focus();
      }
    }
    else if (e.key === "ArrowRight" && colIndex < 2) {
      const input = e.target as HTMLInputElement;
      if (input.selectionStart === input.value.length) {
        e.preventDefault();
        const nextInput = itemInputRefs.current[rowIndex]?.[colIndex + 1];
        if (nextInput) nextInput.focus();
      }
    }
    else if (e.key === "ArrowLeft" && colIndex > 0) {
      const input = e.target as HTMLInputElement;
      if (input.selectionStart === 0) {
        e.preventDefault();
        const prevInput = itemInputRefs.current[rowIndex]?.[colIndex - 1];
        if (prevInput) prevInput.focus();
      }
    }
    else if (e.key === "Backspace" && colIndex === 0) {
      const input = e.target as HTMLInputElement;
      if (input.value === "" && !item.itemId && saleItems.length > 1) {
        e.preventDefault();
        removeItem(rowIndex);
        
        // Focus previous row
        if (rowIndex > 0) {
          setTimeout(() => {
            const prevInput = itemInputRefs.current[rowIndex - 1]?.[0];
            if (prevInput) prevInput.focus();
          }, 50);
        }
      }
    }
    else if (e.key === "Delete") {
      e.preventDefault();
      removeItem(rowIndex);
    }
    else if (e.key === "Escape") {
      e.preventDefault();
      if (showItemDropdown) {
        setShowItemDropdown(false);
        setHighlightedIndex(-1);
      } else if (item.itemId) {
        const newItems = [...saleItems];
        newItems[rowIndex] = createEmptyRow();
        setSaleItems(newItems);
      }
      setSearchQuery("");
    }
  }, [saleItems, removeItem, showItemDropdown, filteredProducts, highlightedIndex, selectProduct]);

  // Calculate totals
  const validItems = saleItems.filter(item => item.itemId);
  const subtotal = validItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = (subtotal * discountPercentage) / 100;
  const total = subtotal - discountAmount + tax;

  if (showReceipt && completedSale) {
    return (
      <Dialog open={open} onOpenChange={() => { onClose(); resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sale Completed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <SaleReceipt ref={receiptRef} {...completedSale} pharmacyInfo={pharmacySettings} />
            <div className="flex gap-2">
              <Button onClick={handlePrint} className="flex-1 gap-2">
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
              <Button variant="outline" onClick={() => { onClose(); resetForm(); }} className="flex-1">
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
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b bg-muted/30">
          <DialogTitle className="text-lg">New Sale</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Header Controls - Compact */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Salesman *</Label>
              <Select value={salesmanId} onValueChange={setSalesmanId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {salesmen?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Walk-in" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Discount %</Label>
              <Input
                type="number"
                className="h-8 text-sm"
                min="0"
                max="100"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Math.min(100, Math.max(0, Number(e.target.value))))}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Tax</Label>
              <Input
                type="number"
                className="h-8 text-sm"
                min="0"
                value={tax}
                onChange={(e) => setTax(Number(e.target.value))}
              />
            </div>
          </div>

          {/* AI Panel - Collapsible */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={showAIPanel ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="h-7 text-xs gap-1"
            >
              <Sparkles className="h-3 w-3" />
              AI Finder
            </Button>
            <QRScanner onScan={handleQRScan} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const hasEmptyRow = saleItems.some(i => !i.itemId);
                if (!hasEmptyRow) {
                  setSaleItems([...saleItems, createEmptyRow()]);
                }
              }}
              className="h-7 text-xs gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Row
            </Button>
          </div>

          {showAIPanel && (
            <div className="p-3 border rounded bg-muted/20 space-y-2">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Describe symptoms..."
                  value={aiSymptoms}
                  onChange={(e) => setAiSymptoms(e.target.value)}
                  rows={1}
                  className="text-sm resize-none"
                  disabled={aiLoading}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGetAIRecommendations}
                  disabled={aiLoading || !aiSymptoms.trim()}
                  className="h-8"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </div>
              {aiRecommendations.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {aiRecommendations.map((rec, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs py-0.5"
                      onClick={() => addRecommendedMedicine(rec)}
                    >
                      <Plus className="h-2.5 w-2.5 mr-0.5" />
                      {rec.medicine_name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          {/* NOTE: Outer wrapper must NOT be overflow-hidden, otherwise the item search dropdown gets clipped */}
          <div ref={tableContainerRef} className="border rounded overflow-visible bg-background">
            <table className="w-full text-base">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="text-center px-3 py-3 font-semibold text-sm w-14">S.No</th>
                  <th className="text-left px-3 py-3 font-semibold text-sm">Item Name</th>
                  <th className="text-left px-3 py-3 font-semibold text-sm w-24">Qty</th>
                  <th className="text-left px-3 py-3 font-semibold text-sm w-28">Rate</th>
                  <th className="text-left px-3 py-3 font-semibold text-sm w-28">Total</th>
                  <th className="text-center px-3 py-3 font-semibold text-sm w-12"></th>
                </tr>
              </thead>
              <tbody>
                {saleItems.map((item, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    className={cn(
                      "border-b last:border-b-0 transition-colors",
                      item.itemId ? "bg-background" : "bg-muted/10"
                    )}
                  >
                    <td className="px-3 py-2 text-center">
                      <span className="text-base text-muted-foreground font-medium">
                        {rowIndex + 1}
                      </span>
                    </td>
                    <td className="px-2 py-2 relative">
                      {item.itemId ? (
                        <div className="flex items-center gap-2 px-3 h-10 bg-muted/30 rounded">
                          <span className="truncate flex-1 text-base font-medium">{item.itemName}</span>
                          <span className="text-sm text-muted-foreground">({item.batchNo})</span>
                          <button
                            onClick={() => {
                              const newItems = [...saleItems];
                              newItems[rowIndex] = { ...createEmptyRow(), itemType: item.itemType };
                              setSaleItems(newItems);
                              setTimeout(() => {
                                const input = itemInputRefs.current[rowIndex]?.[0];
                                if (input) input.focus();
                              }, 50);
                            }}
                            className="text-muted-foreground hover:text-foreground ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Input
                            ref={(el) => {
                              if (!itemInputRefs.current[rowIndex]) {
                                itemInputRefs.current[rowIndex] = [];
                              }
                              itemInputRefs.current[rowIndex][0] = el;
                            }}
                            className="h-10 text-base border-0 shadow-none focus:ring-1"
                            placeholder="Search item..."
                            value={activeCell.row === rowIndex ? searchQuery : ""}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setShowItemDropdown(true);
                              setHighlightedIndex(-1); // Reset highlight on search change
                            }}
                            onFocus={() => {
                              setActiveCell({ row: rowIndex, col: 0 });
                              setShowItemDropdown(true); // Show dropdown immediately on focus
                              setHighlightedIndex(-1); // Reset highlight
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setShowItemDropdown(false);
                                setHighlightedIndex(-1);
                              }, 200);
                            }}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
                          />
                          {showItemDropdown && activeCell.row === rowIndex && (
                            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
                              {(medicinesLoading || cosmeticsLoading) ? (
                                <div className="px-4 py-4 text-base text-muted-foreground flex items-center gap-2">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                  Loading items...
                                </div>
                              ) : filteredProducts.length > 0 ? (
                              filteredProducts.map((product, productIndex) => (
                                  <button
                                    key={product.id}
                                    className={cn(
                                      "w-full px-4 py-3 text-left flex items-center justify-between",
                                      highlightedIndex === productIndex 
                                        ? "bg-primary text-primary-foreground" 
                                        : "hover:bg-muted"
                                    )}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      selectProduct(product, rowIndex);
                                    }}
                                    onMouseEnter={() => setHighlightedIndex(productIndex)}
                                  >
                                    <span className="truncate flex items-center">
                                      <span className={cn(
                                        "text-sm font-bold mr-3 px-2 py-1 rounded",
                                        highlightedIndex === productIndex
                                          ? "bg-primary-foreground/20 text-primary-foreground"
                                          : product.type === 'medicine'
                                            ? "bg-primary/10 text-primary"
                                            : "bg-accent/10 text-accent"
                                      )}>
                                        {product.type === 'medicine' ? 'M' : 'C'}
                                      </span>
                                      <span className="text-base font-medium">{product.displayName}</span>
                                    </span>
                                    <span className={cn(
                                      "text-sm ml-3 whitespace-nowrap",
                                      highlightedIndex === productIndex 
                                        ? "text-primary-foreground/80" 
                                        : "text-muted-foreground"
                                    )}>
                                      {formatCurrency(Number(product.selling_price))} | Qty: {product.quantity}
                                    </span>
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-4 text-base text-muted-foreground">
                                  {searchQuery ? `No items found for "${searchQuery}"` : "No items available in inventory"}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        ref={(el) => {
                          if (!itemInputRefs.current[rowIndex]) {
                            itemInputRefs.current[rowIndex] = [];
                          }
                          itemInputRefs.current[rowIndex][1] = el;
                        }}
                        type="number"
                        min="1"
                        className="h-10 text-base border-0 shadow-none focus:ring-1 text-center font-medium"
                        value={item.quantity}
                        onChange={(e) => updateItemField(rowIndex, "quantity", e.target.value)}
                        onFocus={() => setActiveCell({ row: rowIndex, col: 1 })}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, 1)}
                        disabled={!item.itemId}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        ref={(el) => {
                          if (!itemInputRefs.current[rowIndex]) {
                            itemInputRefs.current[rowIndex] = [];
                          }
                          itemInputRefs.current[rowIndex][2] = el;
                        }}
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-10 text-base border-0 shadow-none focus:ring-1 font-medium"
                        value={item.unitPrice || ""}
                        onChange={(e) => updateItemField(rowIndex, "unitPrice", e.target.value)}
                        onFocus={() => setActiveCell({ row: rowIndex, col: 2 })}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, 2)}
                        disabled={!item.itemId}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        "font-semibold text-base",
                        item.itemId ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {item.itemId ? formatCurrency(item.totalPrice) : "-"}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeItem(rowIndex)}
                        disabled={saleItems.length === 1 && !item.itemId}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <p className="text-sm text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd>/<kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Tab</kbd> next field • 
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">↑↓</kbd> navigate dropdown/rows • 
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">Del</kbd> remove row • 
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">Esc</kbd> close/clear
          </p>
        </div>

        {/* Footer - Fixed */}
        <div className="border-t bg-muted/30 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-4">
              <span>Items: <strong>{validItems.length}</strong></span>
              <span>Subtotal: <strong>{formatCurrency(subtotal)}</strong></span>
              {discountPercentage > 0 && (
                <span className="text-green-600">Discount: <strong>-{formatCurrency(discountAmount)}</strong></span>
              )}
              {tax > 0 && (
                <span>Tax: <strong>+{formatCurrency(tax)}</strong></span>
              )}
            </div>
            <div className="text-lg font-bold text-primary">
              Total: {formatCurrency(total)}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="button" 
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || validItems.length === 0 || !salesmanId}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Complete Sale
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
