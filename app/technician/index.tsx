import { Link, Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/providers/AuthProvider';
import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://127.0.0.1:4000');

type TechnicianDashboard = {
  assignedCount: number;
  activeJobs: number;
  quotePending: number;
  requests: Array<{
    id: number;
    customer: string;
    device: string;
    issue: string;
    status: string;
    preferredTime: string | null;
    amount: number;
    createdAt: string | null;
  }>;
};

export default function TechnicianScreen() {
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
      if (!response.ok) throw new Error(data?.error ?? 'Unable to load technician dashboard');
      setDashboard(data);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load technician dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'technician') {
      loadDashboard();
    }
  }, [user?.role, user?.id]);

  const technicianStats = useMemo(
    () => [
      { label: 'Assigned jobs', value: String(dashboard?.assignedCount ?? 0), tone: '#10B981' },
      { label: 'Active jobs', value: String(dashboard?.activeJobs ?? 0), tone: '#22C55E' },
      { label: 'Quotes pending', value: String(dashboard?.quotePending ?? 0), tone: '#F59E0B' },
    ],
    [dashboard],
  );

  async function handleSendSchedule(requestId: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/repair-requests/${requestId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredTime: 'Tomorrow, 11:00 AM', technicianId: user?.id, note: 'Technician confirmed schedule for the customer.' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to send schedule');
      await loadDashboard();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to send schedule');
    }
  }

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
    <SafeAreaView className="flex-1 bg-[#071813]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="bg-[#052E2B] px-5 pb-7 pt-8">
          <View className="mb-5 flex-row items-center justify-between">
            <Link href="/" asChild>
              <Pressable>
                <Text className="text-base font-semibold text-emerald-300">← Home</Text>
              </Pressable>
            </Link>
            <View className="flex-row items-center gap-2">
              <View className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200">Technician</Text>
              </View>
              <Pressable onPress={handleLogout} className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">Logout</Text>
              </Pressable>
            </View>
          </View>

          <Text className="text-3xl font-black text-white">Field Support</Text>
          <Text className="mt-2 text-base text-emerald-100">
            Manage active jobs, communicate with customers, and finish repairs efficiently.
          </Text>
        </View>

        <View className="px-5 pt-6">
          <Text className="mb-4 text-lg font-bold text-white">Today</Text>
          <View className="flex-row flex-wrap justify-between">
            {technicianStats.map((item) => (
              <View key={item.label} className="mb-3 w-[31%] min-w-[100px] rounded-2xl border border-emerald-900 bg-[#0F172A] p-4">
                <Text className="text-2xl font-black text-white" style={{ color: item.tone }}>{dashboard ? (item.label === 'Jobs today' ? dashboard.assignedCount : item.value) : item.value}</Text>
                <Text className="mt-1 text-xs text-slate-400">{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {error ? (
          <View className="mx-5 mt-6 rounded-2xl border border-rose-900 bg-[#1c1212] p-4">
            <Text className="text-sm text-rose-200">{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View className="mx-5 mt-6 rounded-2xl border border-emerald-900 bg-[#0F172A] p-5">
            <ActivityIndicator color="#34d399" />
            <Text className="mt-3 text-center text-sm text-slate-300">Loading your assigned work...</Text>
          </View>
        ) : (
          <View className="mt-6 px-5">
            <Text className="mb-4 text-lg font-bold text-white">Job queue</Text>
            {(dashboard?.requests ?? []).length === 0 ? (
              <View className="rounded-2xl border border-emerald-900 bg-[#0F172A] p-5">
                <Text className="text-sm text-slate-300">No jobs are currently assigned to this technician.</Text>
              </View>
            ) : (
              <View className="space-y-3">
                {(dashboard?.requests ?? []).map((job) => (
                  <View key={job.id} className="rounded-2xl border border-emerald-900 bg-[#0F172A] p-4">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-base font-bold text-white">#{job.id} · {job.device}</Text>
                      <View className="rounded-full bg-emerald-500/15 px-2 py-1">
                        <Text className="text-[10px] font-bold uppercase text-emerald-300">{job.status}</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-slate-300">Customer: {job.customer}</Text>
                    <Text className="mt-1 text-xs text-slate-400">Issue: {job.issue}</Text>
                    <Text className="mt-1 text-xs text-slate-400">Preferred time: {job.preferredTime ?? 'To be scheduled'}</Text>
                    <Text className="mt-1 text-xs text-slate-500">Amount: {job.amount ? `RWF ${job.amount}` : 'Pending'}</Text>
                    <Pressable onPress={() => handleSendSchedule(job.id)} className="mt-3 rounded-xl border border-cyan-500 bg-cyan-500/10 px-3 py-2">
                      <Text className="text-center text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Send schedule</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
