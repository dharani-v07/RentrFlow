import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { createSocket } from '../chat/socket.js';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [status, setStatus] = useState('disconnected');

  const socket = useMemo(() => {
    if (!token) return null;
    return createSocket(token);
  }, [token]);

  useEffect(() => {
    if (!socket || !isAuthenticated) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    socket.connect();

    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, [socket, isAuthenticated]);

  const value = useMemo(
    () => ({
      socket,
      status,
    }),
    [socket, status]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

export { SocketProvider, useSocket };
