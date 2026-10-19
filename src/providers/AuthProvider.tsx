import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, setUnauthorizedHandler } from '../lib/api';
import { clearSessionToken, getSessionToken, setSessionToken } from '../lib/sessionToken';

export type AppRole = 'customer' | 'technician' | 'manager' | 'admin';

export type AppUser = {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  role: AppRole;
  status?: string;
  isVerified?: boolean;
  createdAt?: string;
};

type AuthContextValue = {
  user: AppUser | null;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (input: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  refreshUser: (user: AppUser) => Promise<void>;
  logout: () => Promise<void>;
};

const AUTH_STORAGE_KEY = 'teckup:user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const sessionExpiryHandled = useRef(false);

  useEffect(() => {
    const hydrateSession = async () => {
      try {
        const [raw, token] = await Promise.all([
          AsyncStorage.getItem(AUTH_STORAGE_KEY),
          getSessionToken(),
        ]);
        if (raw && token) {
          setUser(JSON.parse(raw) as AppUser);
        } else if (raw || token) {
          await Promise.all([
            AsyncStorage.removeItem(AUTH_STORAGE_KEY),
            clearSessionToken(),
          ]);
        }
      } catch (error) {
        console.error('Failed to restore auth session', error);
      } finally {
        setIsLoading(false);
      }
    };

    hydrateSession();
  }, []);

  const persistSession = useCallback(async (payload: AppUser, token?: string) => {
    if (token) await setSessionToken(token);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    sessionExpiryHandled.current = false;
    setSessionExpired(false);
    setUser(payload);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiRequest<{ user: AppUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    await persistSession(data.user, data.token);
  };

  const loginWithGoogle = async (idToken: string) => {
    const data = await apiRequest<{ user: AppUser; token: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });

    await persistSession(data.user, data.token);
  };

  const register = async (input: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    const data = await apiRequest<{ user: AppUser; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    await persistSession(data.user, data.token);
  };

  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(AUTH_STORAGE_KEY),
      clearSessionToken(),
    ]);
    setUser(null);
    setSessionExpired(false);
  }, []);

  const handleSessionExpired = useCallback(async () => {
    if (sessionExpiryHandled.current) return;
    sessionExpiryHandled.current = true;

    try {
      await logout();
    } catch (error) {
      console.error('Failed to clear expired auth session', error);
      setUser(null);
    } finally {
      setSessionExpired(true);
      router.replace('/login');
    }
  }, [logout, router]);

  useEffect(() => {
    setUnauthorizedHandler(handleSessionExpired);
    return () => setUnauthorizedHandler(null);
  }, [handleSessionExpired]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      sessionExpired,
      login,
      loginWithGoogle,
      register,
      refreshUser: persistSession,
      logout,
    }),
    [user, isLoading, sessionExpired, logout, persistSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
