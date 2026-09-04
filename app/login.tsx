import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/providers/AuthProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    try {
      setLoading(true);
      setError('');
      await login(email.trim(), password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#09090B]">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Link href="/" asChild>
          <Pressable className="mb-8">
            <Text className="text-base font-semibold text-cyan-300">← Back</Text>
          </Pressable>
        </Link>

        <View className="mb-8">
          <Text className="text-4xl font-black text-white">Company sign in</Text>
          <Text className="mt-3 text-base text-slate-300">
            Sign in to your company account and access the service platform.
          </Text>
        </View>

        <View className="rounded-[28px] border border-slate-800 bg-[#111827] p-5">
          <Text className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-400">Sign in</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#94A3B8"
            className="mt-5 rounded-2xl border border-slate-700 bg-[#0F172A] px-4 py-3 text-base text-white"
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            placeholderTextColor="#94A3B8"
            className="mt-4 rounded-2xl border border-slate-700 bg-[#0F172A] px-4 py-3 text-base text-white"
          />

          {error ? (
            <Text className="mt-4 text-sm text-rose-400">{error}</Text>
          ) : null}

          <Pressable onPress={handleLogin} className="mt-6 rounded-2xl bg-cyan-500 px-4 py-4">
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center text-base font-bold text-white">Sign in</Text>
            )}
          </Pressable>

          <Link href="/register" asChild>
            <Pressable className="mt-4 rounded-2xl border border-slate-700 bg-transparent px-4 py-4">
              <Text className="text-center text-base font-bold text-slate-100">Create account</Text>
            </Pressable>
          </Link>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
