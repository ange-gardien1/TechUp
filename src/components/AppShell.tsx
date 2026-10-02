import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomNav } from './AppBottomNav';
import { AppHeader } from './AppHeader';
import { useAppTheme } from '../providers/AppThemeProvider';

export function AppShell({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

  return (
    <View
      className="flex-1 items-center"
      style={{ backgroundColor: '#040B18', paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View
        className="flex-1 w-full"
        style={{ maxWidth: 430, backgroundColor: isDark ? '#0B1220' : '#F5F8FC' }}
      >
        <AppHeader />
        <View className="flex-1">{children}</View>
        <AppBottomNav />
      </View>
    </View>
  );
}
