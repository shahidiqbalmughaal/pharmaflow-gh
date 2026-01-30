import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { toast } from 'sonner';

interface UseRealtimeInventoryOptions {
  tableName: 'medicines' | 'cosmetics';
  queryKey: string[];
  showNotifications?: boolean;
}

export function useRealtimeInventory({
  tableName,
  queryKey,
  showNotifications = false,
}: UseRealtimeInventoryOptions) {
  const queryClient = useQueryClient();
  const { currentShop } = useShop();

  useEffect(() => {
    if (!currentShop?.shop_id) return;

    const channel = supabase
      .channel(`${tableName}-changes-${currentShop.shop_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `shop_id=eq.${currentShop.shop_id}`,
        },
        (payload) => {
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey });
          // Also invalidate count query for pagination
          queryClient.invalidateQueries({ queryKey: [`${tableName}-count`] });
          // Show notification based on event type
          if (showNotifications) {
            const itemName = payload.new && typeof payload.new === 'object' 
              ? (payload.new as any).medicine_name || (payload.new as any).product_name || 'Item'
              : 'Item';
            
            switch (payload.eventType) {
              case 'INSERT':
                toast.info(`New ${tableName === 'medicines' ? 'medicine' : 'cosmetic'} added: ${itemName}`, {
                  duration: 3000,
                });
                break;
              case 'UPDATE':
                // Only show update notifications for significant changes
                break;
              case 'DELETE':
                toast.info(`${tableName === 'medicines' ? 'Medicine' : 'Cosmetic'} removed from inventory`, {
                  duration: 3000,
                });
                break;
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentShop?.shop_id, tableName, queryKey, queryClient, showNotifications]);
}
