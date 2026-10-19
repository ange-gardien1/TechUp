import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from '../ThemedNative';
import { Activity, Database, Download, Gauge, Globe2, Network, Server, Shield, Timer, type LucideIcon } from 'lucide-react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import type { ApiRequestPerformance } from '../../lib/api';

export type DashboardLoadDiagnostics = Omit<ApiRequestPerformance, 'ttfbSource'> & {
  measuredAt: string;
  sampledAt: number;
  uiRenderingMs: number | null;
  ttfbSource?: ApiRequestPerformance['ttfbSource'];
};

const PERFORMANCE_TARGET_MS = 1_000;
const SLOW_LOAD_MS = 2_500;
const CARD_BACKGROUND = '#111B2B';
const PLOT_WIDTH = 600;
const PLOT_HEIGHT = 176;
const PLOT_PADDING = 20;

function formatMilliseconds(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Not available';
  return value >= 1_000 ? `${(value / 1_000).toFixed(2)} s` : `${Math.round(value).toLocaleString()} ms`;
}

function formatDuration(value: number) {
  return value >= 1_000 ? `${(value / 1_000).toFixed(2)} s` : `${Math.round(value).toLocaleString()} ms`;
}

function formatBytes(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Not available';
  if (value < 1_000) return `${Math.round(value).toLocaleString()} B`;
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)} KB`;
  return `${(value / 1_000_000).toFixed(2)} MB`;
}

function formatSampleTime(sample: DashboardLoadDiagnostics) {
  const date = new Date(sample.sampledAt);
  return Number.isNaN(date.getTime()) ? sample.measuredAt : date.toLocaleString();
}

function getLoadState(sample: DashboardLoadDiagnostics) {
  if (sample.status === 0 || sample.status >= 400) {
    return { label: 'Request failed', color: '#fb7185' };
  }
  if (sample.totalMs >= SLOW_LOAD_MS) return { label: 'Slow', color: '#fb7185' };
  if (sample.totalMs >= PERFORMANCE_TARGET_MS) return { label: 'Needs improvement', color: '#fbbf24' };
  return { label: 'Good', color: '#34d399' };
}

function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <View className="mb-4 border-b border-slate-700/70 pb-3">
      <Text className="text-[15px] font-bold text-white">{title}</Text>
      {detail ? <Text className="mt-1 text-[11px] leading-5 text-slate-400">{detail}</Text> : null}
    </View>
  );
}

function MetricCard({
  label,
  value,
  description,
  color = '#67e8f9',
  badge,
  comparison,
  width,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  color?: string;
  badge?: string;
  comparison?: string | null;
  width: `${number}%`;
  icon: LucideIcon;
}) {
  const hasBadge = badge !== undefined;
  return (
    <View
      className="mb-3 rounded-2xl border border-slate-700/70 p-4"
      style={{ width, backgroundColor: CARD_BACKGROUND }}
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <View className="h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}18` }}>
            <Icon size={14} color={color} />
          </View>
          <Text className="flex-1 text-xs font-semibold text-slate-300">{label}</Text>
        </View>
        {hasBadge ? (
          <Text className="rounded-full px-2 py-1 text-[9px] font-bold" style={{ color, backgroundColor: `${color}20` }}>
            {badge}
          </Text>
        ) : null}
      </View>
      <Text className="mt-4 text-[26px] font-black tracking-tight" style={{ color }}>{value}</Text>
      <Text className="mt-1 text-[11px] leading-4 text-slate-400">{description}</Text>
      {comparison ? <Text className="mt-2 text-[10px] font-semibold text-slate-300">{comparison}</Text> : null}
    </View>
  );
}

function compareSamples(latest: DashboardLoadDiagnostics, previous?: DashboardLoadDiagnostics) {
  if (
    latest.status < 200
    || latest.status >= 400
    || !previous
    || previous.status < 200
    || previous.status >= 400
    || !Number.isFinite(previous.totalMs)
    || previous.totalMs <= 0
  ) return null;
  const change = ((latest.totalMs - previous.totalMs) / previous.totalMs) * 100;
  return `${Math.abs(change).toFixed(0)}% ${change > 0 ? 'slower' : change < 0 ? 'faster' : 'unchanged'} vs previous`;
}

