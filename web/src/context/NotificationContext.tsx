import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { socketService } from '../lib/socket';

export interface AdminNotification {
  type: string;
  orderId: number;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

interface NotificationContextType {
  notifications: AdminNotification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = socketService.connect();

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('admin_notification', (notification: AdminNotification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // Play notification sound (optional)
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {
          // Ignore autoplay errors
        });
      } catch (error) {
        // Ignore audio errors
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('admin_notification');
    };
  }, []);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        markAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
