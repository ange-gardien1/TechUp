import { Link, Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive } from 'lucide-react-native';
import { AppState } from 'react-native';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from '../../src/components/ThemedNative';
import { apiRequest } from '../../src/lib/api';
import { formatRepairStatus, getRepairStatusIndex, repairStatusFlow } from '../../src/lib/repairWorkflow';
import { useAuth } from '../../src/providers/AuthProvider';
import { formatScheduleTime } from '../../src/components/SchedulePicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
  diagnosis?: string | null;
  partName?: string | null;
  partCondition?: string | null;
  partCost?: number | null;
  laborCost?: number | null;
  contactPhone?: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

const CANCELLABLE_CUSTOMER_STATUSES = new Set([
  'submitted',
  'under_review',
  'technician_assigned',
  'schedule_rejected',
  'scheduled',
  'customer_approval',
]);

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

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
  const [downloadingQuote, setDownloadingQuote] = useState(false);
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [cancelConfirmRequestId, setCancelConfirmRequestId] = useState<number | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedRequest = useMemo(
    () => repairs.find((request) => request.id === selectedRequestId) ?? repairs[0] ?? null,
    [repairs, selectedRequestId],
  );

  const quoteDetails = useMemo(() => {
    if (!quotePreview) return null;
    const noteParts = (quotePreview.notes ?? '').split('|').map((part) => part.trim()).filter(Boolean);
    const legacyValue = (label: string) =>
      noteParts.find((part) => part.toLowerCase().startsWith(`${label.toLowerCase()}:`))
        ?.replace(new RegExp(`^${label}:\\s*`, 'i'), '') ?? '';
    const diagnosis = quotePreview.diagnosis || legacyValue('Diagnosis') || 'Diagnosis not provided';
    const partCost = Number(quotePreview.partCost ?? 0);
    const laborCost = Number(quotePreview.laborCost ?? 0);

    return {
      diagnosis,
      partName: quotePreview.partName ?? '',
      partCondition: quotePreview.partCondition ?? '',
      partCost,
      laborCost,
      hasBreakdown: quotePreview.partCost != null && quotePreview.laborCost != null,
      total: Number(quotePreview.amount).toLocaleString(),
      contactPhone: quotePreview.contactPhone ?? '0782245728',
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
        normalized === 'schedule_rejected' && step.key === 'under_review'
          ? 'The manager is assigning another technician for your preferred time'
          : step.key === 'submitted'
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
      let isLoadingRepairs = false;
      let hasLoadedRepairs = false;

    async function loadCustomerRepairs() {
      if (isLoadingRepairs) return;
      if (!customerId) {
        setLoading(false);
        return;
      }

      isLoadingRepairs = true;
      try {
        if (!hasLoadedRepairs) setLoading(true);
        const [rows, ratedRequestIds] = await Promise.all([
          apiRequest<RepairRequest[]>(`/repair-requests?userId=${customerId}`),
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
            !['cancelled', 'canceled'].includes(String(request.status ?? '').trim().toLowerCase()) &&
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
        isLoadingRepairs = false;
        hasLoadedRepairs = true;
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadCustomerRepairs();
      const refreshInterval = setInterval(() => {
        if (AppState.currentState === 'active') void loadCustomerRepairs();
      }, 5000);
      return () => {
        isActive = false;
        clearInterval(refreshInterval);
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
        const data = await apiRequest<{ quote: QuotePreview | null }>(
          `/repair-requests/${selectedRequest.id}/quotes?userId=${user?.id}`,
        );
        setQuotePreview(data.quote ?? null);
      } catch (error) {
        console.error('Unable to load quote preview', error);
      }
    }

    loadQuotePreview();
  }, [selectedRequest?.id, selectedRequest?.status, user?.id]);

  async function handleStopRequest(requestId: number) {
    const request = repairs.find((item) => item.id === requestId);
    if (!request || !CANCELLABLE_CUSTOMER_STATUSES.has(String(request.status ?? '').trim().toLowerCase())) {
      return;
    }
    setCancelConfirmRequestId(requestId);
  }

  async function confirmStopRequest() {
    if (cancelConfirmRequestId === null || !user?.id || cancellingRequest) return;

    setCancellingRequest(true);
    try {
      await apiRequest(`/repair-requests/${cancelConfirmRequestId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          reason: 'Customer stopped this request.',
        }),
      });

      const remainingRepairs = repairs.filter((request) => request.id !== cancelConfirmRequestId);
      setRepairs(remainingRepairs);
      setSelectedRequestId((previous) =>
        previous === cancelConfirmRequestId ? remainingRepairs[0]?.id ?? null : previous,
      );
      setCancelConfirmRequestId(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to stop this request');
      setCancelConfirmRequestId(null);
    } finally {
      setCancellingRequest(false);
    }
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
      setQuoteModalVisible(false);
      setQuotePreview(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process quote decision');
    }
  }

  async function handleDownloadQuotation() {
    if (!selectedRequest || !quotePreview || !quoteDetails) return;

    const customerName = user?.fullName ?? 'Customer';
    const partLabel = quoteDetails.partName
      ? `${quoteDetails.partCondition === 'second_hand' ? 'Second-hand' : 'New'} ${quoteDetails.partName}`
      : 'No replacement part';
    const costRows = quoteDetails.hasBreakdown
      ? `<tr><td>${escapeHtml(partLabel)}</td><td>${quoteDetails.partCost.toLocaleString()}</td></tr>
         <tr><td>Labor</td><td>${quoteDetails.laborCost.toLocaleString()}</td></tr>`
      : `<tr><td>Repair service</td><td>${quoteDetails.total}</td></tr>`;
    const html = `<!doctype html>
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page { size: A4; margin: 16mm; }
        * { box-sizing: border-box; }
        body { color: #17243a; font: 12px Arial, Helvetica, sans-serif; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .sheet { max-width: 760px; margin: 0 auto; }
        header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1677ff; padding: 0 0 18px; }
        .brand { color: #0b1b4b; font-size: 24px; font-weight: 800; letter-spacing: 2px; }
        .title { color: #0b1b4b; font-size: 20px; font-weight: 700; text-align: right; }
        .muted { color: #64748b; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; padding: 20px 0; }
        .meta div { padding: 4px 0; }
        .label { display: block; margin-bottom: 2px; color: #64748b; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
        .diagnosis { border-left: 3px solid #1677ff; background: #f1f6ff; padding: 12px 14px; margin: 8px 0 20px; white-space: pre-wrap; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th { background: #0b1b4b; color: white; font-size: 10px; text-transform: uppercase; letter-spacing: .6px; }
        th, td { border-bottom: 1px solid #dce3ed; padding: 11px 10px; text-align: left; }
        th:last-child, td:last-child { text-align: right; white-space: nowrap; }
        tr { break-inside: avoid; }
        .total td { border-top: 2px solid #0b1b4b; border-bottom: 0; color: #0b1b4b; font-size: 16px; font-weight: 800; }
        footer { border-top: 1px solid #dce3ed; margin-top: 32px; padding-top: 14px; }
        .contact { color: #0b1b4b; font-size: 14px; font-weight: 700; }
      </style></head><body>
      <main class="sheet">
      <header><div class="brand">TECHUP</div><div><div class="title">REPAIR QUOTATION</div><div class="muted">Quote #${selectedRequest.id}</div></div></header>
      <section class="meta">
        <div><span class="label">Prepared</span>${escapeHtml(new Date(quotePreview.createdAt).toLocaleDateString())}</div>
        <div><span class="label">Customer</span>${escapeHtml(customerName)}</div>
        <div><span class="label">Device</span>${escapeHtml([selectedRequest.deviceType, selectedRequest.brand, selectedRequest.model].filter(Boolean).join(' '))}</div>
        <div><span class="label">Issue reported</span>${escapeHtml(selectedRequest.issueDescription)}</div>
      </section>
      <section class="diagnosis"><span class="label">Diagnosis & recommended repair</span>${escapeHtml(quoteDetails.diagnosis)}</section>
      <table><thead><tr><th>Description</th><th>Amount (RWF)</th></tr></thead><tbody>
        ${costRows}
        <tr class="total"><td>Total due</td><td>${quoteDetails.total}</td></tr>
      </tbody></table>
      <footer><span class="label">Questions about this quotation?</span>
        <span class="contact">TechUp Support · ${escapeHtml(quoteDetails.contactPhone)}</span>
        <p class="muted">Please approve or reject this quotation in your TeckUP customer account. Repair work begins after your approval.</p>
      </footer></main></body></html>`;

    setDownloadingQuote(true);
    try {
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (!(await Sharing.isAvailableAsync())) {
          throw new Error('Quotation PDF created, but sharing is unavailable on this device.');
        }
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Quotation ${selectedRequest.id}`,
        });
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to create the quotation PDF.');
    } finally {
      setDownloadingQuote(false);
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
      { label: 'Open payments RWF', value: `${openPayments || 0}`, tone: '#10B981' },
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
                    {String(selectedRequest.status ?? '').toLowerCase() === 'scheduled' ? 'Scheduled' : 'Preferred time'}: {formatScheduleTime(selectedRequest.preferredTime)}
                    {' • '}${Number(selectedRequest.quoteAmount ?? selectedRequest.serviceFee ?? 0)}
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
                    <Pressable
                      onPress={() => setQuoteModalVisible(true)}
                      className="mt-3 rounded-xl border border-amber-500 bg-amber-500/10 p-3"
                    >
                      <Text className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300">Quotation awaiting your decision</Text>
                      <Text className="mt-1 text-base font-semibold text-white">RWF {Number(selectedRequest.quoteAmount).toLocaleString()}</Text>
                      <Text className="mt-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-cyan-200">View full quotation</Text>
                    </Pressable>
                  ) : null}

                  <Modal
                    visible={quoteModalVisible && String(selectedRequest.status ?? '').toLowerCase() === 'customer_approval'}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setQuoteModalVisible(false)}
                    statusBarTranslucent
                  >
                    <View className="flex-1 items-center justify-center bg-black/70 px-4 py-6">
                      <View className="w-full overflow-hidden rounded-[28px] border border-slate-700 bg-[#091525]" style={{ maxWidth: 560, maxHeight: '94%' }}>
                        <View className="flex-row items-center justify-between border-b border-slate-700 px-5 py-4">
                          <View>
                            <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Quotation #{selectedRequest.id}</Text>
                            <Text className="mt-1 text-lg font-black text-white">Review repair estimate</Text>
                          </View>
                          <Pressable accessibilityRole="button" onPress={() => setQuoteModalVisible(false)} className="rounded-full border border-slate-600 px-3 py-2">
                            <Text className="text-sm font-semibold text-slate-200">Close</Text>
                          </Pressable>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
                          <View className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4">
                            <Text className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">TechUp · Repair quotation</Text>
                            <Text className="mt-2 text-sm font-semibold text-white">
                              {selectedRequest.deviceType} {selectedRequest.brand ?? ''} {selectedRequest.model ?? ''}
                            </Text>
                            <Text className="mt-1 text-xs text-slate-400">{selectedRequest.issueDescription}</Text>
                          </View>
                          <Text className="mb-1 mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Diagnosis & recommended repair</Text>
                          <Text className="text-sm leading-6 text-slate-100">{quoteDetails?.diagnosis ?? 'Diagnosis details unavailable.'}</Text>
                          <View className="mt-4 overflow-hidden rounded-2xl border border-slate-700">
                            {quoteDetails?.hasBreakdown ? (
                              <>
                                <View className="flex-row justify-between border-b border-slate-700 px-4 py-3">
                                  <Text className="flex-1 pr-3 text-sm text-slate-200">
                                    {quoteDetails.partName
                                      ? `${quoteDetails.partCondition === 'second_hand' ? 'Second-hand' : 'New'} ${quoteDetails.partName}`
                                      : 'Replacement part'}
                                  </Text>
                                  <Text className="text-sm font-semibold text-white">RWF {quoteDetails.partCost.toLocaleString()}</Text>
                                </View>
                                <View className="flex-row justify-between border-b border-slate-700 px-4 py-3">
                                  <Text className="text-sm text-slate-200">Labor</Text>
                                  <Text className="text-sm font-semibold text-white">RWF {quoteDetails.laborCost.toLocaleString()}</Text>
                                </View>
                              </>
                            ) : (
                              <View className="flex-row justify-between border-b border-slate-700 px-4 py-3">
                                <Text className="text-sm text-slate-200">Repair service</Text>
                                <Text className="text-sm font-semibold text-white">RWF {quoteDetails?.total}</Text>
                              </View>
                            )}
                            <View className="flex-row justify-between bg-emerald-500/10 px-4 py-4">
                              <Text className="text-sm font-bold uppercase tracking-[0.1em] text-emerald-200">Total</Text>
                              <Text className="text-lg font-black text-white">RWF {quoteDetails?.total}</Text>
                            </View>
                          </View>
                          <Text className="mt-4 text-xs font-semibold text-cyan-200">TechUp support: {quoteDetails?.contactPhone}</Text>
                          <Text className="mt-1 text-xs leading-5 text-slate-400">Repair work starts after you approve this quotation.</Text>
                          <Pressable
                            disabled={downloadingQuote}
                            onPress={handleDownloadQuotation}
                            className="mt-4 rounded-xl border border-cyan-400 bg-cyan-500/10 px-4 py-3"
                            style={{ opacity: downloadingQuote ? 0.6 : 1 }}
                          >
                            <Text className="text-center text-xs font-bold uppercase tracking-[0.12em] text-cyan-100">
                              {downloadingQuote ? 'Preparing PDF…' : 'Print / save quotation as PDF'}
                            </Text>
                          </Pressable>
                          <View className="mt-3 flex-row gap-2">
                            <Pressable onPress={() => handleQuoteDecision('approve')} className="flex-1 rounded-xl bg-emerald-500 px-3 py-3">
                              <Text className="text-center text-xs font-bold uppercase tracking-[0.12em] text-emerald-950">Approve quotation</Text>
                            </Pressable>
                            <Pressable onPress={() => handleQuoteDecision('reject')} className="flex-1 rounded-xl border border-rose-500 bg-rose-500/10 px-3 py-3">
                              <Text className="text-center text-xs font-bold uppercase tracking-[0.12em] text-rose-200">Reject quotation</Text>
                            </Pressable>
                          </View>
                        </ScrollView>
                      </View>
                    </View>
                  </Modal>

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

                  {CANCELLABLE_CUSTOMER_STATUSES.has(String(selectedRequest.status ?? '').trim().toLowerCase()) ? (
                    <Pressable
                      onPress={() => handleStopRequest(selectedRequest.id)}
                      className="mt-3 rounded-xl border border-rose-500 bg-rose-500/10 px-3 py-2.5"
                    >
                      <Text className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-rose-200">Stop this request</Text>
                    </Pressable>
                  ) : null}

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
                          {String(repair.status ?? '').toLowerCase() === 'scheduled' ? 'Scheduled' : 'Preferred time'}: {formatScheduleTime(repair.preferredTime)} • ${amount || 0}
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
      <Modal
        visible={cancelConfirmRequestId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!cancellingRequest) setCancelConfirmRequestId(null);
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-5">
          <View className="w-full rounded-2xl border border-slate-700 bg-[#0D1B38] p-5" style={{ maxWidth: 380 }}>
            <Text className="text-lg font-bold text-white">Stop this request?</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-300">
              This will cancel the repair request and notify the company. You can stop a request only before approving its quotation.
            </Text>
            <View className="mt-5 flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                disabled={cancellingRequest}
                onPress={() => setCancelConfirmRequestId(null)}
                className="min-h-11 flex-1 justify-center rounded-xl border border-slate-600 px-3"
                style={{ opacity: cancellingRequest ? 0.6 : 1 }}
              >
                <Text className="text-center text-sm font-semibold text-slate-200">Keep request</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={cancellingRequest}
                onPress={() => void confirmStopRequest()}
                className="min-h-11 flex-1 justify-center rounded-xl bg-rose-600 px-3"
                style={{ opacity: cancellingRequest ? 0.6 : 1 }}
              >
                <Text className="text-center text-sm font-bold text-white">
                  {cancellingRequest ? 'Stopping…' : 'Stop request'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </View>
  );
}
