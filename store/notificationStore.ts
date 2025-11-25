import { create } from 'zustand';
import { NotificationPayload } from '../types/models';

interface NotificationState {
  notifications: NotificationPayload[];
  unreadCount: number;
  setNotifications: (notifications: NotificationPayload[]) => void;
  addNotification: (notification: NotificationPayload) => void;
  markAsRead: (notificationId: string) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
    }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
    })),
  markAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item,
      ),
      unreadCount: Math.max(
        0,
        state.unreadCount - (state.notifications.find((item) => item.id === notificationId && !item.read) ? 1 : 0),
      ),
    })),
  reset: () => set({ notifications: [], unreadCount: 0 }),
}));
