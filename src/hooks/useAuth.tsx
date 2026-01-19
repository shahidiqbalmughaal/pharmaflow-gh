import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ShopStaffInfo {
  shop_id: string;
  shop_role: 'owner' | 'manager' | 'cashier';
  is_active: boolean;
  shop_name?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  shopStaffInfo: ShopStaffInfo | null;
  isStaffActive: boolean;
  signOut: () => Promise<void>;
  updateLastLogin: () => Promise<void>;
  getRedirectPath: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [shopStaffInfo, setShopStaffInfo] = useState<ShopStaffInfo | null>(null);
  const [isStaffActive, setIsStaffActive] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role and shop info when session changes
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
            fetchShopStaffInfo(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setShopStaffInfo(null);
          setIsStaffActive(true);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchShopStaffInfo(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setUserRole(data?.role || 'salesman');
    } catch {
      // Silently fall back to default role on error
      setUserRole('salesman');
    }
  };

  const fetchShopStaffInfo = async (userId: string) => {
    try {
      // Get user's shop staff info with shop name
      const { data: staffData, error: staffError } = await supabase
        .from('shop_staff')
        .select(`
          shop_id,
          role,
          is_active,
          shops:shop_id (name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (staffError) {
        console.error('Error fetching shop staff info:', staffError);
        return;
      }

      if (staffData) {
        const shopInfo: ShopStaffInfo = {
          shop_id: staffData.shop_id,
          shop_role: staffData.role as 'owner' | 'manager' | 'cashier',
          is_active: staffData.is_active,
          shop_name: (staffData.shops as any)?.name
        };
        setShopStaffInfo(shopInfo);
        setIsStaffActive(staffData.is_active);
      } else {
        // User might be a super admin without shop assignment
        setShopStaffInfo(null);
        setIsStaffActive(true);
      }
    } catch (error) {
      console.error('Error fetching shop staff info:', error);
    }
  };

  const updateLastLogin = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ 
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  };

  const getRedirectPath = (): string => {
    // Super Admin (admin role) -> Admin Dashboard
    if (userRole === 'admin') {
      return '/admin';
    }
    
    // Based on shop role
    if (shopStaffInfo) {
      switch (shopStaffInfo.shop_role) {
        case 'owner':
          return '/'; // Owner Dashboard (main dashboard with full access)
        case 'manager':
          return '/'; // Shop Dashboard
        case 'cashier':
          return '/sales'; // POS Billing screen
        default:
          return '/';
      }
    }
    
    return '/';
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      setUserRole(null);
      setShopStaffInfo(null);
      setIsStaffActive(true);
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      userRole, 
      shopStaffInfo,
      isStaffActive,
      signOut,
      updateLastLogin,
      getRedirectPath
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}