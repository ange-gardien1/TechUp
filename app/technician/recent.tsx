import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from '../../src/components/ThemedNative';
import { useAuth } from '../../src/providers/AuthProvider';
import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://127.0.0.1:4000');

type TechnicianRequest = {
  id: number;
  customer: string;
  device: string;
  issue: string;
  status: string;
  preferredTime: string | null;
  amount: number;
  createdAt: string | null;
};

type TechnicianDashboard = {
  requests: TechnicianRequest[];
};

const statusTone: Record<string, { label: string; bg: string; text: string }> = {
  submitted: { label: 'Submitted', bg: '#f59e0b', text: '#fff7ed' },
  under_review: { label: 'Under review', bg: '#3b82f6', text: '#dbeafe' },
  technician_assigned: { label: 'Assigned', bg: '#10b981', text: '#ecfdf5' },
  scheduled: { label: 'Scheduled', bg: '#6366f1', text: '#eef2ff' },
  customer_approval: { label: 'Customer approval', bg: '#8b5cf6', text: '#f5f3ff' },
  repair_in_progress: { label: 'In progress', bg: '#14b8a6', text: '#ecfeff' },
  completed: { label: 'Completed', bg: '#14532d', text: '#bbf7d0' },
  default: { label: 'Recent', bg: '#374151', text: '#e5e7eb' },
};

export default function TechnicianRecentScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<TechnicianDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/technician/dashboard/${user.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to load recent jobs');
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load recent jobs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'technician') {
      loadDashboard();
    }
  }, [user?.role, user?.id]);

  const recentJobs = useMemo(
    () =>
      (dashboard?.requests ?? [])
        .slice()
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        .slice(0, 12),
    [dashboard?.requests],
  );

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'technician') {
    return <Redirect href={`/${user.role}` as any} />;
  }

  return (
    <View className="flex-1 bg-[#09111F]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="bg-[#0B1B4B] px-5 pb-7 pt-8">
          <View className="mb-5 flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="min-h-11 justify-center">
              <Text className="text-base font-semibold text-cyan-300">← Back</Text>
            </Pressable>
            <View className="flex-row items-center gap-2">
              <View className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200">Recent</Text>
              </View>
              <Pressable onPress={handleLogout} className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">Logout</Text>
              </Pressable>
            </View>
          </View>

          <Text className="text-3xl font-black text-white">Latest repairs</Text>
          <Text className="mt-2 text-base text-blue-100">
            Recent service notes and active job updates are kept here for quick review.
          </Text>
        </View>

        <View className="px-5 pt-6">
          {loading ? (
            <View className="rounded-2xl border border-slate-700 bg-[#111827] p-5">
              <ActivityIndicator color="#67e8f9" />
              <Text className="mt-3 text-center text-sm text-slate-300">Loading recent jobs...</Text>
            </View>
          ) : error ? (
            <View className="rounded-2xl border border-rose-900 bg-[#1c1212] p-4">
              <Text className="text-sm text-rose-200">{error}</Text>
            </View>
          ) : recentJobs.length === 0 ? (
            <View className="rounded-2xl border border-slate-700 bg-[#111827] p-5">
              <Text className="text-sm text-slate-300">No recent jobs yet.</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {recentJobs.map((job) => {
                const normalized = String(job.status ?? '').toLowerCase();
                const tone = statusTone[normalized] ?? statusTone.default;

                return (
                  <View key={job.id} className="rounded-2xl border border-slate-700 bg-[#111827] p-4">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-base font-bold text-white">#{job.id} · {job.device}</Text>
                      <View className="rounded-full px-2 py-1" style={{ backgroundColor: tone.bg }}>
                        <Text className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: tone.text }}>{tone.label}</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-slate-300">Customer: {job.customer}</Text>
                    <Text className="mt-1 text-xs text-slate-400">Issue: {job.issue}</Text>
                    <Text className="mt-2 text-xs text-slate-500">Preferred time: {job.preferredTime ?? 'To be scheduled'}</Text>
                    <Text className="mt-1 text-xs text-slate-500">Date: {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
