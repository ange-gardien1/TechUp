import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/providers/AuthProvider';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    try {
      setLoading(true);
      setError('');
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone,
      });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          <Text className="text-4xl font-black text-white">Create customer account</Text>
          <Text className="mt-3 text-base text-slate-300">
            Set up your customer account to request repairs, track updates, and continue with service support.
          </Text>
        </View>

        <View className="rounded-[28px] border border-slate-800 bg-[#111827] p-5">
          <Text className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-400">Register</Text>

          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
            placeholderTextColor="#94A3B8"
            className="mt-5 rounded-2xl border border-slate-700 bg-[#0F172A] px-4 py-3 text-base text-white"
          />

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#94A3B8"
            className="mt-4 rounded-2xl border border-slate-700 bg-[#0F172A] px-4 py-3 text-base text-white"
          />

          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            keyboardType="phone-pad"
            placeholderTextColor="#94A3B8"
            className="mt-4 rounded-2xl border border-slate-700 bg-[#0F172A] px-4 py-3 text-base text-white"
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            placeholderTextColor="#94A3B8"
            className="mt-4 rounded-2xl border border-slate-700 bg-[#0F172A] px-4 py-3 text-base text-white"
          />

          <View className="mt-5 rounded-2xl border border-cyan-900/60 bg-cyan-500/10 px-3 py-3">
            <Text className="text-sm text-cyan-100">
              Your account is created for customer service access, while internal company permissions are managed by the business.
            </Text>
          </View>

          {error ? (
            <Text className="mt-4 text-sm text-rose-400">{error}</Text>
          ) : null}

          <Pressable onPress={handleRegister} className="mt-6 rounded-2xl bg-cyan-500 px-4 py-4">
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center text-base font-bold text-white">Create account</Text>
            )}
          </Pressable>

          <Link href="/login" asChild>
            <Pressable className="mt-4 rounded-2xl border border-slate-700 bg-transparent px-4 py-4">
              <Text className="text-center text-base font-bold text-slate-100">Already have an account?</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
