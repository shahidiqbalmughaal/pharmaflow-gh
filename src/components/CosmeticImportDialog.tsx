import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { useCosmeticCategories } from "@/hooks/useCosmeticCategories";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface CosmeticImportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ImportRow {
  product_name: string;
  category: string;
  subcategory: string;
  brand: string;
  batch_no: string;
  rack_no: string;
  quantity: string;
  purchase_price: string;
  selling_price: string;
  manufacturing_date: string;
  expiry_date: string;
  supplier: string;
  errors: string[];
  category_id?: string;
  subcategory_id?: string;
}

export function CosmeticImportDialog({ open, onClose }: CosmeticImportDialogProps) {
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { currentShop } = useShop();
  const { categories, subcategories } = useCosmeticCategories();

  const downloadTemplate = () => {
    const headers = "Product Name,Category,Sub Category,Brand,Batch No,Rack No,Quantity,Purchase Price,Selling Price,Manufacturing Date,Expiry Date,Supplier";
    const sample = "Fair & Lovely Cream,Skincare,Face Cream / Moisturizer,Fair & Lovely,FL-001,R1,50,120,150,2025-01-01,2026-12-31,ABC Traders";
    const csv = headers + "\n" + sample;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cosmetics-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split("\n").filter((l) => l.trim());
    return lines.map((line) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; }
        else { current += char; }
      }
      result.push(current.trim());
      return result;
    });
  };

  const validateRow = (row: string[]): ImportRow => {
    const errors: string[] = [];
    const [product_name, category, subcategory, brand, batch_no, rack_no, quantity, purchase_price, selling_price, manufacturing_date, expiry_date, supplier] = row;

    if (!product_name) errors.push("Product name required");
    if (!category) errors.push("Category required");
    if (!subcategory) errors.push("Sub category required");
    if (!brand) errors.push("Brand required");
    if (!batch_no) errors.push("Batch no required");
    if (!rack_no) errors.push("Rack no required");

    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) errors.push("Invalid quantity");

    const pp = Number(purchase_price);
    if (isNaN(pp) || pp <= 0) errors.push("Invalid purchase price");

    const sp = Number(selling_price);
    if (isNaN(sp) || sp <= 0) errors.push("Invalid selling price");

    if (!manufacturing_date || isNaN(Date.parse(manufacturing_date))) errors.push("Invalid manufacturing date");
    if (!expiry_date || isNaN(Date.parse(expiry_date))) errors.push("Invalid expiry date");
    if (!supplier) errors.push("Supplier required");

    // Match category
    const matchedCat = categories.find((c) => c.name.toLowerCase() === (category || "").toLowerCase());
    if (!matchedCat && category) errors.push(`Category "${category}" not found`);

    let matchedSub: any = null;
    if (matchedCat) {
      matchedSub = subcategories.find(
        (s) => s.category_id === matchedCat.id && s.name.toLowerCase() === (subcategory || "").toLowerCase()
      );
      if (!matchedSub && subcategory) errors.push(`Subcategory "${subcategory}" not found under "${category}"`);
    }

    return {
      product_name: product_name || "",
      category: category || "",
      subcategory: subcategory || "",
      brand: brand || "",
      batch_no: batch_no || "",
      rack_no: rack_no || "",
      quantity: quantity || "0",
      purchase_price: purchase_price || "0",
      selling_price: selling_price || "0",
      manufacturing_date: manufacturing_date || "",
      expiry_date: expiry_date || "",
      supplier: supplier || "",
      errors,
      category_id: matchedCat?.id,
      subcategory_id: matchedSub?.id,
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      // Skip header row
      const dataRows = rows.slice(1);
      const validated = dataRows.map(validateRow);
      setParsedRows(validated);
    };
    reader.readAsText(file);
  };

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

  const importMutation = useMutation({
    mutationFn: async () => {
      const inserts = validRows.map((r) => ({
        product_name: r.product_name,
        category_id: r.category_id!,
        subcategory_id: r.subcategory_id!,
        brand: r.brand,
        batch_no: r.batch_no,
        rack_no: r.rack_no,
        quantity: Number(r.quantity),
        purchase_price: Number(r.purchase_price),
        selling_price: Number(r.selling_price),
        manufacturing_date: r.manufacturing_date,
        expiry_date: r.expiry_date,
        supplier: r.supplier,
        shop_id: currentShop?.shop_id || null,
      }));

      const { error } = await supabase.from("cosmetics").insert(inserts);
      if (error) throw error;
      return inserts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
      toast.success(`Imported ${count} cosmetic(s) successfully`);
      handleReset();
      onClose();
    },
    onError: () => {
      toast.error("Failed to import cosmetics");
    },
  });

  const handleReset = () => {
    setParsedRows([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Cosmetics</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" /> Download Template
            </Button>
          </div>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer"
            />
            {fileName && <p className="text-sm text-muted-foreground">File: {fileName}</p>}
          </div>

          {parsedRows.length > 0 && (
            <>
              <div className="flex gap-2">
                <Badge variant="default">{validRows.length} valid</Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="destructive">{invalidRows.length} with errors</Badge>
                )}
              </div>

              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Sub Category</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, i) => (
                      <TableRow key={i} className={row.errors.length > 0 ? "bg-destructive/10" : ""}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{row.product_name}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.subcategory}</TableCell>
                        <TableCell>{row.brand}</TableCell>
                        <TableCell>{row.quantity}</TableCell>
                        <TableCell>
                          {row.errors.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-destructive" />
                              <span className="text-xs text-destructive">{row.errors.join(", ")}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs">Valid</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { handleReset(); onClose(); }}>Cancel</Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || validRows.length === 0}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {importMutation.isPending ? "Importing..." : `Import ${validRows.length} Item(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
