import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomNav } from './AppBottomNav';
import { AppHeader } from './AppHeader';
import { useAppTheme } from '../providers/AppThemeProvider';

export function AppShell({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

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
        className="app-shell-frame flex-1 w-full"
        style={{ backgroundColor: isDark ? '#0B1220' : '#F5F8FC' }}
      >
        <AppHeader />
        <View className="flex-1 min-w-0">{children}</View>
        <AppBottomNav />
      </View>
    </View>
  );
}
