import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearAuth, getStoredUser, getToken, setAuth } from '../services/tokenStorage';
import { login as loginApi, me as meApi } from '../services/authService';

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const t = getToken();
        if (!t) {
          if (!cancelled) {
            setLoading(false);
            setToken(null);
            setUser(null);
          }
          return;
        }

        const resp = await meApi();
        if (!cancelled) {
          setToken(t);
          setUser(resp.user);
        }
      } catch {
        clearAuth();
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  function setSession({ token: newToken, user: newUser, rememberMe }) {
    setAuth({ token: newToken, user: newUser, rememberMe: Boolean(rememberMe) });
    setToken(newToken);
    setUser(newUser);
  }

  async function refreshMe() {
    const t = getToken();
    if (!t) return null;
    const resp = await meApi();
    setUser(resp.user);
    return resp.user;
  }

  async function login({ role, email, password, rememberMe }) {
    const data = await loginApi({ role, email, password, rememberMe });
    setSession({ token: data.token, user: data.user, rememberMe: Boolean(rememberMe) });
    await refreshMe().catch(() => null);
    return data.user;
  }

  function logout() {
    clearAuth();
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      setSession,
      refreshMe,
      logout,
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { AuthProvider, useAuth };
