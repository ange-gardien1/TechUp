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
  assignedCount: number;
  activeJobs: number;
  quotePending: number;
  requests: TechnicianRequest[];
};

const ARCHIVE_STATUSES = new Set(['completed', 'closed', 'cancelled', 'rejected']);

const statusTone: Record<string, { label: string; bg: string; text: string }> = {
  completed: { label: 'Completed', bg: '#14532d', text: '#bbf7d0' },
  closed: { label: 'Closed', bg: '#1f2937', text: '#e2e8f0' },
  cancelled: { label: 'Cancelled', bg: '#7f1d1d', text: '#fecaca' },
  rejected: { label: 'Rejected', bg: '#4c1d95', text: '#ddd6fe' },
  default: { label: 'Archived', bg: '#374151', text: '#e5e7eb' },
};

export default function TechnicianArchiveScreen() {
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
      if (!response.ok) throw new Error(data?.error ?? 'Unable to load archive');
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load archive');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'technician') {
      loadDashboard();
    }
  }, [user?.role, user?.id]);

  const archiveJobs = useMemo(
    () =>
      (dashboard?.requests ?? [])
        .filter((job) => ARCHIVE_STATUSES.has(String(job.status ?? '').toLowerCase()))
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
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
              <View className="rounded-full border border-slate-500/30 bg-slate-900/80 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-200">Archive</Text>
              </View>
              <Pressable onPress={handleLogout} className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">Logout</Text>
              </Pressable>
            </View>
          </View>

          <Text className="text-3xl font-black text-white">Service history</Text>
          <Text className="mt-2 text-base text-blue-100">
            Completed and closed jobs are kept here so the current queue stays focused on active work.
          </Text>
        </View>

        <View className="px-5 pt-6">
          {loading ? (
            <View className="rounded-2xl border border-slate-700 bg-[#111827] p-5">
              <ActivityIndicator color="#67e8f9" />
              <Text className="mt-3 text-center text-sm text-slate-300">Loading service history...</Text>
            </View>
          ) : error ? (
            <View className="rounded-2xl border border-rose-900 bg-[#1c1212] p-4">
              <Text className="text-sm text-rose-200">{error}</Text>
            </View>
          ) : archiveJobs.length === 0 ? (
            <View className="rounded-2xl border border-slate-700 bg-[#111827] p-5">
              <Text className="text-sm text-slate-300">No archived jobs yet.</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {archiveJobs.map((job) => {
                const normalized = String(job.status ?? '').toLowerCase();
                const tone = statusTone[normalized] ?? statusTone.default;

                return (
                  <View key={job.id} className="rounded-2xl border border-slate-700 bg-[#111827] p-4 opacity-95">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-base font-bold text-white">#{job.id} · {job.device}</Text>
                      <View className="rounded-full px-2 py-1" style={{ backgroundColor: tone.bg }}>
                        <Text className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: tone.text }}>{tone.label}</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-slate-300">Customer: {job.customer}</Text>
                    <Text className="mt-1 text-xs text-slate-400">Issue: {job.issue}</Text>
                    <Text className="mt-2 text-xs text-slate-500">Amount: {job.amount ? `RWF ${job.amount}` : 'Pending'}</Text>
                    <Text className="mt-1 text-xs text-slate-500">Completed: {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}</Text>
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
