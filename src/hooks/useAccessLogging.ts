import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useShop } from '@/hooks/useShop';
import type { Json } from '@/integrations/supabase/types';

type ActionType = 'login' | 'view' | 'export' | 'bulk_query' | 'sensitive_access';
type ResourceType = 'customers' | 'suppliers' | 'salesmen' | 'medicines' | 'cosmetics' | 'sales' | 'expenses' | 'profiles' | 'settings';

interface LogAccessOptions {
  actionType: ActionType;
  resourceType: ResourceType;
  resourceCount?: number;
  metadata?: Json;
}

export function useAccessLogging() {
  const { user } = useAuth();
  const { currentShop } = useShop();

  const logAccess = useCallback(async (options: LogAccessOptions) => {
    if (!user) return;

    try {
      const insertData = {
        user_id: user.id,
        shop_id: currentShop?.shop_id || null,
        action_type: options.actionType,
        resource_type: options.resourceType,
        resource_count: options.resourceCount || 1,
        user_agent: navigator.userAgent,
        metadata: options.metadata || {},
      };
      
      const { error } = await supabase.from('access_logs').insert([insertData]);
      
      if (error) {
        console.error('Failed to log access:', error);
      }
    } catch (error) {
      // Silently fail - logging should not interrupt user operations
      console.error('Failed to log access:', error);
    }
  }, [user, currentShop]);

  const logView = useCallback((resourceType: ResourceType, count?: number) => {
    return logAccess({ actionType: 'view', resourceType, resourceCount: count });
  }, [logAccess]);

  const logExport = useCallback((resourceType: ResourceType, count: number) => {
    return logAccess({ actionType: 'export', resourceType, resourceCount: count });
  }, [logAccess]);

  const logBulkQuery = useCallback((resourceType: ResourceType, count: number) => {
    return logAccess({ actionType: 'bulk_query', resourceType, resourceCount: count });
  }, [logAccess]);

  const logSensitiveAccess = useCallback((resourceType: ResourceType, metadata?: Json) => {
    return logAccess({ actionType: 'sensitive_access', resourceType, metadata });
  }, [logAccess]);

  return {
    logAccess,
    logView,
    logExport,
    logBulkQuery,
    logSensitiveAccess,
  };
}
