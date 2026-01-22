import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { 
  SELLING_TYPES, 
  getQuantityUnit, 
  getPriceUnit,
  isExpiryRequired 
} from "@/lib/medicineTypes";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Camera, Upload, Loader2, AlertTriangle, CheckCircle2, ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDuplicateDetection, type DuplicateMedicine } from "@/hooks/useDuplicateDetection";
import { useStockMerge } from "@/hooks/useStockMerge";
import { StockMergeConfirmDialog } from "@/components/StockMergeConfirmDialog";

interface ImageInventoryDialogProps {
  open: boolean;
  onClose: () => void;
}

// Schema for the extracted/editable form
const imageInventorySchema = z.object({
  medicine_name: z.string().min(1, "Product name is required"),
  batch_no: z.string().min(1, "Batch number is required"),
  company_name: z.string().optional().default(""),
  rack_no: z.string().optional().default(""),
  selling_type: z.string().default("per_tablet"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  purchase_price: z.number().optional(),
  selling_price: z.number().min(0.01, "Selling price is required"),
  manufacturing_date: z.string().optional(),
  expiry_date: z.string().optional(),
  supplier: z.string().optional().default(""),
  is_narcotic: z.boolean().default(false),
});

type ImageInventoryFormData = z.infer<typeof imageInventorySchema>;

interface ExtractedField {
  value: string | number | null;
  confidence: "high" | "medium" | "low";
}

interface OCRResult {
  product_name: ExtractedField;
  batch_no: ExtractedField;
  quantity: ExtractedField;
  expiry_date: ExtractedField;
  manufacturing_date: ExtractedField;
  purchase_price: ExtractedField;
  selling_price: ExtractedField;
  company_name: ExtractedField;
  raw_text: string;
  overall_confidence: "high" | "medium" | "low";
  warnings: string[];
}

type ProcessingStep = "upload" | "processing" | "preview" | "error";

export function ImageInventoryDialog({ open, onClose }: ImageInventoryDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { checkForDuplicate, isChecking } = useDuplicateDetection();
  const { mergeStockAsync, isMerging } = useStockMerge();
  
  const [step, setStep] = useState<ProcessingStep>("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [sellingType, setSellingType] = useState("per_tablet");
  const [isNarcotic, setIsNarcotic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Duplicate detection state
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [duplicateMedicine, setDuplicateMedicine] = useState<DuplicateMedicine | null>(null);
  const [pendingFormData, setPendingFormData] = useState<ImageInventoryFormData | null>(null);
  const [isSameNameDifferentBatch, setIsSameNameDifferentBatch] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ImageInventoryFormData>({
    resolver: zodResolver(imageInventorySchema),
    defaultValues: {
      selling_type: "per_tablet",
      is_narcotic: false,
      rack_no: "",
      supplier: "",
    },
  });

  const resetDuplicateState = () => {
    setShowMergeDialog(false);
    setDuplicateMedicine(null);
    setPendingFormData(null);
    setIsSameNameDifferentBatch(false);
  };

  const resetDialog = () => {
    setStep("upload");
    setImagePreview(null);
    setOcrResult(null);
    setErrorMessage("");
    setSellingType("per_tablet");
    setIsNarcotic(false);
    resetDuplicateState();
    reset({
      selling_type: "per_tablet",
      is_narcotic: false,
      rack_no: "",
      supplier: "",
    });
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
        body: { image_base64: base64Image.split(",")[1] || base64Image },
      });

      if (error) {
        throw new Error(error.message || "Failed to process image");
      }

      if (!data.success) {
        throw new Error(data.error || "Unable to extract data from image");
      }

      const result: OCRResult = data.data;
      setOcrResult(result);

      // Populate form with extracted values
      if (result.product_name?.value) {
        setValue("medicine_name", String(result.product_name.value));
      }
      if (result.batch_no?.value) {
        setValue("batch_no", String(result.batch_no.value));
      }
      if (result.company_name?.value) {
        setValue("company_name", String(result.company_name.value));
      }
      if (result.quantity?.value) {
        setValue("quantity", Number(result.quantity.value));
      }
      if (result.selling_price?.value) {
        setValue("selling_price", Number(result.selling_price.value));
      }
      if (result.purchase_price?.value) {
        setValue("purchase_price", Number(result.purchase_price.value));
      }
      if (result.expiry_date?.value) {
        setValue("expiry_date", String(result.expiry_date.value));
      }
      if (result.manufacturing_date?.value) {
        setValue("manufacturing_date", String(result.manufacturing_date.value));
      }

      setStep("preview");
    } catch (error) {
      console.error("OCR processing error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Unable to read text from image. Please upload a clearer photo.");
      setStep("error");
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB");
      return;
    }

    // Read and preview the image
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      await processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: ImageInventoryFormData) => {
      // Validate expiry date is not in the past
      if (data.expiry_date) {
        const expiryDate = new Date(data.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate < today) {
          throw new Error("Expiry date cannot be in the past");
        }
      }

      // Check if expiry is required for this selling type
      const expiryRequired = isExpiryRequired(data.selling_type);
      if (expiryRequired && !data.expiry_date) {
        throw new Error("Expiry date is required for this item type");
      }

      const inventoryData = {
        medicine_name: data.medicine_name,
        batch_no: data.batch_no,
        company_name: data.company_name || "Unknown",
        rack_no: data.rack_no || "TBD",
        selling_type: data.selling_type,
        quantity: data.quantity,
        purchase_price: data.purchase_price || data.selling_price * 0.8, // Default to 80% of selling price
        selling_price: data.selling_price,
        manufacturing_date: data.manufacturing_date || new Date().toISOString().split("T")[0],
        expiry_date: data.expiry_date || null,
        supplier: data.supplier || "Unknown",
        is_narcotic: data.is_narcotic,
      };

      const { error } = await supabase.from("medicines").insert(inventoryData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success(isSameNameDifferentBatch ? "New batch added successfully to inventory." : "Inventory item added successfully from image.");
      handleClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save inventory item");
    },
  });

  const onSubmit = async (data: ImageInventoryFormData) => {
    // Check for duplicates before saving
    const result = await checkForDuplicate(data.medicine_name, data.batch_no);
    
    if (result.isDuplicate && result.existingMedicine) {
      // Show merge confirmation dialog
      setDuplicateMedicine(result.existingMedicine);
      setPendingFormData(data);
      setShowMergeDialog(true);
      return;
    }

    if (result.isSameNameDifferentBatch) {
      setIsSameNameDifferentBatch(true);
    }

    // No duplicate - proceed with save
    saveMutation.mutate(data);
  };

  const handleConfirmMerge = async () => {
    if (!duplicateMedicine || !pendingFormData) return;

    try {
      await mergeStockAsync({
        existingMedicine: duplicateMedicine,
        newData: {
          medicine_name: pendingFormData.medicine_name,
          batch_no: pendingFormData.batch_no,
          quantity: pendingFormData.quantity,
          selling_price: pendingFormData.selling_price,
          purchase_price: pendingFormData.purchase_price || pendingFormData.selling_price * 0.8,
          expiry_date: pendingFormData.expiry_date,
          manufacturing_date: pendingFormData.manufacturing_date,
        },
        mergedBy: user?.email || "Unknown",
      });
      handleClose();
    } catch (error) {
      console.error("Merge failed:", error);
    }
  };

  const handleCancelMerge = () => {
    resetDuplicateState();
    // Keep form open for user to edit
  };

  const getConfidenceBadge = (confidence: "high" | "medium" | "low" | undefined) => {
    if (!confidence) return null;
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

  const quantityUnit = getQuantityUnit(sellingType);
  const priceUnit = getPriceUnit(sellingType);

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Add Inventory via Image
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Upload or capture a photo of the medicine box/label. Our AI will extract the product information automatically.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8" />
                <span>Upload Image</span>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-8 w-8" />
                <span>Take Photo</span>
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
              Supported formats: JPG, PNG, WEBP • Max size: 10MB
            </div>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Uploaded"
                className="max-h-48 rounded-lg shadow-md"
              />
            )}
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Processing image with OCR...</p>
            <p className="text-xs text-muted-foreground">This may take a few seconds</p>
          </div>
        )}

        {/* Step 3: Error */}
        {step === "error" && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            {imagePreview && (
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

        {/* Step 4: Preview & Edit */}
        {step === "preview" && (
          <div className="space-y-4">
            {/* Same Name Different Batch Warning */}
            {isSameNameDifferentBatch && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  A product with this name exists but with a different batch. This will be saved as a new batch entry.
                </AlertDescription>
              </Alert>
            )}
            
            {/* OCR Warnings */}
            {ocrResult?.warnings && ocrResult.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {ocrResult.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Image preview (small) */}
            {imagePreview && (
              <div className="flex justify-center">
                <img
                  src={imagePreview}
                  alt="Uploaded"
                  className="max-h-32 rounded-lg shadow-sm"
                />
              </div>
            )}

            {/* Editable Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="medicine_name">Product Name *</Label>
                    {getConfidenceBadge(ocrResult?.product_name?.confidence)}
                  </div>
                  <Input id="medicine_name" {...register("medicine_name")} />
                  {errors.medicine_name && (
                    <p className="text-sm text-destructive">{errors.medicine_name.message}</p>
                  )}
                </div>

                {/* Batch Number */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="batch_no">Batch Number *</Label>
                    {getConfidenceBadge(ocrResult?.batch_no?.confidence)}
                  </div>
                  <Input id="batch_no" {...register("batch_no")} />
                  {errors.batch_no && (
                    <p className="text-sm text-destructive">{errors.batch_no.message}</p>
                  )}
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    {getConfidenceBadge(ocrResult?.company_name?.confidence)}
                  </div>
                  <Input id="company_name" {...register("company_name")} />
                </div>

                {/* Rack Number */}
                <div className="space-y-2">
                  <Label htmlFor="rack_no">Rack No</Label>
                  <Input id="rack_no" {...register("rack_no")} placeholder="e.g., A1, B2" />
                </div>

                {/* Selling Type */}
                <div className="space-y-2">
                  <Label htmlFor="selling_type">Selling Type</Label>
                  <Select
                    value={sellingType}
                    onValueChange={(value) => {
                      setSellingType(value);
                      setValue("selling_type", value);
                    }}
                  >
                    <SelectTrigger id="selling_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {SELLING_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Is Narcotic */}
                <div className="space-y-2 flex items-end">
                  <div className="flex items-center space-x-2 pb-2">
                    <Checkbox
                      id="is_narcotic"
                      checked={isNarcotic}
                      onCheckedChange={(checked) => {
                        setIsNarcotic(checked as boolean);
                        setValue("is_narcotic", checked as boolean);
                      }}
                    />
                    <Label htmlFor="is_narcotic" className="text-sm cursor-pointer">
                      Narcotic / Controlled Substance
                    </Label>
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="quantity">Quantity ({quantityUnit}) *</Label>
                    {getConfidenceBadge(ocrResult?.quantity?.confidence)}
                  </div>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    {...register("quantity", { valueAsNumber: true })}
                  />
                  {errors.quantity && (
                    <p className="text-sm text-destructive">{errors.quantity.message}</p>
                  )}
                </div>

                {/* Selling Price */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="selling_price">Selling Price ({priceUnit}) *</Label>
                    {getConfidenceBadge(ocrResult?.selling_price?.confidence)}
                  </div>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...register("selling_price", { valueAsNumber: true })}
                  />
                  {errors.selling_price && (
                    <p className="text-sm text-destructive">{errors.selling_price.message}</p>
                  )}
                </div>

                {/* Purchase Price */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="purchase_price">Purchase Price ({priceUnit})</Label>
                    {getConfidenceBadge(ocrResult?.purchase_price?.confidence)}
                  </div>
                  <Input
                    id="purchase_price"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("purchase_price", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">Optional - defaults to 80% of selling price</p>
                </div>

                {/* Supplier */}
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input id="supplier" {...register("supplier")} />
                </div>

                {/* Manufacturing Date */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="manufacturing_date">Manufacturing Date</Label>
                    {getConfidenceBadge(ocrResult?.manufacturing_date?.confidence)}
                  </div>
                  <Input
                    id="manufacturing_date"
                    type="date"
                    {...register("manufacturing_date")}
                  />
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="expiry_date">
                      Expiry Date {isExpiryRequired(sellingType) ? "*" : "(Optional)"}
                    </Label>
                    {getConfidenceBadge(ocrResult?.expiry_date?.confidence)}
                  </div>
                  <Input
                    id="expiry_date"
                    type="date"
                    {...register("expiry_date")}
                  />
                  {errors.expiry_date && (
                    <p className="text-sm text-destructive">{errors.expiry_date.message}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetDialog}>
                  Scan Another Image
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending || isChecking}>
                    {isChecking ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : saveMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirm & Save to Inventory
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>

            {/* Raw OCR Text (collapsible for debugging) */}
            {ocrResult?.raw_text && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  View Raw OCR Text
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap">
                  {ocrResult.raw_text}
                </pre>
              </details>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Merge Confirmation Dialog */}
    <StockMergeConfirmDialog
      open={showMergeDialog}
      onClose={() => setShowMergeDialog(false)}
      onConfirmMerge={handleConfirmMerge}
      onCancel={handleCancelMerge}
      existingMedicine={duplicateMedicine}
      newData={{
        quantity: pendingFormData?.quantity || 0,
        selling_price: pendingFormData?.selling_price || 0,
        purchase_price: pendingFormData?.purchase_price || pendingFormData?.selling_price || 0,
        expiry_date: pendingFormData?.expiry_date,
      }}
      isMerging={isMerging}
    />
    </>
  );
}
