import { Link, Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from '../../src/components/ThemedNative';
import { useAuth } from '../../src/providers/AuthProvider';
import { formatScheduleTime, SchedulePicker } from '../../src/components/SchedulePicker';
import { useMemo, useState } from 'react';
import { useLiveRefresh } from '../../src/lib/useLiveRefresh';
import { apiRequest } from '../../src/lib/api';
import { isActiveTechnicianJob } from '../../src/lib/repairWorkflow';

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
    completedAt: string | null;
  }>;
};

export default function TechnicianScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<TechnicianDashboard | null>(null);
  const [diagnosisByRequest, setDiagnosisByRequest] = useState<Record<number, string>>({});
  const [scheduleByRequest, setScheduleByRequest] = useState<Record<number, string>>({});
  const [scheduleDecisionByRequest, setScheduleDecisionByRequest] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    if (!user?.id) return;
    try {
      if (!dashboard) setLoading(true);
      const data = await apiRequest<TechnicianDashboard>(`/technician/dashboard/${user.id}`);
      setDashboard(data);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load technician dashboard');
    } finally {
      setLoading(false);
    }
  }

  useLiveRefresh(loadDashboard, user?.role === 'technician');

  const activeJobs = useMemo(
    () => (dashboard?.requests ?? []).filter((job) => isActiveTechnicianJob(job.status)),
    [dashboard?.requests],
  );

  const archiveJobs = useMemo(
    () => (dashboard?.requests ?? []).filter((job) => !isActiveTechnicianJob(job.status)),
    [dashboard?.requests],
  );

  const technicianStats = useMemo(
    () => [
      { label: 'Assigned jobs', value: String(dashboard?.assignedCount ?? 0), tone: '#10B981' },
      { label: 'Active jobs', value: String(activeJobs.length), tone: '#22C55E' },
      { label: 'Quotes pending', value: String(dashboard?.quotePending ?? 0), tone: '#F59E0B' },
    ],
    [activeJobs.length, dashboard?.assignedCount, dashboard?.quotePending],
  );

  async function handleSendSchedule(requestId: number) {
    const scheduleTime = scheduleByRequest[requestId] ?? '';
    if (!scheduleTime) {
      setError('Choose a day and arrival window before confirming the schedule.');
      return;
    }

    try {
      await apiRequest(`/repair-requests/${requestId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({
          userId: user?.id,
          preferredTime: scheduleTime,
          note: 'The assigned technician confirmed this time with the customer.',
        }),
      });
      setScheduleByRequest((previous) => ({ ...previous, [requestId]: '' }));
      setError(null);
      await loadDashboard();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to send schedule');
    }
  }

  async function handleCustomerTimeDecision(requestId: number, decision: 'accept' | 'reject') {
    setScheduleDecisionByRequest((previous) => ({ ...previous, [requestId]: true }));
    try {
      await apiRequest(`/repair-requests/${requestId}/schedule/decision`, {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id, decision }),
      });
      setError(null);
      await loadDashboard();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update the customer time request');
    } finally {
      setScheduleDecisionByRequest((previous) => ({ ...previous, [requestId]: false }));
    }
  }

  async function handleSendDiagnosis(requestId: number) {
    const diagnosis = (diagnosisByRequest[requestId] ?? '').trim();
    if (!diagnosis) {
      setError('Please add a diagnosis note before sending it to the team.');
      return;
    }

    try {
      await apiRequest(`/repair-requests/${requestId}/diagnosis`, {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id, diagnosis, note: diagnosis }),
      });
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
      await apiRequest(`/repair-requests/${requestId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id, notes: completionNote }),
      });
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
              {/* <Pressable onPress={handleLogout} className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">Logout</Text>
              </Pressable> */}
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
                  const hasCustomerTime = Boolean(job.preferredTime?.trim());
                  const needsCustomerTimeDecision = normalizedStatus === 'technician_assigned' && hasCustomerTime;
                  const showSchedulePicker = normalizedStatus === 'technician_assigned' && !hasCustomerTime;
                  const showDiagnosis = ['technician_assigned', 'scheduled', 'customer_approval', 'repair_in_progress'].includes(normalizedStatus);
                  const showCompletion = normalizedStatus === 'repair_in_progress';

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
                      {normalizedStatus === 'completed' && job.completedAt ? (
                        <Text className="mt-1 text-xs text-emerald-300">
                          Completed: {new Date(job.completedAt).toLocaleString()}
                        </Text>
                      ) : null}
                      <Text className="mt-1 text-xs text-slate-400">
                        {needsCustomerTimeDecision
                          ? `Customer preferred time: ${formatScheduleTime(job.preferredTime)}`
                          : normalizedStatus === 'scheduled'
                            ? `Confirmed service time: ${formatScheduleTime(job.preferredTime)}`
                            : 'Customer has not selected a time yet'}
                      </Text>
                      <Text className="mt-1 text-xs text-slate-500">Amount: {job.amount ? `RWF ${job.amount}` : 'Pending'}</Text>

                      {needsCustomerTimeDecision ? (
                        <View className="mt-3 rounded-2xl border border-violet-500/40 bg-violet-500/10 p-3">
                          <Text className="text-xs font-semibold leading-5 text-violet-100">
                            Can you make this customer-requested time? Accept it to confirm, or decline to return the request to the manager for reassignment.
                          </Text>
                          <View className="mt-3 flex-row gap-2">
                            <Pressable
                              disabled={scheduleDecisionByRequest[job.id]}
                              onPress={() => handleCustomerTimeDecision(job.id, 'accept')}
                              className="flex-1 rounded-xl bg-emerald-500 px-3 py-3"
                              style={{ opacity: scheduleDecisionByRequest[job.id] ? 0.6 : 1 }}
                            >
                              <Text className="text-center text-xs font-bold uppercase tracking-[0.12em] text-emerald-950">Accept time</Text>
                            </Pressable>
                            <Pressable
                              disabled={scheduleDecisionByRequest[job.id]}
                              onPress={() => handleCustomerTimeDecision(job.id, 'reject')}
                              className="flex-1 rounded-xl border border-rose-400/60 bg-rose-500/10 px-3 py-3"
                              style={{ opacity: scheduleDecisionByRequest[job.id] ? 0.6 : 1 }}
                            >
                              <Text className="text-center text-xs font-bold uppercase tracking-[0.12em] text-rose-200">Decline time</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : showSchedulePicker ? (
                        <View className="mt-3">
                          <SchedulePicker
                            value={scheduleByRequest[job.id] ?? ''}
                            onChange={(value) => setScheduleByRequest((previous) => ({ ...previous, [job.id]: value }))}
                          />
                        </View>
                      ) : null}

                      {showDiagnosis ? (
                        <>
                          <Text className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">Note to manager</Text>
                          <Text className="mt-1 text-xs text-slate-400">This note is private to the manager and can also be used when you finish the repair.</Text>
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
                        {showSchedulePicker ? (
                          <Pressable
                            disabled={!scheduleByRequest[job.id]}
                            onPress={() => handleSendSchedule(job.id)}
                            className="flex-1 rounded-xl border border-cyan-500 bg-cyan-500/10 px-3 py-3"
                            style={{ opacity: scheduleByRequest[job.id] ? 1 : 0.5 }}
                          >
                            <Text className="text-center text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Confirm agreed time</Text>
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
