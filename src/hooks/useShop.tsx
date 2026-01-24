import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Shop {
  shop_id: string;
  shop_name: string;
  shop_role: string;
}

interface ShopContextType {
  currentShop: Shop | null;
  shops: Shop[];
  loading: boolean;
  switchShop: (shopId: string) => Promise<boolean>;
  refreshShops: () => Promise<void>;
  isSuperAdmin: boolean;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, userRole } = useAuth();
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Super Admin status is restricted to only "Shahid Iqbal" - requires profile to be loaded
  const isSuperAdmin = profileLoaded && userRole === 'admin' && userFullName === 'Shahid Iqbal';

  // Fetch user's full name from profile
  const fetchUserProfile = useCallback(async () => {
    if (!user) {
      setProfileLoaded(true);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!error && data) {
        setUserFullName(data.full_name);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setProfileLoaded(true);
    }
  }, [user]);

  const fetchShops = useCallback(async () => {
    if (!user) {
      setShops([]);
      setCurrentShop(null);
      setLoading(false);
      return;
    }

    try {
      // Get user's accessible shops
      const { data: shopsData, error: shopsError } = await supabase
        .rpc('get_user_shops', { p_user_id: user.id });

      if (shopsError) throw shopsError;

      const shopsList = (shopsData || []) as Shop[];
      setShops(shopsList);

      // Get user's current shop from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('current_shop_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Find current shop in the list or default to first
      if (profile?.current_shop_id) {
        const current = shopsList.find(s => s.shop_id === profile.current_shop_id);
        if (current) {
          setCurrentShop(current);
        } else if (shopsList.length > 0) {
          setCurrentShop(shopsList[0]);
          // Update profile with the first shop
          await supabase.rpc('switch_shop', { 
            p_user_id: user.id, 
            p_shop_id: shopsList[0].shop_id 
          });
        }
      } else if (shopsList.length > 0) {
        setCurrentShop(shopsList[0]);
        // Update profile with the first shop
        await supabase.rpc('switch_shop', { 
          p_user_id: user.id, 
          p_shop_id: shopsList[0].shop_id 
        });
      }
    } catch (error: any) {
      console.error('Error fetching shops:', error);
      toast.error('Failed to load shops');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchShops();
      fetchUserProfile();
    }
  }, [authLoading, fetchShops, fetchUserProfile]);

  const switchShop = async (shopId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .rpc('switch_shop', { p_user_id: user.id, p_shop_id: shopId });

      if (error) throw error;

      if (data) {
        const newShop = shops.find(s => s.shop_id === shopId);
        if (newShop) {
          setCurrentShop(newShop);
          toast.success(`Switched to ${newShop.shop_name}`);
          return true;
        }
      }
      return false;
    } catch (error: any) {
      console.error('Error switching shop:', error);
      toast.error('Failed to switch shop');
      return false;
    }
  };

  const refreshShops = async () => {
    await fetchShops();
  };

  return (
    <ShopContext.Provider value={{ 
      currentShop, 
      shops, 
      loading, 
      switchShop, 
      refreshShops,
      isSuperAdmin 
    }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
