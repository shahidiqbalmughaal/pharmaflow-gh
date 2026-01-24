import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Camera, 
  Upload, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  FileText,
  Trash2,
  Edit2,
  Package
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useShop } from "@/hooks/useShop";

interface InvoiceInventoryDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ExtractedField {
  value: string | number | null;
  confidence: "high" | "medium" | "low";
}

interface InvoiceLineItem {
  row_number: number;
  product_name: ExtractedField;
  quantity: ExtractedField;
  purchase_price: ExtractedField;
  batch_no: ExtractedField;
  expiry_date: ExtractedField;
  line_amount: ExtractedField;
  company_name: ExtractedField;
  row_confidence: "high" | "medium" | "low";
  needs_review: boolean;
}

interface InvoiceOCRResult {
  is_invoice: boolean;
  supplier_name?: string;
  invoice_number?: string;
  invoice_date?: string;
  items: InvoiceLineItem[];
  total_items_detected: number;
  overall_confidence: "high" | "medium" | "low";
  warnings: string[];
  raw_text: string;
}

interface EditableItem {
  id: string;
  selected: boolean;
  product_name: string;
  quantity: number;
  purchase_price: number;
  batch_no: string;
  expiry_date: string;
  company_name: string;
  confidence: "high" | "medium" | "low";
  needs_review: boolean;
  isEditing: boolean;
}

type ProcessingStep = "upload" | "processing" | "preview" | "saving" | "error";

