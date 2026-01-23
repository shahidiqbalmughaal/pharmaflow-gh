import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface BulkActionsDialogProps {
  open: boolean;
  onClose: () => void;
  actionType: "delete" | "selling_price" | "rack_no" | "expiry_date" | null;
  selectedCount: number;
  onConfirm: (value?: string | number) => void;
  isLoading?: boolean;
}

export function BulkActionsDialog({
  open,
  onClose,
  actionType,
  selectedCount,
  onConfirm,
  isLoading = false,
}: BulkActionsDialogProps) {
  const [value, setValue] = useState<string>("");

  const handleConfirm = () => {
    if (actionType === "delete") {
      onConfirm();
    } else if (actionType === "selling_price") {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) {
        return;
      }
      onConfirm(numValue);
    } else if (actionType === "expiry_date") {
      if (!value) return;
      onConfirm(value);
    } else {
      if (!value.trim()) return;
      onConfirm(value.trim());
    }
    setValue("");
  };

  const handleClose = () => {
    setValue("");
    onClose();
  };

  const getTitle = () => {
    switch (actionType) {
      case "delete":
        return "Confirm Bulk Delete";
      case "selling_price":
        return "Update Selling Price";
      case "rack_no":
        return "Update Rack Number";
      case "expiry_date":
        return "Update Expiry Date";
      default:
        return "Bulk Action";
    }
  };

  const getDescription = () => {
    switch (actionType) {
      case "delete":
        return `Are you sure you want to delete ${selectedCount} selected items? This action cannot be undone.`;
      case "selling_price":
        return `Enter the new selling price for ${selectedCount} selected items.`;
      case "rack_no":
        return `Enter the new rack number for ${selectedCount} selected items.`;
      case "expiry_date":
        return `Enter the new expiry date for ${selectedCount} selected items.`;
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {actionType === "delete" && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">{getDescription()}</p>

          {actionType === "selling_price" && (
            <div className="space-y-2">
              <Label htmlFor="price">New Selling Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter price..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          )}

          {actionType === "rack_no" && (
            <div className="space-y-2">
              <Label htmlFor="rack">New Rack Number</Label>
              <Input
                id="rack"
                type="text"
                placeholder="e.g., A1, B2..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          )}

          {actionType === "expiry_date" && (
            <div className="space-y-2">
              <Label htmlFor="expiry">New Expiry Date</Label>
              <Input
                id="expiry"
                type="date"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={actionType === "delete" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isLoading || (actionType !== "delete" && !value)}
          >
            {isLoading ? "Processing..." : actionType === "delete" ? "Delete" : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