function PerformanceTrend({ samples }: { samples: DashboardLoadDiagnostics[] }) {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, samples.length - 1));
  useEffect(() => {
    setSelectedIndex(Math.max(0, samples.length - 1));
  }, [samples.length, samples[samples.length - 1]?.sampledAt]);
  const maxValue = Math.max(PERFORMANCE_TARGET_MS * 1.5, ...samples.map((sample) => sample.totalMs));
  const plotHeight = PLOT_HEIGHT - PLOT_PADDING * 2;
  const plotWidth = PLOT_WIDTH - PLOT_PADDING * 2;
  const pointFor = (value: number, index: number) => ({
    x: PLOT_PADDING + (samples.length <= 1 ? plotWidth / 2 : (index / (samples.length - 1)) * plotWidth),
    y: PLOT_HEIGHT - PLOT_PADDING - (Math.min(value, maxValue) / maxValue) * plotHeight,
  });
  const points = samples.map((sample, index) => pointFor(sample.totalMs, index));
  const selected = samples[selectedIndex];
  const targetVisible = PERFORMANCE_TARGET_MS <= maxValue;
  const targetY = pointFor(PERFORMANCE_TARGET_MS, 0).y;
  const yLabels = [maxValue, maxValue / 2, 0];

  return (
    <View className="rounded-2xl border border-slate-700/70 p-4" style={{ backgroundColor: CARD_BACKGROUND }}>
      <View className="mb-3 flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="text-sm font-bold text-white">Dashboard load-time trend</Text>
          <Text className="mt-1 text-[11px] text-slate-400">Latest {samples.length} saved samples · target {formatDuration(PERFORMANCE_TARGET_MS)}</Text>
        </View>
        <Text className="rounded-full border border-slate-700 px-2 py-1 text-[9px] font-semibold text-slate-300">END-TO-END</Text>
      </View>
      {samples.length > 0 ? (
        <>
          <View className="flex-row">
            <View className="h-40 justify-between py-1 pr-2">
              {yLabels.map((label, index) => (
                <Text key={index} className="text-[9px] text-slate-500">{(label / 1_000).toFixed(1)} s</Text>
              ))}
            </View>
            <View className="min-w-0 flex-1">
              <Svg
                width="100%"
                height={PLOT_HEIGHT}
                viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
                preserveAspectRatio="none"
                accessible
                accessibilityLabel={`Line chart of ${samples.length} saved dashboard load samples, in seconds`}
              >
                {yLabels.map((_, index) => {
                  const y = PLOT_PADDING + (index / 2) * plotHeight;
                  return <Line key={index} x1={PLOT_PADDING} y1={y} x2={PLOT_WIDTH - PLOT_PADDING} y2={y} stroke="#334155" strokeWidth={1} />;
                })}
                {targetVisible ? (
                  <Line
                    x1={PLOT_PADDING}
                    y1={targetY}
                    x2={PLOT_WIDTH - PLOT_PADDING}
                    y2={targetY}
                    stroke="#fbbf24"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                  />
                ) : null}
                {points.length > 1 ? (
                  <Polyline
                    points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null}
                {points.map(({ x, y }, index) => {
                  const sample = samples[index];
                  const slow = sample.status === 0 || sample.status >= 400 || sample.totalMs >= SLOW_LOAD_MS;
                  return (
                    <Circle
                      key={sample.sampledAt}
                      cx={x}
                      cy={y}
                      r={selectedIndex === index ? 6 : 4}
                      fill={slow ? '#fb7185' : sample.totalMs >= PERFORMANCE_TARGET_MS ? '#fbbf24' : '#22d3ee'}
                      stroke="#0b1424"
                      strokeWidth={2}
                      accessibilityLabel={`${formatSampleTime(sample)}: ${formatDuration(sample.totalMs)}`}
                    />
                  );
                })}
              </Svg>
              <View className="mt-1 flex-row justify-between">
                <Text className="text-[9px] text-slate-500">
                  {samples[0] ? new Date(samples[0].sampledAt).toLocaleTimeString() : ''}
                </Text>
                <Text className="text-[9px] text-slate-500">
                  {samples.length > 1 ? new Date(samples[samples.length - 1].sampledAt).toLocaleTimeString() : ''}
                </Text>
              </View>
            </View>
          </View>
          {selected ? (
            <View className="mt-3 flex-row flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700/70 bg-[#0B1424] px-3 py-2.5" accessibilityLiveRegion="polite">
              <View>
                <Text className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Selected sample · {selectedIndex + 1} of {samples.length}</Text>
                <Text className="mt-1 text-[11px] text-slate-300">{formatSampleTime(selected)}</Text>
              </View>
              <Text className="text-base font-bold text-cyan-200">{formatDuration(selected.totalMs)}</Text>
            </View>
          ) : null}
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {samples.map((sample, index) => {
              const slow = sample.status === 0 || sample.status >= 400 || sample.totalMs >= SLOW_LOAD_MS;
              const color = slow ? '#fb7185' : sample.totalMs >= PERFORMANCE_TARGET_MS ? '#fbbf24' : '#22d3ee';
              return (
                <Pressable
                  key={sample.sampledAt}
                  accessibilityRole="button"
                  accessibilityLabel={`Select sample ${index + 1}: ${formatSampleTime(sample)}, ${formatDuration(sample.totalMs)}`}
                  accessibilityState={{ selected: selectedIndex === index }}
                  onPress={() => setSelectedIndex(index)}
                  className="h-7 w-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: selectedIndex === index ? `${color}25` : 'transparent' }}
                >
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <View className="items-center rounded-xl border border-slate-700/70 bg-[#0B1424] px-4 py-7">
          <Gauge size={20} color="#67e8f9" />
          <Text className="mt-3 text-sm font-semibold text-white">No saved load samples</Text>
          <Text className="mt-1 max-w-[280px] text-center text-[11px] leading-5 text-slate-400">
            The trend will appear after a dashboard request is measured. No historical samples are generated.
          </Text>
        </View>
      )}
      {samples.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-2">
          {[
            ['#22d3ee', 'Measured load'],
            ['#fbbf24', '1 s target'],
            ['#fb7185', 'Slow / failed sample'],
          ].map(([color, label]) => (
            <View key={label} className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <Text className="text-[10px] text-slate-400">{label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function TimeBreakdown({ sample }: { sample: DashboardLoadDiagnostics }) {
  const canEstimateOutsideRoute = sample.ttfbSource === 'resource'
    && sample.ttfbMs !== null
    && sample.ttfbMs > 0
    && sample.backendTotalMs !== null
    && sample.status >= 200
    && sample.status < 400
    && sample.ttfbMs >= sample.backendTotalMs;
  const outsideRouteMs = canEstimateOutsideRoute
    ? sample.ttfbMs! - sample.backendTotalMs!
    : null;
  const total = canEstimateOutsideRoute ? sample.ttfbMs! : 0;
  const backendWidth = total > 0 ? `${(sample.backendTotalMs! / total) * 100}%` as `${number}%` : '0%';
  const outsideWidth = total > 0 ? `${(outsideRouteMs! / total) * 100}%` as `${number}%` : '0%';

  return (
    <View className="rounded-2xl border border-slate-700/80 p-4" style={{ backgroundColor: CARD_BACKGROUND }}>
      <SectionHeading
        title="Where the time goes"
        detail="Compares browser Resource Timing TTFB with backend route duration for this sample."
      />
      {canEstimateOutsideRoute ? (
        <>
          <View
            className="h-3 flex-row overflow-hidden rounded-full bg-slate-800"
            accessibilityLabel={`Measured backend route ${formatMilliseconds(sample.backendTotalMs)}; estimated time outside measured route duration ${formatMilliseconds(outsideRouteMs)}`}
          >
            <View style={{ width: backendWidth, backgroundColor: '#22d3ee' }} />
            <View style={{ width: outsideWidth, backgroundColor: '#fbbf24' }} />
          </View>
          <View className="mt-4 gap-3">
            <BreakdownLegend color="#22d3ee" label="Measured backend route duration" value={sample.backendTotalMs} />
            <BreakdownLegend color="#fbbf24" label="Time outside measured route duration — estimated" value={outsideRouteMs} />
          </View>
          <View className="mt-4 rounded-xl border border-amber-700/50 bg-amber-500/10 p-3">
            <Text className="text-[11px] leading-5 text-amber-100">
              The difference may include middleware, authentication, database initialization, server/proxy queuing, network travel, and timing-boundary differences. It is not measured pure network latency.
            </Text>
          </View>
        </>
      ) : (
        <View className="rounded-xl border border-slate-700 bg-[#0B1424] p-3">
          <Text className="text-sm font-semibold text-slate-200">Insufficient timing data</Text>
          <Text className="mt-1 text-[11px] leading-5 text-slate-400">
            A browser resource-timing TTFB and a successful backend route duration from the same sample are required. Fetch-to-headers timing is not substituted.
          </Text>
        </View>
      )}
    </View>
  );
}

function BreakdownLegend({ color, label, value }: { color: string; label: string; value: number | null }) {
  return (
    <View className="flex-row items-start gap-2">
      <View className="mt-1 h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      <Text className="flex-1 text-xs leading-5 text-slate-300">{label}</Text>
      <Text className="text-xs font-bold text-white">{formatMilliseconds(value)}</Text>
    </View>
  );
}

const databaseOperationLabels: Record<string, string> = {
  technician_list: 'Technician list',
  product_count: 'Product count',
  payment_total: 'Payment total',
  user_role_counts: 'User role counts',
  pending_dispute_count: 'Pending dispute count',
  recent_repair_queue: 'Recent repair queue',
  user_count: 'User count',
};

function DatabaseOperations({ sample }: { sample: DashboardLoadDiagnostics }) {
  const operations = useMemo(
    () => Object.entries(sample.databaseQueryBreakdown)
      .filter(([, duration]) => Number.isFinite(duration) && duration >= 0)
      .sort(([, first], [, second]) => second - first),
    [sample.databaseQueryBreakdown],
  );
  const maxDuration = Math.max(1, ...operations.map(([, duration]) => duration));
  const inconsistent = hasInconsistentDatabaseTimings(sample);

  return (
    <View className="rounded-2xl border border-slate-700/80 p-4" style={{ backgroundColor: CARD_BACKGROUND }}>
      <SectionHeading
        title="Database operations"
        detail="Measured round-trip durations, including possible connection-pool waiting; not database-engine execution time."
      />
      {sample.databaseQueryMs !== null ? (
        <View className="mb-4 flex-row items-center justify-between rounded-xl border border-slate-700 bg-[#0B1424] px-3 py-2.5">
          <Text className="flex-1 text-xs text-slate-300">Aggregate dashboard DB timing interval</Text>
          <Text className="text-xs font-bold text-white">{formatMilliseconds(sample.databaseQueryMs)}</Text>
        </View>
      ) : null}
      {operations.length > 0 ? (
        <View className="gap-3">
          {operations.map(([name, duration]) => (
            <View key={name}>
              <View className="mb-1.5 flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-xs text-slate-300">{databaseOperationLabels[name] ?? name.replaceAll('_', ' ')}</Text>
                <Text className="text-xs font-semibold text-white">{formatMilliseconds(duration)}</Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-slate-800">
                <View
                  className="h-full rounded-full bg-cyan-400"
                  style={{ width: `${(duration / maxDuration) * 100}%` }}
                />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text className="rounded-xl border border-slate-700 bg-[#0B1424] p-3 text-xs leading-5 text-slate-400">
          No individual database operation timings were recorded for this sample.
        </Text>
      )}
      {inconsistent ? (
        <View className="mt-4 rounded-xl border border-amber-700/60 bg-amber-500/10 p-3">
          <Text className="text-[11px] font-semibold leading-5 text-amber-100">
            Some database timings are inconsistent or overlapping. Validate instrumentation before drawing conclusions about individual query performance.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function hasInconsistentDatabaseTimings(sample: DashboardLoadDiagnostics) {
  const durations = Object.values(sample.databaseQueryBreakdown).filter(
    (duration) => Number.isFinite(duration) && duration >= 0,
  );
  if (durations.length === 0) return false;

  const measuredSum = durations.reduce((sum, duration) => sum + duration, 0);
  const maxDuration = Math.max(...durations);
  const nearIdenticalDurations = durations.length > 1
    && maxDuration - Math.min(...durations) <= Math.max(2, maxDuration * 0.005);
  return nearIdenticalDurations
    || (sample.databaseQueryMs !== null && measuredSum > sample.databaseQueryMs * 1.05);
}

function HealthMetric({
  icon: Icon,
  label,
  value,
  status,
  width,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  status?: string;
  width: `${number}%`;
}) {
  return (
    <View className="mb-2 rounded-xl border border-slate-700/80 p-3" style={{ width, backgroundColor: CARD_BACKGROUND }}>
      <View className="flex-row items-center gap-2">
        <Icon size={14} color="#7dd3fc" />
        <Text className="flex-1 text-[10px] font-semibold text-slate-400">{label}</Text>
      </View>
      <Text className="mt-2 text-sm font-bold text-white">{value}</Text>
      {status ? <Text className="mt-1 text-[9px] text-slate-500">{status}</Text> : null}
    </View>
  );
}

function SystemHealth({ sample, width }: { sample: DashboardLoadDiagnostics; width: number }) {
  const eventLoopValue = formatMilliseconds(sample.eventLoopP99Ms);
  const eventLoopStatus = sample.eventLoopP99Ms === null
    ? undefined
    : sample.eventLoopP99Ms >= 50 ? 'Elevated' : 'Below 50 ms indicator';
  const metricWidth: `${number}%` = width >= 1024 ? '23%' : '48%';
  return (
    <View className="rounded-2xl border border-slate-700/80 p-4" style={{ backgroundColor: CARD_BACKGROUND }}>
      <SectionHeading title="System health" detail="Unavailable measurements are shown as such; small values are not automatically healthy." />
      <View className="flex-row flex-wrap justify-between">
        <HealthMetric icon={Activity} label="Event-loop lag (p99)" value={eventLoopValue} status={eventLoopStatus} width={metricWidth} />
        <HealthMetric icon={Download} label="Response download" value={formatMilliseconds(sample.responseDownloadMs)} width={metricWidth} />
        <HealthMetric icon={Database} label="Response payload" value={formatBytes(sample.responseBytes)} width={metricWidth} />
        <HealthMetric icon={Globe2} label="DNS lookup" value={formatMilliseconds(sample.dnsLookupMs)} width={metricWidth} />
        <HealthMetric icon={Network} label="Connection setup (includes TLS)" value={formatMilliseconds(sample.connectionMs)} width={metricWidth} />
        <HealthMetric icon={Shield} label="TLS handshake" value={formatMilliseconds(sample.tlsHandshakeMs)} width={metricWidth} />
        <HealthMetric
          icon={Gauge}
          label={sample.ttfbSource === 'resource' ? 'TTFB (browser Resource Timing)' : 'Client-to-headers fallback (not TTFB)'}
          value={formatMilliseconds(sample.ttfbMs)}
          width={metricWidth}
        />
        <HealthMetric
          icon={Server}
          label="External services"
          value={formatMilliseconds(sample.externalServiceMs)}
          status={sample.externalServiceMs === null ? 'Not reported by current instrumentation' : undefined}
          width={metricWidth}
        />
      </View>
    </View>
  );
}

function getDiagnosticInsight(sample: DashboardLoadDiagnostics, databaseInconsistent: boolean) {
  if (databaseInconsistent) {
    return 'Database operation timings appear inconsistent or overlapping. Validate how round trips and aggregate durations are instrumented before isolating a query.';
  }
  if (sample.status === 0 || sample.status >= 400) {
    return `The latest dashboard request did not complete successfully (HTTP ${sample.status || 'no response'}); latency comparisons should wait for a successful sample.`;
  }
  const slowestDatabaseOperation = Object.entries(sample.databaseQueryBreakdown)
    .filter(([, duration]) => Number.isFinite(duration) && duration >= 0)
    .sort(([, firstDuration], [, secondDuration]) => secondDuration - firstDuration)[0];
  if (slowestDatabaseOperation && slowestDatabaseOperation[1] >= 500) {
    const label = databaseOperationLabels[slowestDatabaseOperation[0]] ?? slowestDatabaseOperation[0].replaceAll('_', ' ');
    return `The slowest measured database round trip is ${label} at ${formatMilliseconds(slowestDatabaseOperation[1])}. Round-trip timing can include connection-pool waiting and is not database-engine execution time.`;
  }
  if (sample.backendTotalMs === null || sample.uiRenderingMs === null) {
    return 'Insufficient measured data to compare backend route and UI rendering durations.';
  }
  if (sample.backendTotalMs >= SLOW_LOAD_MS) {
    return `Backend route duration is ${formatMilliseconds(sample.backendTotalMs)}. This exceeds the dashboard slow-load threshold; the timing includes route processing and is not database-only.`;
  }
  if (sample.backendTotalMs > sample.uiRenderingMs) {
    return `The measured backend route (${formatMilliseconds(sample.backendTotalMs)}) took longer than UI render/commit (${formatMilliseconds(sample.uiRenderingMs)}).`;
  }
  if (sample.uiRenderingMs > sample.backendTotalMs) {
    return `UI render/commit (${formatMilliseconds(sample.uiRenderingMs)}) took longer than the measured backend route (${formatMilliseconds(sample.backendTotalMs)}).`;
  }
  return 'Backend route and UI render/commit durations are similar in this sample; no single larger measured component stands out.';
}

export default function PerformanceDashboard({
  samples,
  latest,
  loading,
  historyLoading,
  error,
  waitingTooLong,
  width,
}: {
  samples: DashboardLoadDiagnostics[];
  latest: DashboardLoadDiagnostics | null;
  loading: boolean;
  historyLoading: boolean;
  error: string | null;
  waitingTooLong: boolean;
  width: number;
}) {
  const latestIndex = latest ? samples.findIndex((sample) => sample.sampledAt === latest.sampledAt) : -1;
  const previous = latestIndex > 0 ? samples[latestIndex - 1] : undefined;
  const compare = latest ? compareSamples(latest, previous) : null;
  const loadState = latest ? getLoadState(latest) : null;
  const metricWidth: `${number}%` = width >= 1024 ? '32%' : width >= 640 ? '48%' : '100%';
  const databaseInconsistent = latest ? hasInconsistentDatabaseTimings(latest) : false;

  return (
    <View className="gap-4">
      {error ? (
        <View className="rounded-xl border border-rose-700/70 bg-rose-500/10 p-3">
          <Text className="text-xs leading-5 text-rose-200">Latest dashboard request failed: {error}</Text>
        </View>
      ) : null}
      {waitingTooLong ? (
        <View className="rounded-xl border border-amber-700/70 bg-amber-500/10 p-3">
          <Text className="text-xs leading-5 text-amber-100">
            The dashboard request is still in progress. Its cause is not known until the request completes.
          </Text>
        </View>
      ) : null}

      <View>
        <SectionHeading title="Performance summary" detail="Latest measured request · UI commit timing is measured separately." />
        <View className="flex-row flex-wrap justify-between">
          <MetricCard
            label="Total dashboard load"
            value={latest ? formatDuration(latest.totalMs) : 'Not available'}
            description="Client elapsed from request setup through response parsing; UI commit is separate."
            color={loadState?.color}
            badge={loadState?.label}
            comparison={compare}
            width={metricWidth}
            icon={Timer}
          />
          <MetricCard
            label="Backend route duration"
            value={latest ? formatMilliseconds(latest.backendTotalMs) : 'Not available'}
            description="Server-Timing app interval; includes route processing, not database-only execution."
            color="#7dd3fc"
            width={metricWidth}
            icon={Server}
          />
          <MetricCard
            label="UI render / commit"
            value={latest ? formatMilliseconds(latest.uiRenderingMs) : 'Not available'}
            description="Time measured after dashboard data assignment until UI commit."
            color="#a5b4fc"
            width={metricWidth}
            icon={Activity}
          />
        </View>
        {!latest && (loading || historyLoading) ? (
          <View className="flex-row items-center gap-2 pb-2">
            <ActivityIndicator color="#67e8f9" />
            <Text className="text-[11px] text-slate-400">Loading saved performance data…</Text>
          </View>
        ) : null}
        {!latest && !loading && !historyLoading ? (
          <View className="mb-3 rounded-xl border border-slate-700/70 bg-[#0B1424] p-3">
            <Text className="text-xs leading-5 text-slate-300">
              No performance sample is available yet. Metrics will appear after a dashboard request is measured; historical data is not generated.
            </Text>
          </View>
        ) : null}
      </View>

      <PerformanceTrend samples={samples} />

      {latest ? (
        <>
          <TimeBreakdown sample={latest} />
          <DatabaseOperations sample={latest} />
          <SystemHealth sample={latest} width={width} />
          <View className={`rounded-2xl border p-4 ${databaseInconsistent ? 'border-amber-700/60 bg-amber-500/10' : 'border-cyan-900/70 bg-[#0D1C2D]'}`}>
            <View className="mb-2 flex-row items-center gap-2">
              <Timer size={15} color={databaseInconsistent ? '#fcd34d' : '#67e8f9'} />
              <Text className={`text-sm font-bold ${databaseInconsistent ? 'text-amber-100' : 'text-cyan-100'}`}>Diagnostic insight</Text>
            </View>
            <Text className="text-xs leading-5 text-slate-300">
              {getDiagnosticInsight(latest, databaseInconsistent)}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}