export function InvoiceInventoryDialog({ open, onClose }: InvoiceInventoryDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentShop } = useShop();
  
  const [step, setStep] = useState<ProcessingStep>("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceOCRResult | null>(null);
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [savingProgress, setSavingProgress] = useState({ current: 0, total: 0 });
  const [supplierName, setSupplierName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetDialog = () => {
    setStep("upload");
    setImagePreview(null);
    setInvoiceData(null);
    setEditableItems([]);
    setErrorMessage("");
    setSavingProgress({ current: 0, total: 0 });
    setSupplierName("");
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  const processImage = async (base64Image: string) => {
    setStep("processing");
    setErrorMessage("");

    try {
      const { data, error } = await supabase.functions.invoke("ocr-inventory", {
        body: { 
          image_base64: base64Image.split(",")[1] || base64Image,
          mode: "invoice" 
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to process image");
      }

      if (!data.success) {
        throw new Error(data.error || "Unable to extract data from image");
      }

      // Check if it's an invoice
      if (data.type === "invoice" && data.data.is_invoice) {
        const result: InvoiceOCRResult = data.data;
        setInvoiceData(result);
        setSupplierName(result.supplier_name || "");
        
        // Convert to editable items
        const items: EditableItem[] = result.items.map((item, index) => ({
          id: `item-${index}-${Date.now()}`,
          selected: true,
          product_name: String(item.product_name?.value || ""),
          quantity: Number(item.quantity?.value) || 1,
          purchase_price: Number(item.purchase_price?.value) || 0,
          batch_no: String(item.batch_no?.value || ""),
          expiry_date: String(item.expiry_date?.value || ""),
          company_name: String(item.company_name?.value || ""),
          confidence: item.row_confidence || "medium",
          needs_review: item.needs_review || false,
          isEditing: false,
        }));
        
        setEditableItems(items);
        setStep("preview");
      } else {
        // Not an invoice - inform user
        throw new Error("This doesn't appear to be a supplier invoice. Please use 'Add via Image' for single product labels.");
      }
    } catch (error) {
      console.error("Invoice OCR processing error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Unable to process invoice. Please upload a clearer image.");
      setStep("error");
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (images and PDFs)
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type) && !file.type.startsWith("image/")) {
      toast.error("Please select an image or PDF file");
      return;
    }

    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size must be less than 15MB");
      return;
    }

    // Read and process the file
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      await processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const toggleItemSelection = (itemId: string) => {
    setEditableItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const toggleAllItems = (selected: boolean) => {
    setEditableItems(items => items.map(item => ({ ...item, selected })));
  };

  const removeItem = (itemId: string) => {
    setEditableItems(items => items.filter(item => item.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof EditableItem, value: string | number | boolean) => {
    setEditableItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const toggleEditItem = (itemId: string) => {
    setEditableItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, isEditing: !item.isEditing } : item
      )
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const selectedItems = editableItems.filter(item => item.selected && item.product_name.trim());
      
      if (selectedItems.length === 0) {
        throw new Error("No items selected to save");
      }

      setSavingProgress({ current: 0, total: selectedItems.length });
      const errors: string[] = [];

      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        setSavingProgress({ current: i + 1, total: selectedItems.length });

        try {
          // Validate expiry date if provided
          if (item.expiry_date) {
            const expiryDate = new Date(item.expiry_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (expiryDate < today) {
              errors.push(`${item.product_name}: Expiry date is in the past`);
              continue;
            }
          }

          const inventoryData = {
            medicine_name: item.product_name.trim(),
            batch_no: item.batch_no || `INV-${Date.now()}-${i}`,
            company_name: item.company_name || "Unknown",
            rack_no: "TBD",
            selling_type: "per_tablet",
            quantity: item.quantity || 1,
            purchase_price: item.purchase_price || 0,
            selling_price: item.purchase_price ? item.purchase_price * 1.2 : 0, // Default 20% markup
            manufacturing_date: new Date().toISOString().split("T")[0],
            expiry_date: item.expiry_date || null,
            supplier: supplierName || "Invoice Import",
            is_narcotic: false,
            shop_id: currentShop?.shop_id || null,
          };

          const { error } = await supabase.from("medicines").insert(inventoryData);
          if (error) {
            errors.push(`${item.product_name}: ${error.message}`);
          }
        } catch (err) {
          errors.push(`${item.product_name}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      if (errors.length > 0 && errors.length === selectedItems.length) {
        throw new Error(`Failed to save all items:\n${errors.join("\n")}`);
      }

      return { 
        saved: selectedItems.length - errors.length, 
        failed: errors.length, 
        errors 
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      
      if (result.failed > 0) {
        toast.warning(`Saved ${result.saved} items. ${result.failed} items failed.`, {
          description: result.errors.slice(0, 3).join(", ") + (result.errors.length > 3 ? "..." : ""),
        });
      } else {
        toast.success(`Successfully added ${result.saved} items to inventory from invoice.`);
      }
      handleClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save inventory items");
      setStep("preview"); // Go back to preview on error
    },
  });

  const handleSave = () => {
    setStep("saving");
    saveMutation.mutate();
  };

  const getConfidenceBadge = (confidence: "high" | "medium" | "low") => {
    const colors = {
      high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded ${colors[confidence]}`}>
        {confidence}
      </span>
    );
  };

  const selectedCount = editableItems.filter(item => item.selected).length;
  const reviewCount = editableItems.filter(item => item.needs_review).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Invoice to Inventory
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Upload a supplier invoice image or PDF. Our AI will extract all line items from the invoice table and add them to your inventory.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8" />
                <span>Upload Invoice</span>
                <span className="text-xs text-muted-foreground">Image or PDF</span>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-8 w-8" />
                <span>Take Photo</span>
                <span className="text-xs text-muted-foreground">Capture invoice</span>
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="text-center text-xs text-muted-foreground">
              Supported formats: JPG, PNG, WEBP, PDF • Max size: 15MB
            </div>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            {imagePreview && !imagePreview.startsWith("data:application/pdf") && (
              <img
                src={imagePreview}
                alt="Uploaded invoice"
                className="max-h-48 rounded-lg shadow-md"
              />
            )}
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Extracting items from invoice...</p>
            <p className="text-xs text-muted-foreground">This may take up to 30 seconds for large invoices</p>
          </div>
        )}

        {/* Step 3: Error */}
        {step === "error" && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            {imagePreview && !imagePreview.startsWith("data:application/pdf") && (
              <img
                src={imagePreview}
                alt="Uploaded"
                className="max-h-48 mx-auto rounded-lg shadow-md"
              />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetDialog}>
                Try Again
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Preview & Edit Items */}
        {step === "preview" && (
          <div className="flex flex-col flex-1 min-h-0 space-y-4">
            {/* Invoice Info & Warnings */}
            <div className="space-y-3">
              {invoiceData?.warnings && invoiceData.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {invoiceData.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {editableItems.length} items detected
                    </span>
                  </div>
                  {reviewCount > 0 && (
                    <span className="text-sm text-yellow-600 dark:text-yellow-400">
                      ({reviewCount} need review)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="selectAll"
                    checked={selectedCount === editableItems.length && editableItems.length > 0}
                    onCheckedChange={(checked) => toggleAllItems(checked as boolean)}
                  />
                  <Label htmlFor="selectAll" className="text-sm cursor-pointer">
                    Select All
                  </Label>
                </div>
              </div>

              {/* Supplier Name */}
              <div className="flex items-center gap-2">
                <Label htmlFor="supplier" className="text-sm whitespace-nowrap">
                  Supplier:
                </Label>
                <Input
                  id="supplier"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Enter supplier name"
                  className="max-w-xs"
                />
              </div>
            </div>

            {/* Items List */}
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="space-y-2 p-3">
                {editableItems.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-3 transition-colors ${
                      item.selected 
                        ? item.needs_review 
                          ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
                          : "bg-background border-border"
                        : "bg-muted/30 border-muted"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        {item.isEditing ? (
                          /* Editing Mode */
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs">Product Name *</Label>
                              <Input
                                value={item.product_name}
                                onChange={(e) => updateItem(item.id, "product_name", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Purchase Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.purchase_price}
                                onChange={(e) => updateItem(item.id, "purchase_price", Number(e.target.value))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Batch No</Label>
                              <Input
                                value={item.batch_no}
                                onChange={(e) => updateItem(item.id, "batch_no", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Expiry Date</Label>
                              <Input
                                type="date"
                                value={item.expiry_date}
                                onChange={(e) => updateItem(item.id, "expiry_date", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Company</Label>
                              <Input
                                value={item.company_name}
                                onChange={(e) => updateItem(item.id, "company_name", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {item.product_name || "(No name)"}
                              </span>
                              {getConfidenceBadge(item.confidence)}
                              {item.needs_review && (
                                <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                  Needs review
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-0.5">
                              <span>Qty: {item.quantity || "-"}</span>
                              <span>Price: {item.purchase_price || "-"}</span>
                              <span>Batch: {item.batch_no || "-"}</span>
                              <span>Exp: {item.expiry_date || "-"}</span>
                            </div>
                            {item.company_name && (
                              <div className="text-xs text-muted-foreground">
                                Company: {item.company_name}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEditItem(item.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {editableItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No items extracted from the invoice.
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button type="button" variant="outline" onClick={resetDialog}>
                Scan Another Invoice
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={selectedCount === 0}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Add {selectedCount} Item{selectedCount !== 1 ? "s" : ""} to Inventory
                </Button>
              </div>
            </div>

            {/* Raw OCR Text (collapsible) */}
            {invoiceData?.raw_text && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  View Raw OCR Text
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-32">
                  {invoiceData.raw_text}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Step 5: Saving Progress */}
        {step === "saving" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Saving items to inventory...
            </p>
            <p className="text-sm font-medium">
              {savingProgress.current} / {savingProgress.total} items
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
