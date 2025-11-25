import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useOrderStore } from '../store/orderStore';
import { OrderStatusEvent } from '../types/models';

export function useOrderRealtime(orderId?: string) {
  useEffect(() => {
    if (!orderId) {
      return;
    }

    const channel = supabase
      .channel(`order_${orderId}`)
      .on('broadcast', { event: 'status_update' }, (payload) => {
        const event = payload.payload as OrderStatusEvent;
        useOrderStore.getState().addStatusEvent(event);
        const current = useOrderStore.getState().active.order;
        if (current) {
          useOrderStore.getState().setActiveOrder({
            ...current,
            status: event.status,
          });
        }
      })
      .on('broadcast', { event: 'location_update' }, (payload) => {
        const { latitude, longitude } = payload.payload as {
          latitude?: number;
          longitude?: number;
        };
        const current = useOrderStore.getState().active.order;
        if (!current) {
          return;
        }
        useOrderStore.getState().setActiveOrder({
          ...current,
          courier_latitude: latitude,
          courier_longitude: longitude,
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId]);
}
