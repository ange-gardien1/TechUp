import { Link, Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from '../../src/components/ThemedNative';
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

const ARCHIVE_STATUSES = new Set(['completed', 'closed', 'cancelled', 'rejected']);

export default function TechnicianScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<TechnicianDashboard | null>(null);
  const [diagnosisByRequest, setDiagnosisByRequest] = useState<Record<number, string>>({});
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

  const activeJobs = useMemo(
    () => (dashboard?.requests ?? []).filter((job) => !ARCHIVE_STATUSES.has(String(job.status ?? '').toLowerCase())),
    [dashboard?.requests],
  );

  const archiveJobs = useMemo(
    () => (dashboard?.requests ?? []).filter((job) => ARCHIVE_STATUSES.has(String(job.status ?? '').toLowerCase())),
    [dashboard?.requests],
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

  async function handleSendDiagnosis(requestId: number) {
    const diagnosis = (diagnosisByRequest[requestId] ?? '').trim();
    if (!diagnosis) {
      setError('Please add a diagnosis note before sending it to the team.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/repair-requests/${requestId}/diagnosis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, diagnosis, note: diagnosis }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to send diagnosis update');
      setDiagnosisByRequest((previous) => ({ ...previous, [requestId]: '' }));
      setError(null);
      await loadDashboard();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to send diagnosis update');
    }
  }

  async function handleCompleteRepair(requestId: number) {
    const completionNote = (diagnosisByRequest[requestId] ?? '').trim();
    if (!completionNote) {
      setError('Please write the repair completion note before closing the job.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/repair-requests/${requestId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, notes: completionNote }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to complete repair');
      setDiagnosisByRequest((previous) => ({ ...previous, [requestId]: '' }));
      setError(null);
      await loadDashboard();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to complete repair');
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
    <View className="flex-1 bg-[#09111F]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="bg-[#0B1B4B] px-5 pb-7 pt-8">
          <View className="mb-5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200">Technician</Text>
              </View>
              <Pressable onPress={handleLogout} className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">Logout</Text>
              </Pressable>
            </View>
          </View>

          <Text className="text-3xl font-black text-white">Field Support</Text>
          <Text className="mt-2 text-base text-blue-100">
            Manage active jobs, communicate with customers, and finish repairs efficiently.
          </Text>
        </View>

        <View className="px-5 pt-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-white">Today</Text>
            <View className="flex-row items-center gap-2">
              <Pressable onPress={() => router.push('/technician/recent')} className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">Recent</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/technician/archive')} className="rounded-full border border-slate-500/30 bg-slate-900/80 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200">Archive</Text>
              </Pressable>
            </View>
          </View>
          <View className="flex-row flex-wrap justify-between">
            {technicianStats.map((item) => (
              <View key={item.label} className="mb-3 w-[31%] min-w-[100px] rounded-2xl border border-slate-700 bg-[#111827] p-4">
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
          <View className="mx-5 mt-6 rounded-2xl border border-slate-700 bg-[#111827] p-5">
            <ActivityIndicator color="#67e8f9" />
            <Text className="mt-3 text-center text-sm text-slate-300">Loading your assigned work...</Text>
          </View>
        ) : (
          <View className="mt-6 px-5">
            <Text className="mb-4 text-lg font-bold text-white">Job queue</Text>
            {activeJobs.length === 0 ? (
              <View className="rounded-2xl border border-slate-700 bg-[#111827] p-5">
                <Text className="text-sm text-slate-300">No jobs are currently assigned to this technician.</Text>
              </View>
            ) : (
              <View className="space-y-3">
                {activeJobs.map((job) => {
                  const normalizedStatus = String(job.status ?? '').toLowerCase();
                  const showSchedule = ['technician_assigned', 'scheduled'].includes(normalizedStatus);
                  const showDiagnosis = ['technician_assigned', 'scheduled', 'customer_approval', 'repair_in_progress'].includes(normalizedStatus);
                  const showCompletion = ['repair_in_progress', 'completed'].includes(normalizedStatus);

                  return (
                    <View key={job.id} className="rounded-2xl border border-slate-700 bg-[#111827] p-4">
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

                      {showDiagnosis ? (
                        <>
                          <Text className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">Diagnosis update</Text>
                          <View className="mt-2 rounded-xl border border-slate-700 bg-[#0b1220] p-2">
                            <TextInput
                              value={diagnosisByRequest[job.id] ?? ''}
                              onChangeText={(value) => setDiagnosisByRequest((previous) => ({ ...previous, [job.id]: value }))}
                              placeholder="Describe diagnosis, findings, and repair steps..."
                              placeholderTextColor="#64748b"
                              multiline
                              numberOfLines={3}
                              className="min-h-[72px] text-sm text-white"
                            />
                          </View>
                        </>
                      ) : null}

                      <View className="mt-3 flex-row gap-2">
                        {showSchedule ? (
                          <Pressable onPress={() => handleSendSchedule(job.id)} className="flex-1 rounded-xl border border-cyan-500 bg-cyan-500/10 px-3 py-2">
                            <Text className="text-center text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Send schedule</Text>
                          </Pressable>
                        ) : null}
                        {showDiagnosis ? (
                          <Pressable onPress={() => handleSendDiagnosis(job.id)} className="flex-1 rounded-xl border border-emerald-500 bg-emerald-500/10 px-3 py-2">
                            <Text className="text-center text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Send note</Text>
                          </Pressable>
                        ) : null}
                      </View>

                      {showCompletion ? (
                          <Pressable onPress={() => handleCompleteRepair(job.id)} className="mt-2 rounded-xl border border-cyan-500 bg-cyan-500/10 px-3 py-2">
                            <Text className="text-center text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Finish repair</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

          </View>
        )}
      </ScrollView>
    </View>
  );
}
