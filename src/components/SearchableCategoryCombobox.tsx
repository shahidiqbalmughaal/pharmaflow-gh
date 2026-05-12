import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface SearchableCategoryComboboxProps {
  id?: string;
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  /** Use virtualization when options.length exceeds this threshold */
  virtualizeThreshold?: number;
  errorMessage?: string;
}

/**
 * Reusable searchable category combobox with optional virtualization.
 * - Validates against the catalog (`options`) inline.
 * - Virtualizes the list automatically when `options.length > virtualizeThreshold`.
 */
export function SearchableCategoryCombobox({
  id,
  label,
  required,
  value,
  onChange,
  options,
  placeholder = "Search and select category...",
  virtualizeThreshold = 50,
  errorMessage,
}: SearchableCategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  const isInvalid = value.length > 0 && !options.includes(value);
  const useVirtual = filtered.length > virtualizeThreshold;

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 8,
  });

  const handleSelect = (cat: string) => {
    onChange(cat);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id}>
          {label}
          {required ? " *" : ""}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              !value && "text-muted-foreground",
              (isInvalid || errorMessage) && "border-destructive",
            )}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type to search category..."
              value={search}
              onValueChange={setSearch}
            />
            {filtered.length === 0 ? (
              <CommandEmpty>No matching category found.</CommandEmpty>
            ) : useVirtual ? (
              <div
                ref={parentRef}
                className="max-h-[280px] overflow-y-auto p-1"
                style={{ contain: "strict" }}
              >
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {virtualizer.getVirtualItems().map((vi) => {
                    const cat = filtered[vi.index];
                    const selected = value === cat;
                    return (
                      <div
                        key={cat}
                        role="option"
                        aria-selected={selected}
                        onClick={() => handleSelect(cat)}
                        className={cn(
                          "absolute left-0 top-0 flex w-full cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                          selected && "bg-accent/50",
                        )}
                        style={{
                          height: `${vi.size}px`,
                          transform: `translateY(${vi.start}px)`,
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            selected ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="truncate">{cat}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="max-h-[280px] overflow-y-auto p-1">
                {filtered.map((cat) => {
                  const selected = value === cat;
                  return (
                    <div
                      key={cat}
                      role="option"
                      aria-selected={selected}
                      onClick={() => handleSelect(cat)}
                      className={cn(
                        "flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                        selected && "bg-accent/50",
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{cat}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
      {isInvalid && (
        <p className="text-sm text-destructive">
          Selected category is not in the catalog. Please pick from the list.
        </p>
      )}
      {errorMessage && !isInvalid && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
