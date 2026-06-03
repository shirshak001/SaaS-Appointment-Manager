import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { supabase } from '../utils/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tempCode, setTempCode] = useState(null);
  const [tempResetCode, setTempResetCode] = useState(null);

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
            verified: !!session.user.email_confirmed_at,
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
        verified: !!session.user.email_confirmed_at,
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

  const register = useCallback(async (name, email, password, role = 'admin', remember = true) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role },
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
        verified: !!session.user.email_confirmed_at,
      };
      setUser(userObj);
      localStorage.setItem('rf_token', session.access_token);
      return userObj;
    } else {
      const { token, user, verificationCode } = await api.register(name, email, password, role);
      if (verificationCode) {
        setTempCode(verificationCode);
      }
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

  const verifyEmail = useCallback(async (email, code) => {
    if (supabase) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
      if (error) throw error;
      const session = data.session;
      const userObj = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
        role: 'admin',
        verified: true,
      };
      setUser(userObj);
      localStorage.setItem('rf_token', session.access_token);
      return userObj;
    } else {
      const { token, user } = await api.verifyEmail(email, code);
      localStorage.setItem('rf_token', token);
      setUser(user);
      return user;
    }
  }, []);

  const resendVerification = useCallback(async (email) => {
    if (supabase) {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      return { success: true };
    } else {
      const res = await api.resendVerification(email);
      if (res.verificationCode) {
        setTempCode(res.verificationCode);
      }
      return res;
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { success: true };
    } else {
      const res = await api.forgotPassword(email);
      if (res.resetToken) {
        setTempResetCode(res.resetToken);
      }
      return res;
    }
  }, []);

  const resetPassword = useCallback(async (email, token, password) => {
    if (supabase) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { success: true };
    } else {
      return await api.resetPassword(email, token, password);
    }
  }, []);

  const getSessions = useCallback(async () => {
    if (supabase) {
      return {
        sessions: [
          {
            id: 'current-session',
            ip: 'Dynamic IP',
            userAgent: navigator.userAgent,
            isCurrent: true,
            loggedInAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 3600 * 1000 * 24 * 7).toISOString(),
          }
        ]
      };
    } else {
      return await api.getSessions();
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
    <AuthContext.Provider value={{
      user,
      loading,
      tempCode,
      tempResetCode,
      login,
      register,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
      getSessions,
      logout,
      signInWithGoogle,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
