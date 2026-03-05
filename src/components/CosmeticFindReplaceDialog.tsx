import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCosmeticCategories } from "@/hooks/useCosmeticCategories";
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

interface CosmeticFindReplaceDialogProps {
  open: boolean;
  onClose: () => void;
}

const FIELDS = [
  { value: "brand", label: "Brand" },
  { value: "supplier", label: "Supplier" },
  { value: "rack_no", label: "Rack Number" },
  { value: "category_id", label: "Category" },
  { value: "subcategory_id", label: "Sub Category" },
  { value: "purchase_price", label: "Purchase Price" },
  { value: "selling_price", label: "Selling Price" },
];

export function CosmeticFindReplaceDialog({ open, onClose }: CosmeticFindReplaceDialogProps) {
  const [field, setField] = useState("brand");
  const [findValue, setFindValue] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const queryClient = useQueryClient();
  const { categories, subcategories } = useCosmeticCategories();

  const isNumericField = field === "purchase_price" || field === "selling_price";
  const isCategoryField = field === "category_id" || field === "subcategory_id";

  const mutation = useMutation({
    mutationFn: async () => {
      if (!findValue.trim()) throw new Error("Find value is required");
      if (!replaceValue.trim()) throw new Error("Replace value is required");

      if (isNumericField) {
        const num = Number(replaceValue);
        if (isNaN(num) || num < 0) throw new Error("Replace value must be a valid positive number");
      }

      let query = supabase.from("cosmetics").select("id");

      if (isNumericField) {
        query = query.eq(field, Number(findValue));
      } else if (isCategoryField) {
        query = query.eq(field, findValue);
      } else {
        query = query.ilike(field, findValue.trim());
      }

      const { data: matches, error: findError } = await query;
      if (findError) throw findError;
      if (!matches || matches.length === 0) throw new Error("No matching cosmetics found");

      const ids = matches.map((m) => m.id);
      const updateValue = isNumericField ? Number(replaceValue) : replaceValue.trim();

      const { error: updateError } = await supabase
        .from("cosmetics")
        .update({ [field]: updateValue })
        .in("id", ids);

      if (updateError) throw updateError;
      return matches.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
      toast.success(`Updated ${count} cosmetic(s) successfully`);
      setFindValue("");
      setReplaceValue("");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update");
    },
  });

  const renderValueInput = (label: string, value: string, onChange: (v: string) => void) => {
    if (field === "category_id") {
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (field === "subcategory_id") {
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
          <SelectContent>
            {subcategories.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    return (
      <Input
        placeholder={isNumericField ? "e.g. 25.00" : `Enter ${label.toLowerCase()}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={isNumericField ? "number" : "text"}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Find & Replace (Cosmetics)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Field</Label>
            <Select value={field} onValueChange={(v) => { setField(v); setFindValue(""); setReplaceValue(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELDS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Find</Label>
            {renderValueInput("find", findValue, setFindValue)}
          </div>

          <div className="space-y-2">
            <Label>Replace with</Label>
            {renderValueInput("replace", replaceValue, setReplaceValue)}
          </div>

          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">
              This will update ALL cosmetics matching the find value.
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
