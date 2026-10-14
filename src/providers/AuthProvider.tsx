import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';
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
  login: (email: string, password: string) => Promise<void>;
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
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    setUser(payload);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiRequest<{ user: AppUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem(AUTH_STORAGE_KEY),
      clearSessionToken(),
    ]);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login,
      register,
      refreshUser: persistSession,
      logout,
    }),
    [user, isLoading],
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
