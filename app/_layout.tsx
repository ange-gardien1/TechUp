import 'react-native-gesture-handler';
import { Buffer } from 'buffer';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '../src/providers/QueryProvider';
import { AuthProvider } from '../src/providers/AuthProvider';
import { AppThemeProvider } from '../src/providers/AppThemeProvider';
import { AppShell } from '../src/components/AppShell';
import { useAppTheme } from '../src/providers/AppThemeProvider';
import "../global.css";

if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer as unknown as typeof Buffer;
}

function ThemedStatusBar() {
  const { isDark } = useAppTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <AppThemeProvider>
            <ThemedStatusBar />
            <AppShell>
              <Stack screenOptions={{ headerShown: false }} />
            </AppShell>
          </AppThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
