import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
}

export function CosmeticCategoryManagement() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add-cat" | "edit-cat" | "add-sub" | "edit-sub">("add-cat");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["cosmetic-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cosmetic_categories")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["cosmetic-subcategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cosmetic_subcategories")
        .select("id, category_id, name")
        .order("name");
      if (error) throw error;
      return data as Subcategory[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["cosmetic-categories"] });
    queryClient.invalidateQueries({ queryKey: ["cosmetic-subcategories"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmed = inputValue.trim();
      if (!trimmed) throw new Error("Name is required");

      if (dialogMode === "add-cat") {
        const { error } = await supabase.from("cosmetic_categories").insert({ name: trimmed });
        if (error) throw error;
      } else if (dialogMode === "edit-cat") {
        const { error } = await supabase.from("cosmetic_categories").update({ name: trimmed }).eq("id", editingItem.id);
        if (error) throw error;
      } else if (dialogMode === "add-sub") {
        if (!selectedCategoryId) throw new Error("Select a category");
        const { error } = await supabase.from("cosmetic_subcategories").insert({ name: trimmed, category_id: selectedCategoryId });
        if (error) throw error;
      } else if (dialogMode === "edit-sub") {
        const { error } = await supabase.from("cosmetic_subcategories").update({ name: trimmed }).eq("id", editingItem.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Saved successfully");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cosmetic_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Category deleted"); },
    onError: () => toast.error("Failed to delete category. Make sure no products use it."),
  });

  const deleteSubMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cosmetic_subcategories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Subcategory deleted"); },
    onError: () => toast.error("Failed to delete subcategory. Make sure no products use it."),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setInputValue("");
    setSelectedCategoryId("");
  };

  const openAddCategory = () => {
    setDialogMode("add-cat");
    setInputValue("");
    setDialogOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setDialogMode("edit-cat");
    setEditingItem(cat);
    setInputValue(cat.name);
    setDialogOpen(true);
  };

  const openAddSubcategory = (categoryId?: string) => {
    setDialogMode("add-sub");
    setSelectedCategoryId(categoryId || "");
    setInputValue("");
    setDialogOpen(true);
  };

  const openEditSubcategory = (sub: Subcategory) => {
    setDialogMode("edit-sub");
    setEditingItem(sub);
    setInputValue(sub.name);
    setDialogOpen(true);
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedCategories);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedCategories(next);
  };

  const getDialogTitle = () => {
    switch (dialogMode) {
      case "add-cat": return "Add Category";
      case "edit-cat": return "Edit Category";
      case "add-sub": return "Add Subcategory";
      case "edit-sub": return "Edit Subcategory";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Cosmetic Categories</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openAddSubcategory()} className="gap-1">
              <Plus className="h-4 w-4" /> Add Subcategory
            </Button>
            <Button size="sm" onClick={openAddCategory} className="gap-1">
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Subcategories</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => {
              const subs = subcategories.filter((s) => s.category_id === cat.id);
              const isExpanded = expandedCategories.has(cat.id);
              return (
                <>
                  <TableRow key={cat.id} className="cursor-pointer" onClick={() => toggleExpand(cat.id)}>
                    <TableCell>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>{subs.length}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openEditCategory(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          if (confirm(`Delete category "${cat.name}" and all its subcategories?`))
                            deleteCatMutation.mutate(cat.id);
                        }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && subs.map((sub) => (
                    <TableRow key={sub.id} className="bg-muted/30">
                      <TableCell></TableCell>
                      <TableCell className="pl-8">↳ {sub.name}</TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditSubcategory(sub)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (confirm(`Delete subcategory "${sub.name}"?`))
                              deleteSubMutation.mutate(sub.id);
                          }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {isExpanded && subs.length === 0 && (
                    <TableRow className="bg-muted/30">
                      <TableCell></TableCell>
                      <TableCell colSpan={3} className="text-muted-foreground text-sm pl-8">
                        No subcategories.{" "}
                        <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => openAddSubcategory(cat.id)}>
                          Add one
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dialogMode === "add-sub" && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Enter name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !inputValue.trim()}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
