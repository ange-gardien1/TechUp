import { Link, Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from '../../src/components/ThemedNative';
import { useAuth } from '../../src/providers/AuthProvider';
import { apiRequest } from '../../src/lib/api';
import { formatScheduleTime } from '../../src/components/SchedulePicker';
import { formatRepairStatus } from '../../src/lib/repairWorkflow';
import { QuoteComposerModal, type QuoteForm } from '../../src/components/QuoteComposerModal';
import { useMemo, useState } from 'react';
import { useLiveRefresh } from '../../src/lib/useLiveRefresh';

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
  diagnosisNote: string | null;
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

const ARCHIVE_STATUSES = new Set(['closed', 'cancelled', 'rejected']);

export default function ManagerScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<ManagerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<Record<number, number>>({});
  const [quoteDialogRequestId, setQuoteDialogRequestId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      if (!dashboard) setLoading(true);
      const data = await apiRequest<ManagerDashboard>(`/manager/dashboard?userId=${user?.id}`);
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load manager dashboard');
    } finally {
      setLoading(false);
    }
  }

  useLiveRefresh(loadDashboard, user?.role === 'manager');

  const activeRequests = useMemo(
    () => (dashboard?.requests ?? []).filter((task) => !ARCHIVE_STATUSES.has(String(task.status ?? '').toLowerCase())),
    [dashboard?.requests],
  );

  const archiveRequests = useMemo(
    () => (dashboard?.requests ?? []).filter((task) => ARCHIVE_STATUSES.has(String(task.status ?? '').toLowerCase())),
    [dashboard?.requests],
  );

  const managerStats = useMemo(
    () => [
      { label: 'Open jobs', value: String(activeRequests.length), tone: '#F59E0B' },
      { label: 'Scheduled', value: String(dashboard?.scheduledRequests ?? 0), tone: '#FBBF24' },
      { label: 'Quote pending', value: String(dashboard?.quoteRequests ?? 0), tone: '#FB7185' },
      { label: 'Technicians', value: String(dashboard?.technicianCount ?? 0), tone: '#34D399' },
    ],
    [activeRequests.length, dashboard],
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
        body: JSON.stringify({ userId: user?.id, technicianId, serviceFee: 120 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to assign technician');
      setStatusMessage(`Technician assigned for request #${requestId}.`);
      await loadDashboard();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to assign technician');
    }
  }

  async function handleReviewRequest(requestId: number) {
    try {
      await apiRequest<unknown>(`/repair-requests/${requestId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      setStatusMessage(`Request #${requestId} reviewed. You can now assign a technician.`);
      await loadDashboard();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to review request');
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

  async function handleSendQuote(requestId: number, assignedTechnicianId: number | null, form: QuoteForm) {
    const technicianId = selectedTechnicianId[requestId] ?? assignedTechnicianId ?? dashboard?.technicians?.[0]?.id;
    if (!technicianId) {
      throw new Error('No technician is assigned to this request. Assign a technician before creating a quotation.');
    }

    const partCost = Number(form.partCost);
    const laborCost = Number(form.laborCost);
    await apiRequest(`/repair-requests/${requestId}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        technicianId,
        diagnosis: form.diagnosis,
        partName: form.partName,
        partCondition: form.partName ? form.partCondition : 'not_required',
        partCost: form.partName ? partCost : 0,
        laborCost,
      }),
    });
    setStatusMessage(`Quote sent for request #${requestId}.`);
    await loadDashboard();
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
            Review each new request, assign a technician, and let the technician confirm a time with the customer.
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
                  const showReview = normalizedStatus === 'submitted';
                  const showAssign = ['under_review', 'technician_assigned', 'schedule_rejected'].includes(normalizedStatus);
                  const showQuote = normalizedStatus === 'scheduled';
                  const showClosure = normalizedStatus === 'completed';

                  return (
                    <View key={task.id} className="mb-4 rounded-2xl border border-slate-700 bg-[#111827] p-4">
                      <View className="mb-2 flex-row items-center justify-between">
                        <Text className="text-base font-bold text-white">#{task.id} · {task.device}</Text>
                        <Text className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300">{formatRepairStatus(task.status)}</Text>
                      </View>
                      <Text className="text-sm text-slate-300">Customer: {task.customer}</Text>
                      <Text className="mt-1 text-xs text-slate-400">{task.issue}</Text>
                      <Text className="mt-2 text-xs text-slate-500">
                        {task.preferredTime ? `Preferred time: ${formatScheduleTime(task.preferredTime)}` : 'Time to be scheduled'}
                      </Text>
                      {task.diagnosisNote ? (
                        <View className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                          <Text className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">Private technician diagnosis · manager only</Text>
                          <Text className="mt-1 text-sm leading-5 text-amber-50">{task.diagnosisNote}</Text>
                        </View>
                      ) : null}

                      {normalizedStatus === 'schedule_rejected' ? (
                        <View className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2">
                          <Text className="text-xs leading-5 text-rose-200">
                            The assigned technician declined this time. Assign another technician to the request.
                          </Text>
                        </View>
                      ) : null}

                      {showReview ? (
                        <Pressable onPress={() => handleReviewRequest(task.id)} className="mt-3 rounded-xl border border-sky-500 bg-sky-500/10 px-3 py-2">
                          <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-sky-200">Review request</Text>
                        </Pressable>
                      ) : null}

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

                      {normalizedStatus === 'technician_assigned' ? (
                        <View className="mt-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2">
                          <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">Waiting for technician to schedule with customer</Text>
                        </View>
                      ) : null}

                      {showQuote ? (
                        <Pressable
                          onPress={() => setQuoteDialogRequestId(task.id)}
                          className="mt-3 rounded-xl border border-emerald-500 bg-emerald-500/10 px-3 py-3"
                        >
                          <Text className="text-center text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">Create quotation</Text>
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

                      <View className="mt-2 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2">
                        <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-slate-300">RWF {task.amount}</Text>
                      </View>
                    </View>
                  );
                })
              )}
              {dashboard.requests.map((task) => (
                <QuoteComposerModal
                  key={`quote-modal-${task.id}`}
                  visible={quoteDialogRequestId === task.id}
                  requestId={task.id}
                  device={task.device}
                  customer={task.customer}
                  diagnosisNote={task.diagnosisNote}
                  onClose={() => setQuoteDialogRequestId(null)}
                  onSubmit={(form) => handleSendQuote(task.id, task.technicianId, form)}
                />
              ))}
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
