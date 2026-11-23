import type { ReactNode } from 'react';
import { usePathname } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomNav } from './AppBottomNav';
import { AppHeader } from './AppHeader';
import { useAppTheme } from '../providers/AppThemeProvider';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const isLoginScreen = Platform.OS === 'web' && pathname === '/login';
  const shellClassName = isLoginScreen
    ? `app-shell-frame flex-1 w-full login-shell${isDark ? '' : ' login-theme-light'}`
    : 'app-shell-frame flex-1 w-full';

  return (
    <View
      className="app-shell-root flex-1 w-full"
      style={{
        backgroundColor: '#040B18',
        paddingTop: Platform.OS === 'web' ? 0 : insets.top,
        paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom,
      }}
    >
      <View
        className={shellClassName}
        style={{ backgroundColor: isDark ? '#0B1220' : '#F5F8FC' }}
      >
        <AppHeader />
        <View className={`flex-1 min-w-0${isLoginScreen ? ' login-route-content' : ''}`}>
          {children}
        </View>
        <AppBottomNav />
      </View>
    </View>
  );
}
