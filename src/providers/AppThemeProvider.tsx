import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const HOME_THEME_KEY = 'teckup:home-theme';

type AppThemeContextValue = {
  isDark: boolean;
  isReady: boolean;
  toggleTheme: () => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | undefined>(undefined);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HOME_THEME_KEY)
      .then((storedTheme) => setIsDark(storedTheme === 'dark'))
      .catch((error) => console.warn('Unable to load app theme', error))
      .finally(() => setIsReady(true));
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    try {
      await AsyncStorage.setItem(HOME_THEME_KEY, nextIsDark ? 'dark' : 'light');
    } catch (error) {
      console.warn('Unable to save app theme', error);
    }
  }, [isDark]);

  const value = useMemo(() => ({ isDark, isReady, toggleTheme }), [isDark, isReady, toggleTheme]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
}
