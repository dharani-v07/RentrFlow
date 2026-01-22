import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from './AuthContext.jsx';
import { useSocket } from './SocketContext.jsx';

import {
  listNotifications as listAgentNotifications,
  markNotificationRead as markAgentNotificationRead,
} from '../services/agentService.js';
import {
  listNotifications as listContractorNotifications,
  markNotificationRead as markContractorNotificationRead,
} from '../services/contractorService.js';

const NotificationsContext = createContext(null);

function normalizeId(x) {
  return String(x?._id || x?.id || x || '');
}

function NotificationsProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const api = useMemo(() => {
    return user?.role === 'agent'
      ? { list: listAgentNotifications, markRead: markAgentNotificationRead }
      : { list: listContractorNotifications, markRead: markContractorNotificationRead };
  }, [user]);

  const unreadCount = useMemo(() => {
    return (notifications || []).reduce((sum, n) => sum + (n && !n.read ? 1 : 0), 0);
  }, [notifications]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError('');
    try {
      const data = await api.list();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [api, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setError('');
      setLoading(false);
      return;
    }

    refresh();
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    if (!socket || !isAuthenticated || !user) return;

    const myUserId = normalizeId(user._id || user.id);

    const onNotification = (notif) => {
      const nUserId = normalizeId(notif?.user);
      if (nUserId && myUserId && nUserId !== myUserId) return;

      setNotifications((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        const id = normalizeId(notif?._id);
        if (!id) return arr;

        const existingIdx = arr.findIndex((x) => normalizeId(x?._id) === id);
        if (existingIdx >= 0) {
          const next = arr.slice();
          next[existingIdx] = { ...next[existingIdx], ...notif };
          return next;
        }

        return [notif].concat(arr).slice(0, 100);
      });
    };

    socket.on('notification', onNotification);

    return () => {
      socket.off('notification', onNotification);
    };
  }, [socket, isAuthenticated, user]);

  const markRead = useCallback(
    async (notificationId) => {
      const id = normalizeId(notificationId);
      if (!id) return;

      setError('');
      try {
        await api.markRead(id);
        setNotifications((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          return arr.map((n) => {
            if (normalizeId(n?._id) !== id) return n;
            return { ...n, read: true };
          });
        });
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to mark read');
        throw e;
      }
    },
    [api]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      refresh,
      markRead,
    }),
    [notifications, unreadCount, loading, error, refresh, markRead]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

export { NotificationsProvider, useNotifications };
