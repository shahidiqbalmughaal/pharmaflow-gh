import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { getSellingTypeLabel, getQuantityUnit } from "@/lib/medicineTypes";
import { format } from "date-fns";
import { isExpired, isExpiringWithinDays } from "@/hooks/useFEFOSelection";
import { cn } from "@/lib/utils";

interface MedicineCardProps {
  medicine: any;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  lowStockThreshold?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  batchCount?: number;
}

export function MedicineCard({
  medicine,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  lowStockThreshold = 10,
  isExpanded,
  onToggleExpand,
  batchCount,
}: MedicineCardProps) {
  const sellingType = medicine.selling_type || "per_tablet";
  const isNarcotic = medicine.is_narcotic || false;
  const quantityUnit = getQuantityUnit(sellingType);
  
  const expired = isExpired(medicine.expiry_date);
  const expiringSoon = !expired && isExpiringWithinDays(medicine.expiry_date, 60);
  const lowStock = medicine.quantity <= lowStockThreshold;

  const getRowClassName = () => {
    if (expired) return "bg-destructive/20 border-destructive";
    if (lowStock) return "bg-red-50 dark:bg-red-950/30 border-red-200";
    if (expiringSoon) return "bg-orange-50 dark:bg-orange-950/30 border-orange-200";
    return "bg-card border-border";
  };

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3 transition-colors",
      getRowClassName(),
      expired && "opacity-75"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            disabled={expired}
          />
          <div>
            <div className="font-medium flex items-center gap-2 flex-wrap">
              {medicine.medicine_name}
              {isNarcotic && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Narcotic
                </Badge>
              )}
              {expired && (
                <Badge variant="destructive" className="text-xs">Expired</Badge>
              )}
              {expiringSoon && !expired && (
                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                  Expiring Soon
                </Badge>
              )}
              {lowStock && !expired && (
                <Badge variant="outline" className="text-xs border-red-500 text-red-600">
                  Low Stock
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Batch: {medicine.batch_no} | {medicine.company_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {batchCount && batchCount > 1 && onToggleExpand && (
            <Button variant="ghost" size="icon" onClick={onToggleExpand}>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            disabled={expired}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Quantity:</span>{" "}
          <span className={cn("font-medium", lowStock && "text-destructive")}>
            {medicine.quantity} {quantityUnit !== "Units" ? quantityUnit : ""}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Rack:</span>{" "}
          <span className="font-medium">{medicine.rack_no}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Price:</span>{" "}
          <span className="font-medium">{formatCurrency(Number(medicine.selling_price))}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Expiry:</span>{" "}
          <span className={cn("font-medium", expired && "text-destructive", expiringSoon && "text-orange-600")}>
            {medicine.expiry_date
              ? format(new Date(medicine.expiry_date), "MMM dd, yyyy")
              : "N/A"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Type:</span>{" "}
          <span className="font-medium">{getSellingTypeLabel(sellingType)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Supplier:</span>{" "}
          <span className="font-medium">{medicine.supplier || "N/A"}</span>
        </div>
      </div>
    </div>
  );
}
