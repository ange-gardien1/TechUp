import { Link, Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from '../../src/components/ThemedNative';
import { useAuth } from '../../src/providers/AuthProvider';
import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://127.0.0.1:4000');

type ManagerTask = {
  id: number;
  customer: string;
  customerId: number | null;
  technicianId: number | null;
  device: string;
  issue: string;
  status: string;
  preferredTime: string | null;
  amount: number;
  createdAt: string | null;
};

type ManagerTechnician = {
  id: number;
  fullName: string;
  email: string;
};

type ManagerDashboard = {
  technicianCount: number;
  openRequests: number;
  scheduledRequests: number;
  quoteRequests: number;
  technicians: ManagerTechnician[];
  requests: ManagerTask[];
};

const ARCHIVE_STATUSES = new Set(['completed', 'closed', 'cancelled', 'rejected']);

export default function ManagerScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<ManagerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<Record<number, number>>({});
  const [preferredTime, setPreferredTime] = useState<Record<number, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/manager/dashboard`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to load manager dashboard');
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load manager dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'manager') {
      loadDashboard();
    }
  }, [user?.role]);

  const managerStats = useMemo(
    () => [
      { label: 'Open jobs', value: String(dashboard?.openRequests ?? 0), tone: '#F59E0B' },
      { label: 'Scheduled', value: String(dashboard?.scheduledRequests ?? 0), tone: '#FBBF24' },
      { label: 'Quote pending', value: String(dashboard?.quoteRequests ?? 0), tone: '#FB7185' },
      { label: 'Technicians', value: String(dashboard?.technicianCount ?? 0), tone: '#34D399' },
    ],
    [dashboard],
  );

  const activeRequests = useMemo(
    () => (dashboard?.requests ?? []).filter((task) => !ARCHIVE_STATUSES.has(String(task.status ?? '').toLowerCase())),
    [dashboard?.requests],
  );

  const archiveRequests = useMemo(
    () => (dashboard?.requests ?? []).filter((task) => ARCHIVE_STATUSES.has(String(task.status ?? '').toLowerCase())),
    [dashboard?.requests],
  );

  async function handleAssignTechnician(requestId: number) {
    const technicianId = selectedTechnicianId[requestId] ?? dashboard?.technicians?.[0]?.id;
    if (!technicianId) {
      setStatusMessage('No technician is available for assignment.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/repair-requests/${requestId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId, serviceFee: 120 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to assign technician');
      setStatusMessage(`Technician assigned for request #${requestId}.`);
      await loadDashboard();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to assign technician');
    }
  }

  async function handleScheduleRequest(requestId: number) {
    const technicianId = selectedTechnicianId[requestId] ?? dashboard?.technicians?.[0]?.id;
    const scheduleTime = preferredTime[requestId] ?? 'Tomorrow, 10:00 AM';

    try {
      const response = await fetch(`${API_BASE_URL}/repair-requests/${requestId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredTime: scheduleTime, technicianId, note: 'Scheduled by manager review.' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to schedule request');
      setStatusMessage(`Schedule confirmed for request #${requestId}.`);
      await loadDashboard();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to schedule request');
    }
  }

  async function handleEscalateToAdmin(requestId: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/repair-requests/${requestId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Escalated by manager for admin review and approval.' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to escalate the request');
      setStatusMessage(`Request #${requestId} escalated to admin.`);
      await loadDashboard();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to escalate request');
    }
  }

  async function handleApproveClosure(requestId: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/repair-requests/${requestId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, reason: 'Manager approved the completed repair and closed the request for the customer.' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to close request');
      setStatusMessage(`Request #${requestId} was closed and marked complete.`);
      await loadDashboard();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to close request');
    }
  }

  async function handleSendQuote(requestId: number) {
    const technicianId = selectedTechnicianId[requestId] ?? dashboard?.technicians?.[0]?.id;
    if (!technicianId) {
      setStatusMessage('Select a technician before sending a quotation.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/repair-requests/${requestId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          technicianId,
          laborCost: 120,
          sparePartsCost: 80,
          quantity: 1,
          diagnosis: 'Manager review completed: minor battery and screen fault confirmed on inspection.',
          currency: 'RWF',
          totalDue: 200,
          notes: 'Manager quote prepared following inspection. Customer approval is required before the repair starts.',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to send quotation');
      setStatusMessage(`Quote sent for request #${requestId}.`);
      await loadDashboard();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to send quotation');
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'manager') {
    return <Redirect href={`/${user.role}` as any} />;
  }

  return (
    <View className="flex-1 bg-[#09111F]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="bg-[#0B1B4B] px-5 pb-7 pt-8">
          <View className="mb-5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200">Manager</Text>
              </View>
              <Pressable onPress={handleLogout} className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">Logout</Text>
              </Pressable>
            </View>
          </View>

          <Text className="text-3xl font-black text-white">Operations hub</Text>
          <Text className="mt-2 text-base text-blue-100">
            Review the work queue, assign technicians, confirm schedules, and escalate issues for admin resolution.
          </Text>
        </View>

        <View className="px-5 pt-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-white">Service overview</Text>
            <View className="flex-row items-center gap-2">
              <Pressable onPress={() => router.push('/manager/recent')} className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">Recent</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/manager/archive')} className="rounded-full border border-slate-500/30 bg-slate-900/80 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200">Archive</Text>
              </Pressable>
            </View>
          </View>
          <View className="flex-row flex-wrap justify-between">
            {managerStats.map((item) => (
              <View key={item.label} className="mb-3 w-[47%] rounded-2xl border border-slate-700 bg-[#111827] p-4">
                <Text className="text-2xl font-black text-white" style={{ color: item.tone }}>{item.value}</Text>
                <Text className="mt-1 text-xs text-slate-400">{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {statusMessage ? (
          <View className="mx-5 mt-4 rounded-2xl border border-emerald-700 bg-emerald-500/10 p-3">
            <Text className="text-sm text-emerald-200">{statusMessage}</Text>
          </View>
        ) : null}

        {loading ? (
          <View className="mx-5 mt-6 rounded-2xl border border-slate-700 bg-[#111827] p-5">
            <ActivityIndicator color="#fbbf24" />
            <Text className="mt-3 text-center text-sm text-slate-300">Loading live manager queue...</Text>
          </View>
        ) : error ? (
          <View className="mx-5 mt-6 rounded-2xl border border-rose-900 bg-[#201313] p-4">
            <Text className="text-sm text-rose-200">{error}</Text>
          </View>
        ) : dashboard ? (
          <>
            <View className="mt-6 px-5">
              <Text className="mb-4 text-lg font-bold text-white">Work queue</Text>
              {activeRequests.length === 0 ? (
                <View className="rounded-2xl border border-slate-700 bg-[#111827] p-5">
                  <Text className="text-sm text-slate-300">No active repair requests in the queue.</Text>
                </View>
              ) : (
                activeRequests.map((task) => {
                  const normalizedStatus = String(task.status ?? '').toLowerCase();
                  const showAssign = ['submitted', 'under_review', 'technician_assigned'].includes(normalizedStatus);
                  const showSchedule = ['technician_assigned', 'scheduled'].includes(normalizedStatus);
                  const showQuote = normalizedStatus === 'scheduled';
                  const showClosure = normalizedStatus === 'completed';

                  return (
                    <View key={task.id} className="mb-4 rounded-2xl border border-slate-700 bg-[#111827] p-4">
                      <View className="mb-2 flex-row items-center justify-between">
                        <Text className="text-base font-bold text-white">#{task.id} · {task.device}</Text>
                        <Text className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300">{task.status}</Text>
                      </View>
                      <Text className="text-sm text-slate-300">Customer: {task.customer}</Text>
                      <Text className="mt-1 text-xs text-slate-400">{task.issue}</Text>
                      <Text className="mt-2 text-xs text-slate-500">
                        {task.preferredTime ? `Preferred time: ${task.preferredTime}` : 'Time to be scheduled'}
                      </Text>

                      {showAssign ? (
                        <View className="mt-3 rounded-xl border border-slate-700 bg-[#1d1d1d] p-2">
                          <Text className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">Assign technician</Text>
                          <View className="flex-row flex-wrap gap-2">
                            {(dashboard?.technicians ?? []).map((tech) => {
                              const isSelected = (selectedTechnicianId[task.id] ?? task.technicianId ?? dashboard?.technicians?.[0]?.id ?? 0) === tech.id;
                              return (
                                <Pressable
                                  key={tech.id}
                                  onPress={() => setSelectedTechnicianId((previous) => ({ ...previous, [task.id]: tech.id }))}
                                  className={`rounded-full border px-2 py-1 ${isSelected ? 'border-emerald-400 bg-emerald-500/15' : 'border-slate-600 bg-[#0f172a]'}`}
                                >
                                  <Text className={`text-[10px] font-bold ${isSelected ? 'text-emerald-200' : 'text-slate-300'}`}>{tech.fullName}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Pressable onPress={() => handleAssignTechnician(task.id)} className="mt-3 rounded-xl border border-emerald-500 bg-emerald-500/10 px-3 py-2">
                            <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200">Assign selected technician</Text>
                          </Pressable>
                        </View>
                      ) : null}

                      {showSchedule ? (
                        <View className="mt-3 rounded-xl border border-slate-700 bg-[#1d1d1d] p-2">
                          <Text className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">Schedule</Text>
                          <View className="flex-row items-center gap-2">
                            <TextInput
                              value={preferredTime[task.id] ?? task.preferredTime ?? 'Tomorrow, 10:00 AM'}
                              onChangeText={(value) => setPreferredTime((previous) => ({ ...previous, [task.id]: value }))}
                              placeholder="Preferred date and time"
                              placeholderTextColor="#64748b"
                              className="flex-1 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-white"
                            />
                            <Pressable onPress={() => handleScheduleRequest(task.id)} className="rounded-xl border border-amber-500 bg-amber-500/10 px-3 py-2">
                              <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">Schedule</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}

                      {showQuote ? (
                        <Pressable onPress={() => handleSendQuote(task.id)} className="mt-3 rounded-xl border border-emerald-500 bg-emerald-500/10 px-3 py-2">
                          <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200">Send quote</Text>
                        </Pressable>
                      ) : null}

                      {normalizedStatus === 'customer_approval' ? (
                        <View className="mt-3 rounded-xl border border-cyan-500 bg-cyan-500/10 px-3 py-2">
                          <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">Awaiting customer approval</Text>
                        </View>
                      ) : null}

                      {normalizedStatus === 'repair_in_progress' ? (
                        <View className="mt-3 rounded-xl border border-violet-500 bg-violet-500/10 px-3 py-2">
                          <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-violet-200">Repair in progress</Text>
                        </View>
                      ) : null}

                      {showClosure ? (
                        <Pressable onPress={() => handleApproveClosure(task.id)} className="mt-2 rounded-xl border border-violet-500 bg-violet-500/10 px-3 py-2">
                          <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-violet-200">Approve closure</Text>
                        </Pressable>
                      ) : null}

                      {normalizedStatus !== 'customer_approval' && normalizedStatus !== 'repair_in_progress' ? (
                        <Pressable onPress={() => handleEscalateToAdmin(task.id)} className="mt-3 rounded-xl border border-rose-500 bg-rose-500/10 px-3 py-2">
                          <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-rose-200">Escalate</Text>
                        </Pressable>
                      ) : null}

                      <View className="mt-2 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2">
                        <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-slate-300">RWF {task.amount}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View className="mt-6 px-5">
              <Text className="mb-4 text-lg font-bold text-white">Team performance</Text>
              <View className="rounded-[24px] border border-slate-700 bg-[#111827] p-4">
                {(dashboard.technicians ?? []).length === 0 ? (
                  <Text className="text-sm text-slate-300">No technicians registered yet.</Text>
                ) : (
                  (dashboard.technicians ?? []).map((person) => (
                    <View key={person.id} className="mb-3 flex-row items-center justify-between border-b border-slate-700 pb-3 last:border-b-0 last:pb-0 last:mb-0">
                      <View>
                        <Text className="text-base font-semibold text-white">{person.fullName}</Text>
                        <Text className="text-xs text-slate-400">{person.email}</Text>
                      </View>
                      <View className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1">
                        <Text className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200">Available</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
