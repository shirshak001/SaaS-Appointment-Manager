import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('rf_token') || sessionStorage.getItem('rf_token');
    if (token) {
      api.me()
        .then(({ user }) => setUser(user))
        .catch(() => {
          localStorage.removeItem('rf_token');
          sessionStorage.removeItem('rf_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password, remember = true) => {
    const { token, user } = await api.login(email, password);
    if (remember) {
      localStorage.setItem('rf_token', token);
      sessionStorage.removeItem('rf_token');
    } else {
      sessionStorage.setItem('rf_token', token);
      localStorage.removeItem('rf_token');
    }
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (name, email, password, remember = true) => {
    const { token, user } = await api.register(name, email, password);
    if (remember) {
      localStorage.setItem('rf_token', token);
      sessionStorage.removeItem('rf_token');
    } else {
      sessionStorage.setItem('rf_token', token);
      localStorage.removeItem('rf_token');
    }
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('rf_token');
    sessionStorage.removeItem('rf_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
