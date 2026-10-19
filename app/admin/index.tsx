import { Link, Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from '../../src/components/ThemedNative';
import {
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  CircleDollarSign,
  Eye,
  Gauge,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react-native';
import { useAuth } from '../../src/providers/AuthProvider';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLiveRefresh } from '../../src/lib/useLiveRefresh';
import { apiRequest } from '../../src/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWindowDimensions } from 'react-native';
import PerformanceDashboard, { type DashboardLoadDiagnostics } from '../../src/components/admin/PerformanceDashboard';
import AdminRequestDetailsModal, {
  type AdminQuoteDraft,
  type AdminRequest,
  type AdminTechnician,
} from '../../src/components/admin/AdminRequestDetailsModal';

type ReviewQueueItem = {
  id: number;
  customer: string;
  deviceType: string;
  issue: string;
  status: string;
  createdAt: string | null;
  amount: number;
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
  requests?: AdminRequest[];
  reviewQueue?: (AdminRequest | ReviewQueueItem)[];
};

function normalizeAdminRequest(request: AdminRequest | ReviewQueueItem): AdminRequest {
  return {
    ...request,
    customerPhone: 'customerPhone' in request ? request.customerPhone ?? null : null,
    brand: 'brand' in request ? request.brand ?? null : null,
    model: 'model' in request ? request.model ?? null : null,
    serviceAddress: 'serviceAddress' in request ? request.serviceAddress ?? null : null,
    preferredTime: 'preferredTime' in request ? request.preferredTime ?? null : null,
    paymentStatus: 'paymentStatus' in request ? request.paymentStatus ?? 'unknown' : 'unknown',
    technicianId: 'technicianId' in request ? request.technicianId ?? null : null,
    updatedAt: 'updatedAt' in request ? request.updatedAt ?? null : null,
    completedAt: 'completedAt' in request ? request.completedAt ?? null : null,
    quoteAmount: 'quoteAmount' in request ? request.quoteAmount ?? null : null,
  };
}

const DIAGNOSTICS_STORAGE_KEY = 'admin-dashboard-load-diagnostics';
const PERFORMANCE_HISTORY_STORAGE_KEY = 'admin-dashboard-performance-history';
const MAX_PERFORMANCE_SAMPLES = 30;
const IN_PROGRESS_STATUSES = new Set([
  'technician_assigned',
  'assigned',
  'scheduled',
  'customer_approval',
  'repair_in_progress',
  'in_progress',
]);
const COMPLETED_STATUSES = new Set(['completed', 'closed']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDashboardLoadDiagnostics(value: unknown): value is DashboardLoadDiagnostics {
  if (!isRecord(value) || !isRecord(value.serverTiming)) return false;
  const numericFields = [
    'totalMs',
    'fetchMs',
    'bodyMs',
    'parseMs',
    'responseDownloadMs',
    'jsonParsingMs',
    'status',
  ];
  const nullableNumericFields = [
    'dnsLookupMs',
    'connectionMs',
    'tlsHandshakeMs',
    'ttfbMs',
    'backendTotalMs',
    'databaseQueryMs',
    'externalServiceMs',
    'responseBytes',
    'apiUptimeSeconds',
    'uiRenderingMs',
  ];

  return numericFields.every((field) => typeof value[field] === 'number')
    && nullableNumericFields.every((field) => value[field] === null || typeof value[field] === 'number')
    && typeof value.measuredAt === 'string'
    && (value.sampledAt === undefined || typeof value.sampledAt === 'number')
    && (value.databaseQueryBreakdown === undefined
      || (isRecord(value.databaseQueryBreakdown)
        && Object.values(value.databaseQueryBreakdown).every((duration) => typeof duration === 'number')))
    && (value.eventLoopP99Ms === undefined || value.eventLoopP99Ms === null || typeof value.eventLoopP99Ms === 'number')
    && Object.values(value.serverTiming).every((duration) => typeof duration === 'number');
}

function formatMilliseconds(milliseconds: number | null) {
  return milliseconds === null ? 'Not available' : `${Math.round(milliseconds)} ms`;
}

function getDashboardLoadAssessment(metrics: DashboardLoadDiagnostics) {
  const serverMs = metrics.backendTotalMs ?? undefined;
  const databaseMs = metrics.databaseQueryMs ?? 0;
  const outsideServerMs = serverMs === undefined ? null : Math.max(0, metrics.totalMs - serverMs);
  const likelyCauses: string[] = [];

  if (metrics.status === 0) {
    return {
      serverMs,
      databaseMs,
      outsideServerMs,
      likelyCauses: ['No HTTP response was received. A slow or unavailable internet connection, an unreachable API, or a stopped server may be responsible.'],
    };
  }
  if (metrics.status >= 400) {
    return {
      serverMs,
      databaseMs,
      outsideServerMs,
      likelyCauses: [`The API returned HTTP ${metrics.status}; this is a server-side request failure, not a slow successful load. Check the API/server logs for the cause.`],
    };
  }

  if (databaseMs >= 800 && (serverMs === undefined || databaseMs >= serverMs * 0.5)) {
    likelyCauses.push(`Database work took ${Math.round(databaseMs)} ms; slow connection or queries are likely contributing.`);
  }
  if (metrics.apiUptimeSeconds !== null && metrics.apiUptimeSeconds < 45 && (serverMs ?? 0) >= 800) {
    likelyCauses.push('The API process recently started; startup or database warm-up may be contributing.');
  }
  if (metrics.responseBytes !== null && metrics.responseBytes >= 750_000) {
    likelyCauses.push(`The response was large (${(metrics.responseBytes / 1_000_000).toFixed(2)} MB), increasing transfer and parsing time.`);
  }
  if (metrics.parseMs >= 200) {
    likelyCauses.push(`JSON parsing took ${Math.round(metrics.parseMs)} ms; large data or client-side parsing may be contributing.`);
  }
  if (metrics.uiRenderingMs !== null && metrics.uiRenderingMs >= 500) {
    likelyCauses.push(`The dashboard UI render/commit took ${Math.round(metrics.uiRenderingMs)} ms; frontend rendering may be contributing.`);
  }
  if (metrics.eventLoopP99Ms !== null && metrics.eventLoopP99Ms >= 50) {
    likelyCauses.push(`The API event-loop p99 delay was ${Math.round(metrics.eventLoopP99Ms)} ms in the recent monitoring window; server CPU pressure or blocking work may be contributing.`);
  }
  const slowestDatabaseQuery = Object.entries(metrics.databaseQueryBreakdown)
    .sort(([, firstDuration], [, secondDuration]) => secondDuration - firstDuration)[0];
  if (slowestDatabaseQuery && slowestDatabaseQuery[1] >= 500) {
    likelyCauses.push(`The slowest measured database round trip was "${slowestDatabaseQuery[0]}" at ${Math.round(slowestDatabaseQuery[1])} ms, including database connection queue time.`);
  }
  if (metrics.ttfbMs !== null && serverMs !== undefined && metrics.ttfbMs - serverMs >= 800) {
    likelyCauses.push(`Time before the first response byte exceeded measured backend processing by ${Math.round(metrics.ttfbMs - serverMs)} ms; request travel, proxy, or server queueing is likely contributing.`);
  }
  if (metrics.responseDownloadMs >= 800) {
    likelyCauses.push(`Receiving the response body took ${Math.round(metrics.responseDownloadMs)} ms; connection throughput or payload size may be contributing.`);
  }
  if (outsideServerMs !== null && outsideServerMs >= 1_000) {
    likelyCauses.push(`About ${Math.round(outsideServerMs)} ms was outside measured API processing; network latency or server/proxy queueing may be contributing.`);
  }
  if ((serverMs ?? 0) >= 1_500 && databaseMs < (serverMs ?? 0) * 0.5) {
    likelyCauses.push('Server processing was slow beyond measured database work; server load or other backend work may be contributing.');
  }
  if (likelyCauses.length === 0) {
    likelyCauses.push('No clear network, database, payload, API, or UI rendering delay was measured. Timing detail may be limited on this device or connection.');
  }

  return { serverMs, databaseMs, outsideServerMs, likelyCauses };
}

const adminActions = [
  { label: 'Review service requests', icon: ShieldCheck },
  { label: 'Manage technician assignments', icon: Wrench },
  { label: 'Monitor payments and revenue', icon: CircleDollarSign },
  { label: 'Resolve disputes and escalations', icon: AlertTriangle },
];

export default function AdminScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardWaitingTooLong, setDashboardWaitingTooLong] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'review' | 'performance' | 'payments' | 'alerts'>('review');
  const [activeJobTab, setActiveJobTab] = useState<'review' | 'inProgress' | 'completed'>('review');
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadDiagnostics, setLoadDiagnostics] = useState<DashboardLoadDiagnostics | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<DashboardLoadDiagnostics[]>([]);
  const [performanceHistoryLoading, setPerformanceHistoryLoading] = useState(true);
  const performanceHistoryRef = useRef<DashboardLoadDiagnostics[]>([]);
  const diagnosticsUpdatedRef = useRef(false);
  const uiRenderStartedAtRef = useRef<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      AsyncStorage.getItem(DIAGNOSTICS_STORAGE_KEY),
      AsyncStorage.getItem(PERFORMANCE_HISTORY_STORAGE_KEY),
    ])
      .then(([storedDiagnostics, storedHistory]) => {
        if (!isMounted) return;

        let restoredHistory: DashboardLoadDiagnostics[] = [];
        if (storedHistory) {
          const parsedHistory: unknown = JSON.parse(storedHistory);
          if (Array.isArray(parsedHistory)) {
            restoredHistory = parsedHistory
              .filter(isDashboardLoadDiagnostics)
              .map((sample) => ({
                ...sample,
                sampledAt: sample.sampledAt ?? Date.now(),
                databaseQueryBreakdown: sample.databaseQueryBreakdown ?? {},
                eventLoopP99Ms: sample.eventLoopP99Ms ?? null,
              }));
          } else {
            console.error('Stored admin performance history has an unexpected format');
          }
        }

        if (storedDiagnostics && !diagnosticsUpdatedRef.current) {
          const parsedDiagnostics: unknown = JSON.parse(storedDiagnostics);
          if (isDashboardLoadDiagnostics(parsedDiagnostics)) {
            const restoredDiagnostic = {
              ...parsedDiagnostics,
              sampledAt: parsedDiagnostics.sampledAt ?? Date.now(),
              databaseQueryBreakdown: parsedDiagnostics.databaseQueryBreakdown ?? {},
              eventLoopP99Ms: parsedDiagnostics.eventLoopP99Ms ?? null,
            };
            setLoadDiagnostics(restoredDiagnostic);
            if (restoredHistory.length === 0) restoredHistory = [restoredDiagnostic];
          } else {
            console.error('Stored admin dashboard diagnostics have an unexpected format');
          }
        }

        const merged = [...restoredHistory, ...performanceHistoryRef.current]
          .filter((sample, index, samples) =>
            samples.findIndex((candidate) => candidate.sampledAt === sample.sampledAt) === index)
          .sort((first, second) => first.sampledAt - second.sampledAt)
          .slice(-MAX_PERFORMANCE_SAMPLES);
        performanceHistoryRef.current = merged;
        setPerformanceHistory(merged);
        setPerformanceHistoryLoading(false);
      })
      .catch((storageError) => {
        console.error('Unable to restore admin dashboard diagnostics', storageError);
        if (isMounted) setPerformanceHistoryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!dashboard || uiRenderStartedAtRef.current === null) return;
    const renderedAt = typeof globalThis.performance?.now === 'function'
      ? globalThis.performance.now()
      : Date.now();
    const uiRenderingMs = renderedAt - uiRenderStartedAtRef.current;
    uiRenderStartedAtRef.current = null;
    if (!loadDiagnostics) return;
    const updated = { ...loadDiagnostics, uiRenderingMs };
    setLoadDiagnostics(updated);
    setPerformanceHistory((samples) => {
      const updatedSamples = samples.map((sample) =>
        sample.sampledAt === updated.sampledAt ? updated : sample);
      performanceHistoryRef.current = updatedSamples;
      return updatedSamples;
    });
    AsyncStorage.setItem(DIAGNOSTICS_STORAGE_KEY, JSON.stringify(updated))
      .catch((storageError) => console.error('Unable to save admin dashboard diagnostics', storageError));
  }, [dashboard, loadDiagnostics]);

  useEffect(() => {
    if (performanceHistoryLoading) return;
    AsyncStorage.setItem(PERFORMANCE_HISTORY_STORAGE_KEY, JSON.stringify(performanceHistory))
      .catch((storageError) => console.error('Unable to persist admin performance history', storageError));
  }, [performanceHistory, performanceHistoryLoading]);

  async function loadDashboard() {
    let slowLoadTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!dashboard) setLoading(true);
      setDashboardWaitingTooLong(false);
      slowLoadTimer = setTimeout(() => setDashboardWaitingTooLong(true), 2_500);
      const data = await apiRequest<AdminDashboard>(
        `/admin/dashboard?userId=${user?.id}`,
        {},
        (metrics) => {
          diagnosticsUpdatedRef.current = true;
          uiRenderStartedAtRef.current = metrics.status < 400
            ? (typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : Date.now())
            : null;
          const updated: DashboardLoadDiagnostics = {
            ...metrics,
            sampledAt: Math.max(
              Date.now(),
              (performanceHistoryRef.current[performanceHistoryRef.current.length - 1]?.sampledAt ?? 0) + 1,
            ),
            uiRenderingMs: null,
            measuredAt: new Date().toLocaleTimeString(),
          };
          setLoadDiagnostics(updated);
          const updatedHistory = [...performanceHistoryRef.current, updated].slice(-MAX_PERFORMANCE_SAMPLES);
          performanceHistoryRef.current = updatedHistory;
          setPerformanceHistory(updatedHistory);
          AsyncStorage.setItem(DIAGNOSTICS_STORAGE_KEY, JSON.stringify(updated))
            .catch((storageError) => console.error('Unable to save admin dashboard diagnostics', storageError));
        },
      );
      const requests = Array.isArray(data.requests)
        ? data.requests.map(normalizeAdminRequest)
        : Array.isArray(data.reviewQueue)
          ? data.reviewQueue.map(normalizeAdminRequest)
          : [];
      const reviewQueue = Array.isArray(data.reviewQueue)
        ? data.reviewQueue.map(normalizeAdminRequest)
        : requests.filter((request) => ['submitted', 'under_review', 'schedule_rejected'].includes(request.status.toLowerCase()));
      setDashboard({ ...data, requests, reviewQueue });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dashboard error');
    } finally {
      if (slowLoadTimer) clearTimeout(slowLoadTimer);
      setDashboardWaitingTooLong(false);
      setLoading(false);
    }
  }

  useLiveRefresh(loadDashboard, user?.role === 'admin');

  async function handleReviewRequest(requestId: number) {
    try {
      setActionMessage(null);
      await apiRequest(`/repair-requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id }),
      });
      setSelectedRequestId(null);
      setActionMessage(`Request #${requestId} sent to a manager for review.`);
      await loadDashboard();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Unable to update request');
    }
  }

  async function handleSendQuotation(requestId: number, technicianId: number, draft: AdminQuoteDraft) {
    setActionMessage(null);

    try {
      const totalDue = Number(draft.laborCost ?? 0) + Number(draft.partsCost ?? 0);
      await apiRequest(`/repair-requests/${requestId}/quotes`, {
        method: 'POST',
        body: JSON.stringify({
          userId: user?.id,
          technicianId,
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
      setSelectedRequestId(null);
      setActionMessage(`Quotation sent to customer for request #${requestId}.`);
      await loadDashboard();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to send quotation');
    }
  }

  async function handleRejectIncomplete(requestId: number) {
    setActionMessage(null);
    try {
      await apiRequest(`/repair-requests/${requestId}/reject-incomplete`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Customer information is missing or incomplete for this request.' }),
      });
      setSelectedRequestId(null);
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

  const reviewQueuePayload = dashboard?.reviewQueue ?? [];
  const requests = dashboard?.requests ?? reviewQueuePayload.map(normalizeAdminRequest);
  const reviewQueue = reviewQueuePayload.map(normalizeAdminRequest);
  const activeRequests = activeJobTab === 'review'
    ? reviewQueue
    : requests.filter((request) => {
      const status = request.status.toLowerCase();
      return activeJobTab === 'inProgress'
        ? IN_PROGRESS_STATUSES.has(status)
        : COMPLETED_STATUSES.has(status);
    });
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? null;
  const hasPerformanceAlert = dashboardWaitingTooLong
    || Boolean(loadDiagnostics && (
      loadDiagnostics.status === 0
      || loadDiagnostics.status >= 400
      || loadDiagnostics.totalMs >= 2_500
    ));
  const activeAlertCount = Number(hasPerformanceAlert) + Number((dashboard?.pendingDisputes ?? 0) > 0);

  return (
    <View className="flex-1 bg-[#09111F]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="bg-[#0B1B4B] px-5 pb-7 pt-8">
          <View className="mb-5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200">Admin</Text>
              </View>
              {/* <Pressable onPress={handleLogout} className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">Logout</Text>
              </Pressable> */}
            </View>
          </View>

          <Text className="text-3xl font-black text-white">Control center</Text>
          <Text className="mt-2 text-base text-blue-100">
            Review service requests, oversee technicians, and manage the full operation from one live dashboard.
          </Text>
        </View>

        <View className="px-5 pt-5">
          <View className="mb-2 flex-row items-center justify-between px-1">
            <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Admin workspace</Text>
            <Text className="text-[10px] text-slate-500">Choose a section</Text>
          </View>
          <View
            className="flex-row flex-wrap rounded-2xl border border-slate-700/80 bg-[#0D1728] p-1"
            accessibilityRole="tablist"
          >
            {[
              { id: 'review' as const, label: 'Review Queue', icon: Eye },
              { id: 'performance' as const, label: 'App Performance', icon: Gauge },
              { id: 'payments' as const, label: 'Payments', icon: CircleDollarSign },
              { id: 'alerts' as const, label: 'Alerts', icon: AlertTriangle },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeAdminTab === tab.id;
              const showAlertBadge = tab.id === 'alerts' && activeAlertCount > 0;
              return (
                <View key={tab.id} style={{ width: width >= 720 ? '25%' : '50%', padding: 3 }}>
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={tab.id === 'alerts' && activeAlertCount > 0
                      ? `${tab.label}, ${activeAlertCount} active alert categories`
                      : tab.label}
                    onPress={() => setActiveAdminTab(tab.id)}
                    className={`min-h-[54px] flex-row items-center justify-center gap-2 rounded-xl px-2 ${isActive ? 'border border-cyan-400/50 bg-cyan-400/10' : 'border border-transparent bg-transparent'}`}
                  >
                    <Icon size={16} color={isActive ? '#67e8f9' : showAlertBadge ? '#fda4af' : '#94a3b8'} />
                    <Text
                      numberOfLines={1}
                      className={`text-xs font-bold ${isActive ? 'text-cyan-100' : showAlertBadge ? 'text-rose-100' : 'text-slate-300'}`}
                    >
                      {tab.label}
                    </Text>
                    {showAlertBadge ? (
                      <Text className="min-w-5 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-center text-[9px] font-bold text-rose-200">
                        {activeAlertCount}
                      </Text>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        <View className="px-5 pt-6">
          {activeAdminTab === 'review' ? (
            <>
          <Text className="mb-4 text-lg font-bold text-white">Platform overview</Text>
          {loading ? (
            <View className="rounded-[20px] border border-slate-700 bg-[#111827] p-6">
              <ActivityIndicator color="#67e8f9" />
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
                  <View key={stat.label} className="mb-3 w-[47%] rounded-2xl border border-slate-700 bg-[#111827] p-4">
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

            </>
          ) : activeAdminTab === 'performance' ? (
            <View>
              <Text className="mb-4 text-lg font-bold text-white">App performance</Text>
              <PerformanceDashboard
                samples={performanceHistory}
                latest={loadDiagnostics}
                loading={loading}
                historyLoading={performanceHistoryLoading}
                error={error}
                waitingTooLong={dashboardWaitingTooLong}
                width={width}
              />
            </View>
          ) : activeAdminTab === 'payments' ? (
            <View>
              <Text className="mb-4 text-lg font-bold text-white">Payments</Text>
              {loading ? (
                <View className="items-center rounded-2xl border border-slate-700 bg-[#111827] p-6">
                  <ActivityIndicator color="#67e8f9" />
                  <Text className="mt-3 text-sm text-slate-300">Loading payment overview...</Text>
                </View>
              ) : error ? (
                <View className="rounded-2xl border border-rose-800 bg-[#1f1220] p-4">
                  <Text className="text-sm text-rose-300">{error}</Text>
                </View>
              ) : dashboard ? (
                <View className="gap-3">
                  <View className="rounded-2xl border border-amber-500/30 bg-[#111827] p-5">
                    <Text className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recorded revenue</Text>
                    <Text className="mt-2 text-3xl font-black text-amber-300">${dashboard.totalRevenue.toFixed(2)}</Text>
                    <Text className="mt-1 text-xs text-slate-400">Aggregate revenue reported by the admin dashboard.</Text>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1 rounded-2xl border border-slate-700 bg-[#111827] p-4">
                      <Text className="text-2xl font-black text-cyan-200">{dashboard.completedRequests}</Text>
                      <Text className="mt-1 text-xs text-slate-400">Completed requests</Text>
                    </View>
                    <View className="flex-1 rounded-2xl border border-rose-800/70 bg-[#111827] p-4">
                      <Text className="text-2xl font-black text-rose-200">{dashboard.pendingDisputes}</Text>
                      <Text className="mt-1 text-xs text-slate-400">Pending disputes</Text>
                    </View>
                  </View>
                  <Text className="text-xs leading-5 text-slate-500">
                    Payment totals are read-only in this dashboard. Review request payment status from the request details.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View>
              <Text className="mb-4 text-lg font-bold text-white">Alerts</Text>
              {dashboardWaitingTooLong ? (
                <View className="mb-3 rounded-2xl border border-amber-700/70 bg-amber-500/10 p-4">
                  <Text className="text-sm font-bold text-amber-100">Dashboard request is taking longer than expected</Text>
                  <Text className="mt-1 text-xs leading-5 text-slate-300">The request is still running; performance details will be available when it completes.</Text>
                  <Pressable onPress={() => setActiveAdminTab('performance')} className="mt-3 self-start rounded-lg bg-amber-400/15 px-3 py-2">
                    <Text className="text-xs font-bold text-amber-100">View performance</Text>
                  </Pressable>
                </View>
              ) : null}
              {loadDiagnostics && (loadDiagnostics.status === 0 || loadDiagnostics.status >= 400 || loadDiagnostics.totalMs >= 2_500) ? (
                <View className="mb-3 rounded-2xl border border-rose-800/70 bg-rose-500/10 p-4">
                  <Text className="text-sm font-bold text-rose-100">
                    {loadDiagnostics.status === 0 || loadDiagnostics.status >= 400 ? 'Dashboard request failed' : 'Slow dashboard load detected'}
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-slate-300">
                    {loadDiagnostics.status === 0
                      ? 'No HTTP response was received. Check the API connection and server availability.'
                      : loadDiagnostics.status >= 400
                        ? `The API returned HTTP ${loadDiagnostics.status}. Check the server logs for the cause.`
                        : `The latest dashboard load took ${(loadDiagnostics.totalMs / 1_000).toFixed(2)} seconds.`}
                  </Text>
                  <Pressable onPress={() => setActiveAdminTab('performance')} className="mt-3 self-start rounded-lg bg-rose-400/15 px-3 py-2">
                    <Text className="text-xs font-bold text-rose-100">View performance details</Text>
                  </Pressable>
                </View>
              ) : null}
              {dashboard?.pendingDisputes ? (
                <View className="rounded-2xl border border-amber-700/70 bg-[#111827] p-4">
                  <Text className="text-sm font-bold text-amber-100">{dashboard.pendingDisputes} payment dispute{dashboard.pendingDisputes === 1 ? '' : 's'} need attention</Text>
                  <Text className="mt-1 text-xs leading-5 text-slate-300">Review the dispute queue before processing related payments.</Text>
                  <Pressable onPress={() => setActiveAdminTab('payments')} className="mt-3 self-start rounded-lg bg-amber-400/15 px-3 py-2">
                    <Text className="text-xs font-bold text-amber-100">View payments</Text>
                  </Pressable>
                </View>
              ) : null}
              {!dashboardWaitingTooLong
                && !(loadDiagnostics && (loadDiagnostics.status === 0 || loadDiagnostics.status >= 400 || loadDiagnostics.totalMs >= 2_500))
                && !dashboard?.pendingDisputes ? (
                  <View className="rounded-2xl border border-emerald-800/70 bg-emerald-500/10 p-4">
                    <Text className="text-sm font-bold text-emerald-100">No active alerts</Text>
                    <Text className="mt-1 text-xs text-slate-300">Performance and dispute checks are clear.</Text>
                  </View>
                ) : null}
            </View>
          )}
        </View>

        {activeAdminTab === 'review' && dashboard ? (
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
                    <View key={item.label} className="mb-3 w-[47%] rounded-2xl border border-slate-700 bg-[#111827] p-4">
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
              <Text className="mb-4 text-lg font-bold text-white">Repair requests</Text>
              <View className="mb-4 flex-row flex-wrap gap-2">
                {[
                  { id: 'review' as const, label: 'Review queue', count: reviewQueue.length },
                  { id: 'inProgress' as const, label: 'In progress', count: requests.filter((request) => IN_PROGRESS_STATUSES.has(request.status.toLowerCase())).length },
                  { id: 'completed' as const, label: 'Completed', count: requests.filter((request) => COMPLETED_STATUSES.has(request.status.toLowerCase())).length },
                ].map((tab) => {
                  const isActive = activeJobTab === tab.id;
                  return (
                    <Pressable
                      key={tab.id}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isActive }}
                      onPress={() => setActiveJobTab(tab.id)}
                      className={`min-h-11 flex-row items-center justify-center gap-2 rounded-xl border px-3 ${isActive ? 'border-cyan-400 bg-cyan-400/15' : 'border-slate-700 bg-[#111827]'}`}
                    >
                      <Text className={`text-xs font-bold ${isActive ? 'text-cyan-100' : 'text-slate-300'}`}>{tab.label}</Text>
                      <Text className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-cyan-400/20 text-cyan-100' : 'bg-slate-700 text-slate-300'}`}>
                        {tab.count}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {activeRequests.length === 0 ? (
                <View className="rounded-[20px] border border-slate-700 bg-[#111827] p-5">
                  <Text className="text-sm text-slate-300">
                    {activeJobTab === 'review'
                      ? 'No repair requests are currently waiting for review.'
                      : activeJobTab === 'inProgress'
                        ? 'There are no jobs in progress.'
                        : 'There are no completed jobs yet.'}
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {activeRequests.map((request) => (
                    <Pressable
                      key={request.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Open request ${request.id} details`}
                      onPress={() => {
                        setActionMessage(null);
                        setSelectedRequestId(request.id);
                      }}
                      className="flex-row items-center justify-between rounded-2xl border border-slate-700 bg-[#111827] p-4"
                    >
                      <View className="min-w-0 flex-1">
                        <Text className="text-sm font-bold text-white" numberOfLines={1}>
                          Request #{request.id} | {request.deviceType}
                        </Text>
                        <Text className="mt-1 text-xs text-slate-400" numberOfLines={1}>{request.customer}</Text>
                      </View>
                      <View className="ml-3 flex-row items-center gap-2">
                        <Text className="text-[10px] font-semibold capitalize text-slate-300">
                          {request.status.replace(/_/g, ' ')}
                        </Text>
                        <ChevronRight size={17} color="#94a3b8" />
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}

        {activeAdminTab === 'review' ? <View className="mt-6 px-5">
          <Text className="mb-4 text-lg font-bold text-white">Operational focus</Text>
              <View className="rounded-[24px] border border-slate-700 bg-[#111827] p-4">
            {adminActions.map((item) => {
              const Icon = item.icon;
              return (
                <View key={item.label} className="mb-3 flex-row items-center rounded-xl bg-[#0F172A] p-3 last:mb-0">
                  <View className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                    <Icon size={16} color="#c4b5fd" />
                  </View>
                  <Text className="flex-1 text-sm leading-6 text-slate-300">{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View> : null}
      </ScrollView>
      <AdminRequestDetailsModal
        request={selectedRequest}
        technicians={dashboard?.technicians ?? []}
        actionMessage={actionMessage}
        onClose={() => setSelectedRequestId(null)}
        onReview={handleReviewRequest}
        onReject={handleRejectIncomplete}
        onSendQuotation={handleSendQuotation}
      />
    </View>
  );
}
