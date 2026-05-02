import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface FindReplaceDialogProps {
  open: boolean;
  onClose: () => void;
}

const FIELDS = [
  { value: "medicine_name", label: "Product Name" },
  { value: "supplier", label: "Supplier" },
  { value: "company_name", label: "Company" },
  { value: "rack_no", label: "Rack" },
  { value: "selling_type", label: "Selling Type" },
  { value: "purchase_price", label: "Purchase Price" },
  { value: "selling_price", label: "Selling Price" },
];

export function FindReplaceDialog({ open, onClose }: FindReplaceDialogProps) {
  const [field, setField] = useState("supplier");
  const [findValue, setFindValue] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const queryClient = useQueryClient();

  const isNumericField = field === "purchase_price" || field === "selling_price";

  const mutation = useMutation({
    mutationFn: async () => {
      if (!findValue.trim()) throw new Error("Find value is required");
      if (!replaceValue.trim()) throw new Error("Replace value is required");

      // For numeric fields, validate numbers
      if (isNumericField) {
        const num = Number(replaceValue);
        if (isNaN(num) || num < 0) throw new Error("Replace value must be a valid positive number");
      }

      // First find matching records (case-insensitive for text fields)
      let query = supabase.from("medicines").select("id");
      
      if (isNumericField) {
        query = query.eq(field, Number(findValue));
      } else {
        query = query.ilike(field, findValue.trim());
      }

      const { data: matches, error: findError } = await query;
      if (findError) throw findError;
      if (!matches || matches.length === 0) throw new Error("No matching medicines found");

      const ids = matches.map(m => m.id);
      const updateValue = isNumericField ? Number(replaceValue) : replaceValue.trim();

      const { error: updateError } = await supabase
        .from("medicines")
        .update({ [field]: updateValue })
        .in("id", ids);

      if (updateError) throw updateError;
      return matches.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["medicines-count"] });
      toast.success(`Updated ${count} medicine(s) successfully`);
      setFindValue("");
      setReplaceValue("");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update");
    },
  });

  const fieldLabel = FIELDS.find(f => f.value === field)?.label || field;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Find & Replace</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Field</Label>
            <Select value={field} onValueChange={setField}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELDS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Find (exact match, case-insensitive)</Label>
            <Input
              placeholder={isNumericField ? "e.g. 25.00" : `e.g. ${fieldLabel === "Supplier" ? "PA" : fieldLabel}`}
              value={findValue}
              onChange={(e) => setFindValue(e.target.value)}
              type={isNumericField ? "number" : "text"}
            />
          </div>

          <div className="space-y-2">
            <Label>Replace with</Label>
            <Input
              placeholder={isNumericField ? "e.g. 30.00" : `e.g. ${fieldLabel === "Supplier" ? "Pakistan Agencies" : "New value"}`}
              value={replaceValue}
              onChange={(e) => setReplaceValue(e.target.value)}
              type={isNumericField ? "number" : "text"}
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">
              This will update ALL medicines matching the find value, not just selected ones.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !findValue.trim() || !replaceValue.trim()}
          >
            {mutation.isPending ? "Applying..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
