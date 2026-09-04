import { Link, Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../../src/lib/api';
import { formatRepairStatus, getRepairStatusIndex, repairStatusFlow } from '../../src/lib/repairWorkflow';
import { useAuth } from '../../src/providers/AuthProvider';

type RepairRequest = {
  id: number;
  customerId: number | null;
  technicianId: number | null;
  deviceType: string;
  brand?: string | null;
  model?: string | null;
  issueDescription: string;
  status: string;
  serviceFee?: number | null;
  quoteAmount?: number | null;
  paymentStatus?: string | null;
  preferredTime?: string | null;
  createdAt?: string | null;
};

type NotificationItem = {
  id: number;
  userId: number;
  title: string;
  body: string;
  type: string;
  referenceId?: number | null;
  isRead: boolean;
  createdAt: string;
};

type QuotePreview = {
  id: number;
  repairRequestId: number;
  technicianId: number | null;
  amount: number;
  notes: string | null;
  status: string;
  createdAt: string;
};

const quickActions = [
  { label: 'Book repair', route: '/repair-flow' },
  { label: 'Track request', route: '/customer' },
  { label: 'Database', route: '/database' },
  { label: 'Get support', route: '/login' },
];

export default function CustomerScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [quotePreview, setQuotePreview] = useState<QuotePreview | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const selectedRequest = useMemo(
    () => repairs.find((request) => request.id === selectedRequestId) ?? repairs[0] ?? null,
    [repairs, selectedRequestId],
  );

  const unreadQuoteCount = useMemo(
    () => notifications.filter((item) => item.type === 'quote' && !item.isRead).length,
    [notifications],
  );

  const quoteDetails = useMemo(() => {
    if (!quotePreview?.notes) {
      return null;
    }

    const noteParts = quotePreview.notes.split('|').map((part) => part.trim()).filter(Boolean);
    const diagnosis = noteParts.find((part) => part.toLowerCase().startsWith('diagnosis:'))?.replace(/^diagnosis:\s*/i, '') ?? 'Diagnosis not provided';
    const quantity = noteParts.find((part) => part.toLowerCase().startsWith('quantity:'))?.replace(/^quantity:\s*/i, '') ?? '1';
    const total = noteParts.find((part) => part.toLowerCase().startsWith('total due:'))?.replace(/^total due:\s*/i, '') ?? `${quotePreview.amount.toLocaleString()} RWF`;

    return {
      diagnosis,
      quantity,
      total,
    };
  }, [quotePreview]);

  const timelineForSelectedRequest = useMemo(() => {
    if (!selectedRequest) {
      return [] as Array<{ label: string; detail: string; active: boolean; done: boolean }>;
    }

    const normalized = String(selectedRequest.status ?? 'submitted').toLowerCase().replace(/\s+/g, '_');
    const activeIndex = getRepairStatusIndex(selectedRequest.status);

    return repairStatusFlow.map((step, index) => {
      const done = index < activeIndex;
      const active = index === activeIndex;

      const detail =
        step.key === 'submitted'
          ? 'Request received and under review'
          : step.key === 'under_review'
            ? 'The company is checking the request'
            : step.key === 'technician_assigned'
              ? 'A technician has been assigned'
              : step.key === 'scheduled'
                ? 'Service timing has been set'
                : step.key === 'customer_approval'
                  ? 'Quote is waiting for your approval'
                  : step.key === 'repair_in_progress'
                    ? 'Repair work is in progress'
                    : 'Service is complete';

      return {
        label: step.label,
        detail: normalized === 'rejected' || normalized === 'cancelled' ? 'This request was closed' : detail,
        active,
        done,
      };
    });
  }, [selectedRequest]);

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  useEffect(() => {
    async function loadCustomerRepairs() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const rows = await apiRequest<RepairRequest[]>('/repair-requests');
        const customerRepairs = rows.filter((request) => request.customerId === user.id).sort((a, b) => Number(b.id) - Number(a.id));
        setRepairs(customerRepairs);
        setSelectedRequestId((previous) => previous ?? customerRepairs[0]?.id ?? null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load your repairs');
      } finally {
        setLoading(false);
      }
    }

    async function loadNotifications() {
      if (!user) {
        return;
      }

      try {
        const rows = await apiRequest<NotificationItem[]>(`/notifications/${user.id}`);
        setNotifications(rows);
      } catch (error) {
        console.error('Unable to load customer notifications', error);
      }
    }

    loadCustomerRepairs();
    loadNotifications();
  }, [user?.id]);

  useEffect(() => {
    async function loadQuotePreview() {
      if (!selectedRequest || selectedRequest.status !== 'customer_approval') {
        setQuotePreview(null);
        return;
      }

      try {
        const data = await apiRequest<{ quote: QuotePreview | null }>(`/repair-requests/${selectedRequest.id}/quotes`);
        setQuotePreview(data.quote ?? null);
      } catch (error) {
        console.error('Unable to load quote preview', error);
      }
    }

    loadQuotePreview();
  }, [selectedRequest?.id, selectedRequest?.status]);

  async function handleStopRequest(requestId: number) {
    Alert.alert('Stop this request?', 'This will cancel the current repair request and notify the company.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Stop request',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/repair-requests/${requestId}/cancel`, {
              method: 'POST',
              body: JSON.stringify({ reason: 'Customer stopped this request.' }),
            });

            setRepairs((previous) =>
              previous.map((request) =>
                request.id === requestId ? { ...request, status: 'cancelled', paymentStatus: 'cancelled' } : request,
              ),
            );
            setSelectedRequestId(requestId);
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to stop this request');
          }
        },
      },
    ]);
  }

  async function handleQuoteDecision(decision: 'approve' | 'reject') {
    if (!selectedRequest) {
      return;
    }

    try {
      const endpoint = decision === 'approve' ? 'approve-quote' : 'reject-quote';
      await apiRequest(`/repair-requests/${selectedRequest.id}/${endpoint}`, {
        method: 'POST',
      });

      setRepairs((previous) =>
        previous.map((request) =>
          request.id === selectedRequest.id
            ? {
                ...request,
                status: decision === 'approve' ? 'repair_in_progress' : 'rejected',
                paymentStatus: decision === 'approve' ? 'pending' : request.paymentStatus,
              }
            : request,
        ),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process quote decision');
    }
  }

  const customerStats = useMemo(() => {
    const active = repairs.filter((request) => ['pending', 'quoted', 'assigned', 'in-progress', 'approved'].includes(request.status)).length;
    const openPayments = repairs.reduce((total, request) => {
      const amount = Number(request.quoteAmount ?? request.serviceFee ?? 0);
      if (request.paymentStatus && request.paymentStatus !== 'paid') {
        return total + amount;
      }
      return total;
    }, 0);
    const savedDevices = new Set(repairs.map((request) => request.deviceType)).size;

    return [
      { label: 'Active repairs', value: String(active), tone: '#06B6D4' },
      { label: 'Open payments', value: `$${openPayments || 0}`, tone: '#10B981' },
      { label: 'Saved devices', value: String(savedDevices), tone: '#F59E0B' },
    ];
  }, [repairs]);

  const recentActivity = useMemo(() => {
    return repairs.slice(0, 3).map((request) => {
      const title = request.deviceType || 'Device repair';
      const statusText = request.status ? request.status.replace('-', ' ') : 'received';
      return `${title} request is ${statusText}.`;
    });
  }, [repairs]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'customer') {
    return <Redirect href={`/${user.role}` as any} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-[#09111F]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="bg-[#0F172A] px-5 pb-7 pt-8">
          <View className="mb-5 flex-row items-center justify-between">
            <Link href="/" asChild>
              <Pressable>
                <Text className="text-base font-semibold text-cyan-300">← Home</Text>
              </Pressable>
            </Link>
            <View className="flex-row items-center gap-2">
              <Pressable onPress={() => setShowNotifications((current) => !current)} className="relative rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5">
                <Text className="text-base">🔔</Text>
                {unreadQuoteCount > 0 ? (
                  <View className="absolute -right-1 -top-1 min-w-[18px] items-center rounded-full bg-rose-500 px-1">
                    <Text className="text-[9px] font-bold text-white">{unreadQuoteCount}</Text>
                  </View>
                ) : null}
              </Pressable>
              <View className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200">Customer</Text>
              </View>
              <Pressable onPress={handleLogout} className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">Logout</Text>
              </Pressable>
            </View>
          </View>

          {showNotifications ? (
            <View className="mb-4 rounded-2xl border border-slate-700 bg-[#111827] p-3">
              <Text className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Notifications</Text>
              {notifications.length === 0 ? (
                <Text className="text-sm text-slate-300">No updates yet.</Text>
              ) : (
                notifications.slice(0, 4).map((item) => (
                  <View key={item.id} className="mb-2 rounded-xl border border-slate-700 bg-[#0b1220] p-2 last:mb-0">
                    <Text className="text-sm font-semibold text-white">{item.title}</Text>
                    <Text className="mt-1 text-xs text-slate-300">{item.body}</Text>
                  </View>
                ))
              )}
            </View>
          ) : null}

          <Text className="text-3xl font-black text-white">Hello, {user.fullName?.split(' ')[0] ?? 'Customer'}</Text>
          <Text className="mt-2 text-base text-slate-300">
            Track repairs, review updates, and stay on top of service progress.
          </Text>
        </View>

        <View className="px-5 pt-6">
          <View className="mb-4 flex-row flex-wrap justify-between">
            {customerStats.map((item) => (
              <View key={item.label} className="mb-3 w-[31%] min-w-[100px] rounded-2xl border border-slate-700 bg-[#111827] p-3">
                <Text className="text-lg font-black" style={{ color: item.tone }}>{item.value}</Text>
                <Text className="mt-1 text-[10px] text-slate-400">{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-2 px-5">
          {loading ? (
            <View className="rounded-2xl border border-slate-700 bg-[#111827] p-5">
              <ActivityIndicator color="#67e8f9" />
              <Text className="mt-3 text-center text-sm text-slate-300">Loading your repairs...</Text>
            </View>
          ) : error ? (
            <View className="rounded-2xl border border-rose-800 bg-[#1f1117] p-4">
              <Text className="text-sm text-rose-300">{error}</Text>
            </View>
          ) : repairs.length === 0 ? (
            <View className="rounded-2xl border border-slate-700 bg-[#111827] p-5">
              <Text className="text-base font-semibold text-white">No repair requests yet</Text>
              <Text className="mt-2 text-sm text-slate-300">Create a repair request from the service booking flow to see it here.</Text>
            </View>
          ) : (
            <View className="space-y-4">
              {selectedRequest ? (
                <View className="rounded-2xl border border-cyan-700 bg-[#0f172a] p-4">
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-lg font-bold text-white">Request #{selectedRequest.id}</Text>
                    <Text className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                      {formatRepairStatus(selectedRequest.status)}
                    </Text>
                  </View>

                  <Text className="text-sm text-slate-200">
                    {selectedRequest.deviceType} · {selectedRequest.brand ?? 'Device'} {selectedRequest.model ?? ''}
                  </Text>
                  <Text className="mt-2 text-xs text-slate-400">
                    {selectedRequest.preferredTime ?? 'Scheduling pending'} • ${Number(selectedRequest.quoteAmount ?? selectedRequest.serviceFee ?? 0)}
                  </Text>

                  <View className="mt-3 flex-row gap-2">
                    <View className="flex-1 rounded-xl border border-slate-700 bg-[#111827] px-3 py-2">
                      <Text className="text-[9px] uppercase tracking-[0.18em] text-slate-400">Technician</Text>
                      <Text className="mt-1 text-sm text-slate-100">
                        {selectedRequest.technicianId ? `#${selectedRequest.technicianId}` : 'Awaiting'}
                      </Text>
                    </View>
                    <View className="flex-1 rounded-xl border border-slate-700 bg-[#111827] px-3 py-2">
                      <Text className="text-[9px] uppercase tracking-[0.18em] text-slate-400">Issue</Text>
                      <Text className="mt-1 text-sm text-slate-100" numberOfLines={1}>{selectedRequest.issueDescription}</Text>
                    </View>
                  </View>

                  {Number(selectedRequest.quoteAmount ?? 0) > 0 && String(selectedRequest.status ?? '').toLowerCase() === 'customer_approval' ? (
                    <View className="mt-3 rounded-xl border border-amber-500 bg-amber-500/10 p-3">
                      <Text className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300">Quote approval</Text>
                      <Text className="mt-2 text-base font-semibold text-white">{quoteDetails?.total ?? `${Number(selectedRequest.quoteAmount ?? 0).toLocaleString()} RWF`}</Text>
                      <Text className="mt-1 text-xs text-slate-300">Diagnosis: {quoteDetails?.diagnosis ?? 'No diagnosis details available yet.'}</Text>
                      <Text className="mt-1 text-xs text-slate-300">Quantity: {quoteDetails?.quantity ?? '1'}</Text>
                      <View className="mt-2 flex-row gap-2">
                        <Pressable onPress={() => handleQuoteDecision('approve')} className="flex-1 rounded-lg bg-emerald-500 px-2 py-2">
                          <Text className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-white">Approve</Text>
                        </Pressable>
                        <Pressable onPress={() => handleQuoteDecision('reject')} className="flex-1 rounded-lg border border-rose-500 bg-rose-500/10 px-2 py-2">
                          <Text className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-rose-200">Reject</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  <View className="mt-3 rounded-xl border border-slate-700 bg-[#111827] p-3">
                    <Text className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">Progress</Text>
                    <View className="mt-2 flex-row gap-2">
                      {timelineForSelectedRequest.map((step) => (
                        <View key={step.label} className="flex-1 items-center">
                          <View className={`h-2.5 w-2.5 rounded-full ${step.done ? 'bg-emerald-400' : step.active ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                          <Text className="mt-1 text-[8px] text-center text-slate-300">{step.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {['completed', 'cancelled', 'rejected'].includes(String(selectedRequest.status ?? '').toLowerCase()) ? null : (
                    <Pressable
                      onPress={() => handleStopRequest(selectedRequest.id)}
                      className="mt-3 rounded-xl border border-rose-500 bg-rose-500/10 px-3 py-2.5"
                    >
                      <Text className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-rose-200">Stop this request</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}

              <View className="rounded-2xl border border-slate-700 bg-[#111827] p-3">
                <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">Recent requests</Text>
                <View className="mt-3 gap-2">
                  {repairs.map((repair) => {
                    const amount = Number(repair.quoteAmount ?? repair.serviceFee ?? 0);
                    const itemLabel = `${repair.deviceType}${repair.brand ? ` · ${repair.brand}` : ''}`;
                    const isSelected = selectedRequest?.id === repair.id;

                    return (
                      <Pressable
                        key={repair.id}
                        onPress={() => setSelectedRequestId(repair.id)}
                        className={`rounded-xl border px-3 py-2.5 ${isSelected ? 'border-cyan-500 bg-[#0f172a]' : 'border-slate-700 bg-[#0b1220]'}`}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm font-semibold text-white">#{repair.id} · {itemLabel}</Text>
                          <Text className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">{repair.status}</Text>
                        </View>
                        <Text className="mt-1 text-[11px] text-slate-400">
                          {repair.preferredTime ?? 'Schedule pending'} • ${amount || 0}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </View>

        <View className="mt-5 px-5">
          <View className="flex-row flex-wrap justify-between gap-2">
            {quickActions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => router.push(action.route as any)}
                className="rounded-xl border border-slate-700 bg-[#111827] px-3 py-3"
                style={{ width: '48%' }}
              >
                <Text className="text-center text-sm font-semibold text-slate-100">{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="mt-5 px-5 pb-2">
          <Text className="mb-3 text-sm font-bold text-white">Activity</Text>
          <View className="rounded-[20px] border border-slate-700 bg-[#111827] p-3">
            {recentActivity.length === 0 ? (
              <Text className="text-sm text-slate-300">No activity yet for this account.</Text>
            ) : (
              recentActivity.map((item) => (
                <View key={item} className="mb-2 flex-row items-start">
                  <View className="mr-2 mt-1.5 h-2 w-2 rounded-full bg-cyan-400" />
                  <Text className="flex-1 text-xs leading-5 text-slate-300">{item}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
