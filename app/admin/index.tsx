import { Link, Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  FileText,
  Gauge,
  ShieldCheck,
  UserRoundCog,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react-native';
import { useAuth } from '../../src/providers/AuthProvider';
import { useEffect, useState } from 'react';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://127.0.0.1:4000');

type ReviewQueueItem = {
  id: number;
  customer: string;
  deviceType: string;
  issue: string;
  status: string;
  createdAt: string | null;
  amount: number;
};

type AdminTechnician = {
  id: number;
  fullName: string;
  email: string;
};

type AdminDashboard = {
  userCount: number;
  customerCount: number;
  technicianCount: number;
  managerCount: number;
  adminCount: number;
  repairCount: number;
  productCount: number;
  openRequests: number;
  completedRequests: number;
  totalRevenue: number;
  pendingDisputes: number;
  technicians: AdminTechnician[];
  reviewQueue: ReviewQueueItem[];
};

const adminActions = [
  { label: 'Review service requests', icon: ShieldCheck },
  { label: 'Manage technician assignments', icon: Wrench },
  { label: 'Monitor payments and revenue', icon: CircleDollarSign },
  { label: 'Resolve disputes and escalations', icon: AlertTriangle },
];

export default function AdminScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [quoteEditorId, setQuoteEditorId] = useState<number | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<Record<number, number>>({});
  const [preferredTime, setPreferredTime] = useState<Record<number, string>>({});
  const [quoteDrafts, setQuoteDrafts] = useState<Record<number, {
    summary: string;
    diagnosis: string;
    quantity: string;
    laborCost: string;
    partsCost: string;
    notes: string;
  }>>({});

  async function loadDashboard() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/dashboard`);
      if (!response.ok) {
        throw new Error('Unable to load dashboard');
      }

      const data = (await response.json()) as AdminDashboard;
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dashboard error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDashboard();
    }
  }, [user?.role]);

  async function handleReviewRequest(requestId: number, nextStatus: 'under_review' | 'approved') {
    try {
      setActionMessage(null);
      const response = await fetch(`${API_BASE_URL}/admin/repair-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? 'Unable to update request');
      }

      setActionMessage(`Request #${requestId} marked as ${nextStatus.replace('_', ' ')}.`);
      await loadDashboard();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Unable to update request');
    }
  }

  async function handleAssignTechnician(requestId: number) {
    setActionMessage(null);
    const technicianId = selectedTechnicianId[requestId] ?? dashboard?.technicians?.[0]?.id;
    if (!technicianId) {
      setActionMessage('No technician is available to assign to this request.');
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
      setActionMessage(`Technician has been assigned to request #${requestId}.`);
      await loadDashboard();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to assign technician');
    }
  }

  async function handleScheduleRequest(requestId: number) {
    setActionMessage(null);
    const technicianId = selectedTechnicianId[requestId] ?? dashboard?.technicians?.[0]?.id;
    const scheduleTime = preferredTime[requestId] ?? 'Tomorrow, 10:00 AM';

    try {
      const response = await fetch(`${API_BASE_URL}/repair-requests/${requestId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredTime: scheduleTime, technicianId, note: 'Schedule confirmed by admin.' }),
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.error ?? `Unable to schedule request (${response.status})`);
      }

      setActionMessage(`Schedule confirmed for request #${requestId}.`);
      await loadDashboard();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to schedule request');
    }
  }

  function openQuoteTemplate(requestId: number, request: ReviewQueueItem) {
    const currentStatus = request.status?.toLowerCase() ?? '';
    if (!['scheduled', 'customer_approval'].includes(currentStatus)) {
      setActionMessage('This request must be reviewed, assigned, and scheduled before a quotation can be sent.');
      return;
    }

    const draft = quoteDrafts[requestId] ?? {
      summary: `${request.deviceType} service check and repair for ${request.issue.split(' ').slice(0, 8).join(' ')}`,
      diagnosis: 'Device diagnosis: screen and battery fault found during inspection.',
      quantity: '1',
      laborCost: '120',
      partsCost: '80',
      notes: 'Customer approval required before work begins. Warranty applies to replacement parts only.',
    };

    setQuoteDrafts((previous) => ({ ...previous, [requestId]: draft }));
    setQuoteEditorId(requestId);
  }

  async function handleSendQuotation(requestId: number) {
    setActionMessage(null);
    const draft = quoteDrafts[requestId] ?? {
      summary: 'General repair service',
      diagnosis: 'General diagnosis',
      quantity: '1',
      laborCost: '0',
      partsCost: '0',
      notes: 'Customer approval required before work begins.',
    };

    try {
      const totalDue = Number(draft.laborCost ?? 0) + Number(draft.partsCost ?? 0);
      const response = await fetch(`${API_BASE_URL}/repair-requests/${requestId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianId: 3,
          laborCost: Number(draft.laborCost ?? 0),
          sparePartsCost: Number(draft.partsCost ?? 0),
          quantity: Number(draft.quantity ?? 1),
          diagnosis: draft.diagnosis || 'General diagnosis',
          currency: 'RWF',
          totalDue,
          notes: [
            draft.summary,
            `Diagnosis: ${draft.diagnosis || 'General diagnosis'}`,
            `Quantity: ${draft.quantity || '1'}`,
            `Total due: ${totalDue.toLocaleString()} RWF`,
            draft.notes || 'Customer approval required before work begins.',
          ].join(' | '),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to send quotation');
      setQuoteEditorId(null);
      setActionMessage(`Quotation sent to customer for request #${requestId}.`);
      await loadDashboard();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to send quotation');
    }
  }

  async function handleRejectIncomplete(requestId: number) {
    setActionMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/repair-requests/${requestId}/reject-incomplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer information is missing or incomplete for this request.' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to reject request');
      setActionMessage(`Request #${requestId} was rejected because the customer data is incomplete.`);
      await loadDashboard();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to reject request');
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'admin') {
    return <Redirect href={`/${user.role}` as any} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-[#120F1D]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="bg-[#1E1B2F] px-5 pb-7 pt-8">
          <View className="mb-5 flex-row items-center justify-between">
            <Link href="/" asChild>
              <Pressable>
                <Text className="text-base font-semibold text-violet-300">← Home</Text>
              </Pressable>
            </Link>
            <View className="flex-row items-center gap-2">
              <View className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-200">Admin</Text>
              </View>
              <Pressable onPress={handleLogout} className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">Logout</Text>
              </Pressable>
            </View>
          </View>

          <Text className="text-3xl font-black text-white">Control center</Text>
          <Text className="mt-2 text-base text-violet-100">
            Review service requests, oversee technicians, and manage the full operation from one live dashboard.
          </Text>
        </View>

        <View className="px-5 pt-6">
          <Text className="mb-4 text-lg font-bold text-white">Platform overview</Text>
          {loading ? (
            <View className="rounded-[20px] border border-violet-900 bg-[#17121E] p-6">
              <ActivityIndicator color="#c4b5fd" />
              <Text className="mt-3 text-center text-sm text-slate-300">Loading admin data...</Text>
            </View>
          ) : error ? (
            <View className="rounded-[20px] border border-rose-800 bg-[#1f1220] p-4">
              <Text className="text-sm text-rose-300">{error}</Text>
            </View>
          ) : dashboard ? (
            <View className="flex-row flex-wrap justify-between">
              {[
                { label: 'Total users', value: dashboard.userCount, tint: 'text-violet-300', bg: 'bg-violet-500/10', icon: Users },
                { label: 'Repair requests', value: dashboard.repairCount, tint: 'text-cyan-300', bg: 'bg-cyan-500/10', icon: Wrench },
                { label: 'Open requests', value: dashboard.openRequests, tint: 'text-emerald-300', bg: 'bg-emerald-500/10', icon: Gauge },
                { label: 'Revenue', value: `$${dashboard.totalRevenue.toFixed(2)}`, tint: 'text-amber-300', bg: 'bg-amber-500/10', icon: CircleDollarSign },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <View key={stat.label} className="mb-3 w-[47%] rounded-2xl border border-violet-900 bg-[#17121E] p-4">
                    <View className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                      <Icon size={18} color={stat.tint.includes('violet') ? '#c4b5fd' : stat.tint.includes('cyan') ? '#67e8f9' : stat.tint.includes('emerald') ? '#6ee7b7' : '#fcd34d'} />
                    </View>
                    <Text className={`text-2xl font-black ${stat.tint}`}>{stat.value}</Text>
                    <Text className="mt-1 text-xs text-slate-400">{stat.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        {dashboard ? (
          <>
            <View className="mt-6 px-5">
              <Text className="mb-4 text-lg font-bold text-white">Workforce overview</Text>
              <View className="flex-row flex-wrap justify-between">
                {[
                  { label: 'Customers', value: dashboard.customerCount, tint: 'text-sky-300', bg: 'bg-sky-500/10', icon: Users },
                  { label: 'Technicians', value: dashboard.technicianCount, tint: 'text-emerald-300', bg: 'bg-emerald-500/10', icon: Wrench },
                  { label: 'Managers', value: dashboard.managerCount, tint: 'text-amber-300', bg: 'bg-amber-500/10', icon: BadgeCheck },
                  { label: 'Admins', value: dashboard.adminCount, tint: 'text-violet-300', bg: 'bg-violet-500/10', icon: ShieldCheck },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <View key={item.label} className="mb-3 w-[47%] rounded-2xl border border-violet-900 bg-[#17121E] p-4">
                      <View className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${item.bg}`}>
                        <Icon size={16} color={item.tint.includes('sky') ? '#7dd3fc' : item.tint.includes('emerald') ? '#6ee7b7' : item.tint.includes('amber') ? '#fcd34d' : '#c4b5fd'} />
                      </View>
                      <Text className={`text-2xl font-black ${item.tint}`}>{item.value}</Text>
                      <Text className="mt-1 text-xs text-slate-400">{item.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {actionMessage ? (
              <View className="mx-5 mt-6 rounded-[18px] border border-emerald-800 bg-emerald-500/10 p-3">
                <Text className="text-sm text-emerald-200">{actionMessage}</Text>
              </View>
            ) : null}

            <View className="mt-6 px-5">
              <Text className="mb-4 text-lg font-bold text-white">Review queue</Text>
              <View className="space-y-3">
                {dashboard.reviewQueue.length === 0 ? (
                  <View className="rounded-[20px] border border-violet-900 bg-[#17121E] p-5">
                    <Text className="text-slate-300">No repair requests are currently waiting for review.</Text>
                  </View>
                ) : (
                  dashboard.reviewQueue.map((request) => (
                    <View key={request.id} className="rounded-[22px] border border-violet-900 bg-[#17121E] p-4">
                      <View className="mb-3 flex-row items-center justify-between">
                        <View>
                          <Text className="text-base font-bold text-white">#{request.id} · {request.deviceType}</Text>
                          <Text className="mt-1 text-xs text-slate-400">{request.customer}</Text>
                        </View>
                        <View className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1">
                          <Text className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-300">{request.status}</Text>
                        </View>
                      </View>

                      <View className="mb-3 rounded-xl bg-[#201b2d] p-3">
                        <Text className="text-sm leading-6 text-slate-300">{request.issue}</Text>
                      </View>

                      <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-xs text-slate-400">{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'No date'}</Text>
                        <Text className="text-sm font-bold text-cyan-300">${request.amount.toFixed(2)}</Text>
                      </View>

                      <View className="gap-2">
                        <View className="flex-row gap-2">
                          <Pressable
                            onPress={() => handleReviewRequest(request.id, 'under_review')}
                            className="flex-1 flex-row items-center justify-center gap-1 rounded-xl border border-cyan-500 bg-cyan-500/10 px-2 py-2.5"
                          >
                            <Eye size={12} color="#7dd3fc" />
                            <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">Review</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleReviewRequest(request.id, 'approved')}
                            className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-violet-500 px-2 py-2.5"
                          >
                            <CheckCircle2 size={12} color="#fff" />
                            <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white">Approve</Text>
                          </Pressable>
                        </View>

                        <View className="rounded-2xl border border-slate-700 bg-[#201b2d] p-3">
                          <Text className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">Select technician</Text>
                          <View className="flex-row flex-wrap gap-2">
                            {(dashboard?.technicians ?? []).map((tech) => {
                              const isSelected = (selectedTechnicianId[request.id] ?? dashboard?.technicians?.[0]?.id ?? 0) === tech.id;
                              return (
                                <Pressable
                                  key={tech.id}
                                  onPress={() => setSelectedTechnicianId((previous) => ({ ...previous, [request.id]: tech.id }))}
                                  className={`rounded-full border px-2 py-1 ${isSelected ? 'border-emerald-400 bg-emerald-500/15' : 'border-slate-600 bg-[#0f172a]'}`}
                                >
                                  <Text className={`text-[10px] font-bold ${isSelected ? 'text-emerald-200' : 'text-slate-300'}`}>{tech.fullName}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <View className="mt-3 flex-row gap-2">
                            <Pressable
                              onPress={() => handleAssignTechnician(request.id)}
                              className="flex-1 flex-row items-center justify-center gap-1 rounded-xl border border-emerald-500 bg-emerald-500/10 px-2 py-2.5"
                            >
                              <UserRoundCog size={12} color="#6ee7b7" />
                              <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200">Assign</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleScheduleRequest(request.id)}
                              className="flex-1 flex-row items-center justify-center gap-1 rounded-xl border border-amber-500 bg-amber-500/10 px-2 py-2.5"
                            >
                              <CalendarClock size={12} color="#fcd34d" />
                              <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">Schedule</Text>
                            </Pressable>
                          </View>
                          <TextInput
                            value={preferredTime[request.id] ?? 'Tomorrow, 10:00 AM'}
                            onChangeText={(value) => setPreferredTime((previous) => ({ ...previous, [request.id]: value }))}
                            placeholder="Preferred time"
                            placeholderTextColor="#94a3b8"
                            className="mt-3 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-slate-100"
                          />
                        </View>

                        <View className="flex-row gap-2">
                          <Pressable
                            onPress={() => openQuoteTemplate(request.id, request)}
                            className="flex-1 flex-row items-center justify-center gap-1 rounded-xl border border-sky-500 bg-sky-500/10 px-2 py-2.5"
                          >
                            <FileText size={12} color="#7dd3fc" />
                            <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-sky-200">Quote</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleRejectIncomplete(request.id)}
                            className="flex-1 flex-row items-center justify-center gap-1 rounded-xl border border-rose-500 bg-rose-500/10 px-2 py-2.5"
                          >
                            <XCircle size={12} color="#fca5a5" />
                            <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-rose-200">Reject</Text>
                          </Pressable>
                        </View>

                        {quoteEditorId === request.id ? (
                          <View className="rounded-2xl border border-sky-500 bg-sky-500/5 p-3">
                            <Text className="text-[9px] font-bold uppercase tracking-[0.18em] text-sky-200">Quotation template</Text>

                            <TextInput
                              value={quoteDrafts[request.id]?.summary ?? ''}
                              onChangeText={(value) =>
                                setQuoteDrafts((previous) => ({
                                  ...previous,
                                  [request.id]: { ...(previous[request.id] ?? { diagnosis: 'Device diagnosis: screen and battery fault found during inspection.', quantity: '1', laborCost: '120', partsCost: '80', notes: 'Customer approval required before work begins.' }), summary: value },
                                }))
                              }
                              placeholder="Service summary"
                              placeholderTextColor="#94a3b8"
                              className="mt-2 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-slate-100"
                            />

                            <TextInput
                              value={quoteDrafts[request.id]?.diagnosis ?? 'Device diagnosis: screen and battery fault found during inspection.'}
                              onChangeText={(value) =>
                                setQuoteDrafts((previous) => ({
                                  ...previous,
                                  [request.id]: { ...(previous[request.id] ?? { summary: 'Repair service', quantity: '1', laborCost: '120', partsCost: '80', notes: 'Customer approval required before work begins.' }), diagnosis: value },
                                }))
                              }
                              placeholder="Diagnosis"
                              placeholderTextColor="#94a3b8"
                              className="mt-2 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-slate-100"
                            />

                            <View className="mt-2 flex-row gap-2">
                              <TextInput
                                value={quoteDrafts[request.id]?.quantity ?? '1'}
                                onChangeText={(value) =>
                                  setQuoteDrafts((previous) => ({
                                    ...previous,
                                    [request.id]: { ...(previous[request.id] ?? { summary: 'Repair service', diagnosis: 'Device diagnosis: screen and battery fault found during inspection.', laborCost: '120', partsCost: '80', notes: 'Customer approval required before work begins.' }), quantity: value },
                                  }))
                                }
                                keyboardType="numeric"
                                placeholder="Qty"
                                placeholderTextColor="#94a3b8"
                                className="w-[20%] rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-slate-100"
                              />
                              <TextInput
                                value={quoteDrafts[request.id]?.laborCost ?? '120'}
                                onChangeText={(value) =>
                                  setQuoteDrafts((previous) => ({
                                    ...previous,
                                    [request.id]: { ...(previous[request.id] ?? { summary: 'Repair service', diagnosis: 'Device diagnosis: screen and battery fault found during inspection.', quantity: '1', partsCost: '80', notes: 'Customer approval required before work begins.' }), laborCost: value },
                                  }))
                                }
                                keyboardType="numeric"
                                placeholder="Labor RWF"
                                placeholderTextColor="#94a3b8"
                                className="flex-1 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-slate-100"
                              />
                              <TextInput
                                value={quoteDrafts[request.id]?.partsCost ?? '80'}
                                onChangeText={(value) =>
                                  setQuoteDrafts((previous) => ({
                                    ...previous,
                                    [request.id]: { ...(previous[request.id] ?? { summary: 'Repair service', diagnosis: 'Device diagnosis: screen and battery fault found during inspection.', quantity: '1', laborCost: '120', notes: 'Customer approval required before work begins.' }), partsCost: value },
                                  }))
                                }
                                keyboardType="numeric"
                                placeholder="Parts RWF"
                                placeholderTextColor="#94a3b8"
                                className="flex-1 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-slate-100"
                              />
                            </View>

                            <View className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                              <Text className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200">Total due</Text>
                              <Text className="mt-1 text-base font-bold text-white">
                                {((Number(quoteDrafts[request.id]?.laborCost ?? 0) + Number(quoteDrafts[request.id]?.partsCost ?? 0))).toLocaleString()} RWF
                              </Text>
                            </View>

                            <TextInput
                              value={quoteDrafts[request.id]?.notes ?? 'Customer approval required before work begins.'}
                              onChangeText={(value) =>
                                setQuoteDrafts((previous) => ({
                                  ...previous,
                                  [request.id]: { ...(previous[request.id] ?? { summary: 'Repair service', diagnosis: 'Device diagnosis: screen and battery fault found during inspection.', quantity: '1', laborCost: '120', partsCost: '80' }), notes: value },
                                }))
                              }
                              multiline
                              placeholder="Short quote note"
                              placeholderTextColor="#94a3b8"
                              className="mt-2 min-h-[70px] rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-slate-100"
                            />

                            <View className="mt-3 flex-row gap-2">
                              <Pressable
                                onPress={() => handleSendQuotation(request.id)}
                                className="flex-1 rounded-xl bg-sky-500 px-3 py-2.5"
                              >
                                <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white">Send quote</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => setQuoteEditorId(null)}
                                className="flex-1 rounded-xl border border-slate-600 bg-[#0f172a] px-3 py-2.5"
                              >
                                <Text className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-slate-200">Close</Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </>
        ) : null}

        <View className="mt-6 px-5">
          <Text className="mb-4 text-lg font-bold text-white">Operational focus</Text>
          <View className="rounded-[24px] border border-violet-900 bg-[#17121E] p-4">
            {adminActions.map((item) => {
              const Icon = item.icon;
              return (
                <View key={item.label} className="mb-3 flex-row items-center rounded-xl bg-[#201b2d] p-3 last:mb-0">
                  <View className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                    <Icon size={16} color="#c4b5fd" />
                  </View>
                  <Text className="flex-1 text-sm leading-6 text-slate-300">{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
