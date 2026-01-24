import { useShop } from "@/hooks/useShop";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function ShopSelector() {
  const { currentShop, shops, loading, switchShop, isSuperAdmin } = useShop();

  if (loading) {
    return <Skeleton className="h-9 w-48" />;
  }

  if (shops.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Store className="h-4 w-4" />
        <span>No shops assigned</span>
      </div>
    );
  }

  if (shops.length === 1) {
    return (
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">{currentShop?.shop_name}</span>
        {isSuperAdmin && (
          <Badge variant="outline" className="text-xs font-medium border-primary text-primary">
            Super Admin
          </Badge>
        )}
        {!isSuperAdmin && currentShop?.shop_role && currentShop.shop_role !== 'super_admin' && (
          <Badge variant="outline" className="text-xs capitalize">
            {currentShop?.shop_role?.replace('_', ' ')}
          </Badge>
        )}
      </div>
    );
  }

  const handleShopChange = (shopId: string) => {
    switchShop(shopId);
  };

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-primary" />
      <Select value={currentShop?.shop_id || ''} onValueChange={handleShopChange}>
        <SelectTrigger className="w-auto min-w-[160px] h-9 border-dashed">
          <SelectValue placeholder="Select shop" />
        </SelectTrigger>
        <SelectContent>
          {shops.map((shop) => (
            <SelectItem key={shop.shop_id} value={shop.shop_id}>
              <div className="flex items-center gap-2">
                <span>{shop.shop_name}</span>
                {shop.shop_role && shop.shop_role !== 'super_admin' && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {shop.shop_role?.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
