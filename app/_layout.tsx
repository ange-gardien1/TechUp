import 'react-native-gesture-handler';
import { Buffer } from 'buffer';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '../src/providers/QueryProvider';
import { AuthProvider } from '../src/providers/AuthProvider';
import "../global.css";

if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer as unknown as typeof Buffer;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
