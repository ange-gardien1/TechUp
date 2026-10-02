import { Link, Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive } from 'lucide-react-native';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from '../../src/components/ThemedNative';
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

type QuotePreview = {
  id: number;
  repairRequestId: number;
  technicianId: number | null;
  amount: number;
  notes: string | null;
  status: string;
  createdAt: string;
};

export default function CustomerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const customerId = user?.id;
  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [quotePreview, setQuotePreview] = useState<QuotePreview | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [ratedRequestIds, setRatedRequestIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedRequest = useMemo(
    () => repairs.find((request) => request.id === selectedRequestId) ?? repairs[0] ?? null,
    [repairs, selectedRequestId],
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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

    async function loadCustomerRepairs() {
      if (!customerId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [rows, ratedRequestIds] = await Promise.all([
          apiRequest<RepairRequest[]>('/repair-requests'),
          apiRequest<number[]>(`/customers/${customerId}/rated-repair-requests`).catch(() => []),
        ]);
        if (!isActive) {
          return;
        }
        const ratedRequestIdSet = new Set(ratedRequestIds);
        const customerRepairs = rows
          .filter((request) =>
            request.customerId === customerId &&
            String(request.status ?? '').toLowerCase() !== 'closed' &&
            !ratedRequestIdSet.has(request.id),
          )
          .sort((a, b) => Number(b.id) - Number(a.id));
        setRepairs(customerRepairs);
        setRatedRequestIds(ratedRequestIdSet);
        setSelectedRequestId((previous) =>
          customerRepairs.some((request) => request.id === previous) ? previous : customerRepairs[0]?.id ?? null,
        );
        setError(null);
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Unable to load your repairs');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadCustomerRepairs();
      return () => {
        isActive = false;
      };
    }, [customerId]),
  );

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

  async function handleSubmitRating() {
    if (!selectedRequest || !selectedRequest.technicianId) {
      setError('This request does not have a technician assigned for rating.');
      return;
    }

    try {
      await apiRequest(`/repair-requests/${selectedRequest.id}/ratings`, {
        method: 'POST',
        body: JSON.stringify({
          customerId: user?.id,
          technicianId: selectedRequest.technicianId,
          score: ratingScore,
          comment: ratingComment,
        }),
      });

      setRatingComment('');
      setRatedRequestIds((previous) => new Set(previous).add(selectedRequest.id));
      setRepairs((previous) => previous.filter((request) => request.id !== selectedRequest.id));
      setError(null);
      setSelectedRequestId(selectedRequest.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit the rating');
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

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'customer') {
    return <Redirect href={`/${user.role}` as any} />;
  }

  return (
    <View className="flex-1 items-center bg-[#040B18]">
      <View className="flex-1 w-full bg-[#07142F]" style={{ maxWidth: 430 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 pb-5 pt-4">
          <Text className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">Customer dashboard</Text>
          <Text className="mt-2 text-3xl font-black text-white">Hi, {user.fullName?.split(' ')[0] ?? 'there'} 👋</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-300">
            Your repairs and updates, all in one place.
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="View repair history"
            onPress={() => router.push('/customer/archive')}
            className="mt-2 min-h-11 flex-row items-center self-start"
          >
            <Archive size={16} color="#22D3EE" />
            <Text className="ml-2 text-sm font-semibold text-cyan-300">View history</Text>
          </Pressable>
        </View>

        <View className="px-5 pt-1">
          <View className="mb-4 flex-row flex-wrap justify-between">
            {customerStats.map((item) => (
              <View key={item.label} className="mb-3 w-[31%] min-w-[96px] rounded-2xl border border-[#1C2D4A] bg-[#0D1B38] p-3">
                <Text className="text-lg font-black" style={{ color: item.tone }}>{item.value}</Text>
                <Text className="mt-1 text-[10px] text-slate-400">{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-1 px-5">
          {loading ? (
            <View className="rounded-2xl border border-slate-700 bg-[#0D1B38] p-5">
              <ActivityIndicator color="#67e8f9" />
              <Text className="mt-3 text-center text-sm text-slate-300">Loading your repairs...</Text>
            </View>
          ) : error ? (
            <View className="rounded-2xl border border-rose-800 bg-[#1f1117] p-4">
              <Text className="text-sm text-rose-300">{error}</Text>
            </View>
          ) : repairs.length === 0 ? (
            <View className="rounded-2xl border border-[#1C2D4A] bg-[#0D1B38] p-5">
              <Text className="text-base font-semibold text-white">No repair requests yet</Text>
              <Text className="mt-2 text-sm leading-5 text-slate-300">
                When you need a repair, tap the + button below to tell us what needs fixing.
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {selectedRequest ? (
                <View className="rounded-2xl border border-[#1C2D4A] bg-[#0D1B38] p-4">
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-lg font-bold text-white">Request #{selectedRequest.id}</Text>
                    <Text className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                      {ratedRequestIds.has(selectedRequest.id) && ['completed', 'closed'].includes(String(selectedRequest.status ?? '').toLowerCase())
                        ? 'Completed & rated'
                        : formatRepairStatus(selectedRequest.status)}
                    </Text>
                  </View>

                  <Text className="text-sm text-slate-200">
                    {selectedRequest.deviceType} · {selectedRequest.brand ?? 'Device'} {selectedRequest.model ?? ''}
                  </Text>
                  <Text className="mt-2 text-xs text-slate-400">
                    {selectedRequest.preferredTime ?? 'Scheduling pending'} • ${Number(selectedRequest.quoteAmount ?? selectedRequest.serviceFee ?? 0)}
                  </Text>

                  <View className="mt-3 flex-row gap-2">
                    <View className="flex-1 rounded-xl border border-slate-700 bg-[#101F3D] px-3 py-2">
                      <Text className="text-[9px] uppercase tracking-[0.18em] text-slate-400">Technician</Text>
                      <Text className="mt-1 text-sm text-slate-100">
                        {selectedRequest.technicianId ? `#${selectedRequest.technicianId}` : 'Awaiting'}
                      </Text>
                    </View>
                    <View className="flex-1 rounded-xl border border-slate-700 bg-[#101F3D] px-3 py-2">
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

                  {['completed', 'closed', 'cancelled', 'rejected'].includes(String(selectedRequest.status ?? '').toLowerCase()) ? null : (
                    <Pressable
                      onPress={() => handleStopRequest(selectedRequest.id)}
                      className="mt-3 rounded-xl border border-rose-500 bg-rose-500/10 px-3 py-2.5"
                    >
                      <Text className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-rose-200">Stop this request</Text>
                    </Pressable>
                  )}

                  {['completed', 'closed'].includes(String(selectedRequest.status ?? '').toLowerCase()) ? (
                    ratedRequestIds.has(selectedRequest.id) ? (
                      <View className="mt-3 rounded-xl border border-emerald-500 bg-emerald-500/10 p-3">
                        <Text className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300">Completed & rated</Text>
                        <Text className="mt-1 text-sm text-slate-200">Thanks for your feedback. This repair request is now fully closed.</Text>
                      </View>
                    ) : (
                      <View className="mt-3 rounded-xl border border-amber-500 bg-amber-500/10 p-3">
                        <Text className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300">Rate technician</Text>
                        <View className="mt-2 flex-row gap-2">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <Pressable
                              key={score}
                              onPress={() => setRatingScore(score)}
                              className={`rounded-full px-3 py-1.5 ${ratingScore === score ? 'bg-amber-500' : 'border border-slate-600 bg-[#111827]'}`}
                            >
                              <Text className={`text-xs font-bold ${ratingScore === score ? 'text-slate-900' : 'text-slate-200'}`}>{score}</Text>
                            </Pressable>
                          ))}
                        </View>
                        <TextInput
                          value={ratingComment}
                          onChangeText={setRatingComment}
                          placeholder="Leave a short note about the service"
                          placeholderTextColor="#64748b"
                          multiline
                          numberOfLines={3}
                          className="mt-2 min-h-[70px] rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-2 text-sm text-white"
                        />
                        <Pressable onPress={handleSubmitRating} className="mt-3 rounded-lg bg-amber-500 px-3 py-2">
                          <Text className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-slate-900">Submit rating</Text>
                        </Pressable>
                      </View>
                    )
                  ) : null}
                </View>
              ) : null}

              <View className="rounded-2xl border border-slate-700 bg-[#101F3D] p-3">
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
                        className={`rounded-xl border px-3 py-2.5 ${isSelected ? 'border-cyan-500 bg-[#0D1B38]' : 'border-slate-700 bg-[#101F3D]'}`}
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

      </ScrollView>
      </View>
    </View>
  );
}
