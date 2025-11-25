import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { OrderSummary, OrderStatusEvent, TrackingSummary } from '../types/models';

interface ActiveOrderState {
  order: OrderSummary | null;
  statusEvents: OrderStatusEvent[];
  etaMinutes?: number | null;
}

interface OrderState {
  active: ActiveOrderState;
  history: OrderSummary[];
  trackingHistory: TrackingSummary[];
  setActiveOrder: (order: OrderSummary | null) => void;
  updateStatusEvents: (events: OrderStatusEvent[]) => void;
  addStatusEvent: (event: OrderStatusEvent) => void;
  setHistory: (orders: OrderSummary[]) => void;
  setTrackingHistory: (trackings: TrackingSummary[]) => void;
  setEta: (minutes: number | null) => void;
  clearActiveOrder: () => void;   // <── ICI
  reset: () => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      active: {
        order: null,
        statusEvents: [],
        etaMinutes: null,
      },
      history: [],
      trackingHistory: [],

      // ---------------------------------------------------------
      // SET ACTIVE ORDER
      // ---------------------------------------------------------
      setActiveOrder: (order) =>
        set((state) => ({
          active: {
            ...state.active,
            order,
            statusEvents:
              order && state.active.order && state.active.order.id === order.id
                ? state.active.statusEvents
                : [],
            etaMinutes:
              order && state.active.order && state.active.order.id === order.id
                ? state.active.etaMinutes
                : null,
          },
        })),

      // ---------------------------------------------------------
      // UPDATE STATUS EVENTS
      // ---------------------------------------------------------
      updateStatusEvents: (statusEvents) =>
        set((state) => ({
          active: {
            ...state.active,
            statusEvents,
          },
        })),

      // ---------------------------------------------------------
      // ADD STATUS EVENT
      // ---------------------------------------------------------
      addStatusEvent: (event) =>
        set((state) => ({
          active: {
            ...state.active,
            statusEvents: [...state.active.statusEvents, event],
          },
        })),

      // ---------------------------------------------------------
      // SET HISTORY
      // ---------------------------------------------------------
      setHistory: (history) => set({ history }),

      // ---------------------------------------------------------
      // SET TRACKING HISTORY
      // ---------------------------------------------------------
      setTrackingHistory: (trackingHistory) => set({ trackingHistory }),

      // ---------------------------------------------------------
      // ETA
      // ---------------------------------------------------------
      setEta: (etaMinutes) =>
        set((state) => ({
          active: {
            ...state.active,
            etaMinutes,
          },
        })),

      // ---------------------------------------------------------
      // CLEAR ONLY THE ACTIVE ORDER (for cancellation, completion…)
      // ---------------------------------------------------------
      clearActiveOrder: () =>
        set((state) => ({
          active: {
            order: null,
            statusEvents: [],
            etaMinutes: null,
          },
        })),

      // ---------------------------------------------------------
      // RESET EVERYTHING (logout)
      // ---------------------------------------------------------
      reset: () =>
        set({
          active: {
            order: null,
            statusEvents: [],
            etaMinutes: null,
          },
          history: [],
          trackingHistory: [],
        }),
    }),

    {
      name: 'quickly.order',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        active: state.active,
        history: state.history,
        trackingHistory: state.trackingHistory
      }),
    },
  ),
);
