import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { AlertTriangle, Package, GitMerge, ArrowRight } from "lucide-react";
import type { DuplicateMedicine } from "@/hooks/useDuplicateDetection";

interface StockMergeConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirmMerge: () => void;
  onCancel: () => void;
  existingMedicine: DuplicateMedicine | null;
  newData: {
    quantity: number;
    selling_price: number;
    purchase_price: number;
    expiry_date?: string | null;
  };
  isMerging: boolean;
}

export function StockMergeConfirmDialog({
  open,
  onClose,
  onConfirmMerge,
  onCancel,
  existingMedicine,
  newData,
  isMerging,
}: StockMergeConfirmDialogProps) {
  if (!existingMedicine) return null;

  const newTotalQuantity = existingMedicine.quantity + newData.quantity;
  const priceChanged = existingMedicine.selling_price !== newData.selling_price;
  
  // Check if expiry dates differ significantly (more than 30 days)
  const expiryDifferSignificantly = () => {
    if (!existingMedicine.expiry_date || !newData.expiry_date) return false;
    const existingDate = new Date(existingMedicine.expiry_date);
    const newDate = new Date(newData.expiry_date);
    const diffDays = Math.abs((existingDate.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  };

  const isExistingExpired = () => {
    if (!existingMedicine.expiry_date) return false;
    const expiryDate = new Date(existingMedicine.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiryDate < today;
  };

  const showExpiryWarning = expiryDifferSignificantly();
  const isExpired = isExistingExpired();

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Duplicate Batch Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-4">
            <p>
              This product with the same batch already exists in inventory. Do you want to merge quantities into existing stock?
            </p>

            {/* Existing Stock Info */}
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Package className="h-4 w-4" />
                Existing Stock
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Product:</span>
                  <p className="font-medium text-foreground">{existingMedicine.medicine_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Batch:</span>
                  <p className="font-medium text-foreground">{existingMedicine.batch_no}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Qty:</span>
                  <Badge variant="secondary" className="ml-1">{existingMedicine.quantity}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-medium text-foreground ml-1">
                    {formatCurrency(existingMedicine.selling_price)}
                  </span>
                </div>
                {existingMedicine.expiry_date && (
                  <div>
                    <span className="text-muted-foreground">Expiry:</span>
                    <span className={`font-medium ml-1 ${isExpired ? "text-destructive" : "text-foreground"}`}>
                      {existingMedicine.expiry_date}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Merge Preview */}
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <div className="flex items-center justify-center gap-3 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Current</p>
                  <p className="text-lg font-bold">{existingMedicine.quantity}</p>
                </div>
                <span className="text-muted-foreground">+</span>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Adding</p>
                  <p className="text-lg font-bold text-primary">{newData.quantity}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">New Total</p>
                  <p className="text-lg font-bold text-primary">{newTotalQuantity}</p>
                </div>
              </div>

              {priceChanged && (
                <div className="mt-3 pt-3 border-t border-primary/20 text-center text-sm">
                  <span className="text-muted-foreground">Price will update: </span>
                  <span className="line-through text-muted-foreground">
                    {formatCurrency(existingMedicine.selling_price)}
                  </span>
                  <ArrowRight className="inline h-3 w-3 mx-1" />
                  <span className="font-medium text-primary">
                    {formatCurrency(newData.selling_price)}
                  </span>
                </div>
              )}
            </div>

            {/* Warnings */}
            {isExpired && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The existing batch has already expired. Consider updating the expiry date or creating a new batch.
                </AlertDescription>
              </Alert>
            )}

            {showExpiryWarning && !isExpired && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Expiry dates differ significantly between existing stock and new entry.
                </AlertDescription>
              </Alert>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isMerging}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirmMerge}
            disabled={isMerging || isExpired}
            className="gap-2"
          >
            <GitMerge className="h-4 w-4" />
            {isMerging ? "Merging..." : "Merge & Update Stock"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
