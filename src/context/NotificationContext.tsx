import { createContext, useContext, useState, useEffect } from 'react';
import { account } from '../lib/appwrite';
import { useAuth } from './AuthContext';

type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  time: string;
  type: 'info' | 'success' | 'warning';
};

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchNotifs = async () => {
      if (user) {
        try {
          const prefs = await account.getPrefs();
          if (prefs.notifications) {
            setNotifications(JSON.parse(prefs.notifications));
          }
        } catch (e) {
          console.error('Failed to load notifications', e);
        }
      }
    };
    fetchNotifs();
  }, [user]);

  const saveToPrefs = async (notifs: Notification[]) => {
    if (!user) return;
    try {
      const prefs = await account.getPrefs();
      await account.updatePrefs({ ...prefs, notifications: JSON.stringify(notifs.slice(0, 50)) }); // keep last 50
    } catch (e) {
      console.error('Failed to save notifications', e);
    }
  };

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const newNotif: Notification = {
      id: Date.now().toString(),
      title,
      message,
      type,
      read: false,
      time: new Date().toISOString()
    };
    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    saveToPrefs(updated);
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveToPrefs(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveToPrefs(updated);
  };

  const clearAll = () => {
    setNotifications([]);
    saveToPrefs([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
