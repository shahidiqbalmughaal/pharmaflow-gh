import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Pill, MapPin, Package, Calendar, X, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Medicine {
  id: string;
  medicine_name: string;
  batch_no: string;
  company_name: string;
  quantity: number;
  selling_price: number;
  rack_no: string;
  expiry_date: string;
}

interface QuickMedicineSearchProps {
  onSelectMedicine?: (medicine: Medicine) => void;
}

export function QuickMedicineSearch({ onSelectMedicine }: QuickMedicineSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: medicines, isLoading } = useQuery({
    queryKey: ['quickMedicineSearch', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim() || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('medicines')
        .select('id, medicine_name, batch_no, company_name, quantity, selling_price, rack_no, expiry_date')
        .or(`medicine_name.ilike.%${searchTerm}%,batch_no.ilike.%${searchTerm}%`)
        .gt('quantity', 0)
        .order('medicine_name')
        .limit(8);
      
      if (error) throw error;
      return data as Medicine[];
    },
    enabled: searchTerm.length >= 2,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [medicines]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!medicines?.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < medicines.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (medicines[selectedIndex]) {
          handleSelect(medicines[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (medicine: Medicine) => {
    onSelectMedicine?.(medicine);
    setSearchTerm('');
    setIsOpen(false);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    return expiry <= sixMonthsFromNow;
  };

  const isLowStock = (quantity: number) => quantity < 10;

  return (
    <div ref={containerRef} className="relative w-full sm:w-80">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search medicine by name or batch..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 bg-background border-border"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && searchTerm.length >= 2 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto shadow-lg border-border">
          <CardContent className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </div>
            ) : medicines && medicines.length > 0 ? (
              <div className="space-y-1">
                {medicines.map((medicine, index) => (
                  <div
                    key={medicine.id}
                    onClick={() => handleSelect(medicine)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-colors",
                      index === selectedIndex
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Pill className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-medium truncate">{medicine.medicine_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {medicine.company_name} • Batch: {medicine.batch_no}
                        </p>
                      </div>
                      <span className="font-semibold text-primary text-sm">
                        {formatCurrency(medicine.selling_price)}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Package className="h-3 w-3" />
                        {medicine.quantity} in stock
                        {isLowStock(medicine.quantity) && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0 ml-1">
                            Low
                          </Badge>
                        )}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {medicine.rack_no}
                      </span>
                      <span className={cn(
                        "flex items-center gap-1",
                        isExpiringSoon(medicine.expiry_date) ? "text-warning" : "text-muted-foreground"
                      )}>
                        <Calendar className="h-3 w-3" />
                        {format(new Date(medicine.expiry_date), 'MMM yyyy')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-muted-foreground text-sm">
                No medicines found for "{searchTerm}"
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
