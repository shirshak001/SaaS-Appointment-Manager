import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { supabase } from '../utils/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supabase) {
      // Listen to auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          const userObj = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            role: 'admin',
          };
          setUser(userObj);
          localStorage.setItem('rf_token', session.access_token);
        } else {
          setUser(null);
          localStorage.removeItem('rf_token');
          sessionStorage.removeItem('rf_token');
        }
        setLoading(false);
      });
      return () => subscription.unsubscribe();
    } else {
      // Legacy custom JWT auth flow
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
    }
  }, []);

  const login = useCallback(async (email, password, remember = true) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const session = data.session;
      const userObj = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
        role: 'admin',
      };
      setUser(userObj);
      localStorage.setItem('rf_token', session.access_token);
      return userObj;
    } else {
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
    }
  }, []);

  const register = useCallback(async (name, email, password, remember = true) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;
      const session = data.session;
      if (!session) {
        throw new Error('Please check your email to confirm registration.');
      }
      const userObj = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
        role: 'admin',
      };
      setUser(userObj);
      localStorage.setItem('rf_token', session.access_token);
      return userObj;
    } else {
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
    }
  }, []);

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('rf_token');
    sessionStorage.removeItem('rf_token');
    setUser(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, signInWithGoogle, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
