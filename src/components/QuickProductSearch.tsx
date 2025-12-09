import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Pill, Sparkles, MapPin, Package, Calendar, X, Loader2 } from 'lucide-react';
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

interface Cosmetic {
  id: string;
  product_name: string;
  batch_no: string;
  brand: string;
  quantity: number;
  selling_price: number;
  rack_no: string;
  expiry_date: string;
}

type Product = (Medicine & { type: 'medicine' }) | (Cosmetic & { type: 'cosmetic' });

interface QuickProductSearchProps {
  onSelectProduct?: (product: Product) => void;
}

export function QuickProductSearch({ onSelectProduct }: QuickProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'medicine' | 'cosmetic'>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['quickProductSearch', searchTerm, searchType],
    queryFn: async () => {
      if (!searchTerm.trim() || searchTerm.length < 2) return [];
      
      const results: Product[] = [];

      // Search medicines
      if (searchType === 'all' || searchType === 'medicine') {
        const { data: medicines, error: medError } = await supabase
          .from('medicines')
          .select('id, medicine_name, batch_no, company_name, quantity, selling_price, rack_no, expiry_date')
          .or(`medicine_name.ilike.%${searchTerm}%,batch_no.ilike.%${searchTerm}%`)
          .gt('quantity', 0)
          .order('medicine_name')
          .limit(searchType === 'all' ? 5 : 8);
        
        if (!medError && medicines) {
          results.push(...medicines.map(m => ({ ...m, type: 'medicine' as const })));
        }
      }

      // Search cosmetics
      if (searchType === 'all' || searchType === 'cosmetic') {
        const { data: cosmetics, error: cosError } = await supabase
          .from('cosmetics')
          .select('id, product_name, batch_no, brand, quantity, selling_price, rack_no, expiry_date')
          .or(`product_name.ilike.%${searchTerm}%,batch_no.ilike.%${searchTerm}%`)
          .gt('quantity', 0)
          .order('product_name')
          .limit(searchType === 'all' ? 5 : 8);
        
        if (!cosError && cosmetics) {
          results.push(...cosmetics.map(c => ({ ...c, type: 'cosmetic' as const })));
        }
      }

      return results;
    },
    enabled: searchTerm.length >= 2,
  });

  // Global keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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
  }, [products]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!products?.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < products.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (products[selectedIndex]) {
          handleSelect(products[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (product: Product) => {
    onSelectProduct?.(product);
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

  const getProductName = (product: Product) => {
    return product.type === 'medicine' ? product.medicine_name : product.product_name;
  };

  const getProductBrand = (product: Product) => {
    return product.type === 'medicine' ? product.company_name : product.brand;
  };

  return (
    <div ref={containerRef} className="relative w-full sm:w-96">
      <div className="space-y-2">
        <Tabs value={searchType} onValueChange={(v) => setSearchType(v as typeof searchType)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="medicine" className="text-xs gap-1">
              <Pill className="h-3 w-3" />
              Medicines
            </TabsTrigger>
            <TabsTrigger value="cosmetic" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              Cosmetics
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={`Search ${searchType === 'all' ? 'products' : searchType === 'medicine' ? 'medicines' : 'cosmetics'}...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-20 bg-background border-border"
          />
          {searchTerm ? (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {isOpen && searchTerm.length >= 2 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-[100] max-h-96 overflow-y-auto shadow-xl border-2 border-border bg-card">
          <CardContent className="p-2 bg-card">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground bg-card">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Searching...
              </div>
            ) : products && products.length > 0 ? (
              <div className="space-y-2">
                {products.map((product, index) => (
                  <div
                    key={`${product.type}-${product.id}`}
                    onClick={() => handleSelect(product)}
                    className={cn(
                      "p-4 rounded-lg cursor-pointer transition-all border-2 bg-card",
                      index === selectedIndex
                        ? "bg-primary/10 border-primary shadow-md"
                        : "border-transparent hover:bg-muted hover:border-muted-foreground/20"
                    )}
                  >
                    {/* Header Row: Name, Type Badge, Price */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {product.type === 'medicine' ? (
                            <Pill className="h-5 w-5 text-primary flex-shrink-0" />
                          ) : (
                            <Sparkles className="h-5 w-5 text-pink-500 flex-shrink-0" />
                          )}
                          <span className="font-semibold text-base text-foreground">{getProductName(product)}</span>
                          <Badge 
                            className={cn(
                              "text-xs px-2 py-0.5 font-medium",
                              product.type === 'medicine' 
                                ? "bg-primary/20 text-primary border-primary/40" 
                                : "bg-pink-500/20 text-pink-600 border-pink-500/40"
                            )}
                          >
                            {product.type === 'medicine' ? 'Medicine' : 'Cosmetic'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getProductBrand(product)} • Batch: <span className="font-mono">{product.batch_no}</span>
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-lg text-primary">
                          {formatCurrency(product.selling_price)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Stock & Details Row */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border">
                      {/* Stock - Most Prominent */}
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold",
                        isLowStock(product.quantity) 
                          ? "bg-destructive/15 text-destructive" 
                          : "bg-success/15 text-success"
                      )}>
                        <Package className="h-4 w-4" />
                        <span className="text-base">{product.quantity}</span>
                        <span className="text-sm font-normal">in stock</span>
                        {isLowStock(product.quantity) && (
                          <Badge variant="destructive" className="text-xs ml-1">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      
                      {/* Rack Location */}
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm font-medium">Rack {product.rack_no}</span>
                      </div>
                      
                      {/* Expiry */}
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded",
                        isExpiringSoon(product.expiry_date) 
                          ? "bg-warning/15 text-warning" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Exp: {format(new Date(product.expiry_date), 'MMM yyyy')}
                        </span>
                        {isExpiringSoon(product.expiry_date) && (
                          <Badge className="bg-warning/20 text-warning text-xs ml-1">
                            Soon
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground bg-card">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No {searchType === 'all' ? 'products' : searchType === 'medicine' ? 'medicines' : 'cosmetics'} found</p>
                <p className="text-sm">for "{searchTerm}"</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
