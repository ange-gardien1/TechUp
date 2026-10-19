import { Platform } from 'react-native';
import { getSessionToken } from './sessionToken';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://127.0.0.1:4000');

export type ApiRequestPerformance = {
  totalMs: number;
  fetchMs: number;
  bodyMs: number;
  parseMs: number;
  dnsLookupMs: number | null;
  connectionMs: number | null;
  tlsHandshakeMs: number | null;
  ttfbMs: number | null;
  ttfbSource: 'resource' | 'fetch' | null;
  backendTotalMs: number | null;
  databaseQueryMs: number | null;
  databaseQueryBreakdown: Record<string, number>;
  eventLoopP99Ms: number | null;
  externalServiceMs: number | null;
  responseDownloadMs: number;
  jsonParsingMs: number;
  responseBytes: number | null;
  serverTiming: Record<string, number>;
  apiUptimeSeconds: number | null;
  status: number;
};

type UnauthorizedHandler = () => Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

function now() {
  return typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : Date.now();
}

function getResourceTimings(requestUrl: string) {
  if (Platform.OS !== 'web' || typeof globalThis.performance?.getEntriesByName !== 'function') {
    return {
      dnsLookupMs: null,
      connectionMs: null,
      tlsHandshakeMs: null,
      ttfbMs: null,
      ttfbSource: null,
    };
  }

  const entries = globalThis.performance.getEntriesByName(requestUrl, 'resource');
  const entry = entries.at(-1) as PerformanceResourceTiming | undefined;
  if (!entry || entry.responseStart <= 0) {
    return {
      dnsLookupMs: null,
      connectionMs: null,
      tlsHandshakeMs: null,
      ttfbMs: null,
      ttfbSource: null,
    };
  }

  const availableDuration = (start: number, end: number) =>
    start >= 0 && end >= start ? end - start : null;

  return {
    dnsLookupMs: availableDuration(entry.domainLookupStart, entry.domainLookupEnd),
    connectionMs: availableDuration(entry.connectStart, entry.connectEnd),
    tlsHandshakeMs: entry.secureConnectionStart > 0
      ? availableDuration(entry.secureConnectionStart, entry.connectEnd)
      : null,
    ttfbMs: entry.responseStart - entry.startTime,
    ttfbSource: 'resource' as const,
  };
}

function parseServerTiming(header: string | null): Record<string, number> {
  if (!header) return {};

  return Object.fromEntries(
    header.split(',').flatMap((entry) => {
      const [name, ...parameters] = entry.trim().split(';');
      const duration = parameters.find((parameter) => parameter.trim().startsWith('dur='));
      const milliseconds = duration ? Number(duration.trim().slice(4)) : Number.NaN;
      return name && Number.isFinite(milliseconds) ? [[name, milliseconds]] : [];
    }),
  );
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  onPerformance?: (metrics: ApiRequestPerformance) => void,
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  const hasBody = typeof init.body === 'string' || init.body instanceof FormData;
  const startedAt = now();
  const requestUrl = `${API_BASE_URL}${path}`;

  if (hasBody && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!path.startsWith('/auth/') && !headers.has('Authorization')) {
    const sessionToken = await getSessionToken();
    if (sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`);
  }

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      ...init,
      headers,
    });
  } catch (error) {
    const failedAt = now();
    onPerformance?.({
      totalMs: failedAt - startedAt,
      fetchMs: failedAt - startedAt,
      bodyMs: 0,
      parseMs: 0,
      ...getResourceTimings(requestUrl),
      backendTotalMs: null,
      databaseQueryMs: null,
      databaseQueryBreakdown: {},
      eventLoopP99Ms: null,
      externalServiceMs: null,
      responseDownloadMs: 0,
      jsonParsingMs: 0,
      responseBytes: null,
      serverTiming: {},
      apiUptimeSeconds: null,
      status: 0,
    });
    throw error;
  }
  const fetchFinishedAt = now();

  const responseText = await response.text();
  const bodyReadAt = now();
  let data: unknown = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      const message = response.ok
        ? `The server returned an invalid JSON response (HTTP ${response.status}). Check the API URL and server logs.`
        : `Request failed (HTTP ${response.status}) with a non-JSON response. Check the API URL and server route.`;
      throw new Error(message);
    }
  }
  const parsedAt = now();
  const serverTiming = parseServerTiming(response.headers.get('server-timing'));
  const resourceTimings = getResourceTimings(requestUrl);
  const databaseQueryMs = ['db_init', 'auth_db', 'seed_db', 'dashboard_db'].reduce(
    (total, phase) => total + (serverTiming[phase] ?? 0),
    0,
  );
  const databaseQueryBreakdown = Object.fromEntries(
    Object.entries(serverTiming)
      .filter(([name]) => name.startsWith('db_query_'))
      .map(([name, duration]) => [name.slice('db_query_'.length), duration]),
  );

  onPerformance?.({
    totalMs: parsedAt - startedAt,
    fetchMs: fetchFinishedAt - startedAt,
    bodyMs: bodyReadAt - fetchFinishedAt,
    parseMs: parsedAt - bodyReadAt,
    ...resourceTimings,
    ttfbMs: resourceTimings.ttfbMs ?? fetchFinishedAt - startedAt,
    ttfbSource: resourceTimings.ttfbMs === null ? 'fetch' : 'resource',
    backendTotalMs: serverTiming.app ?? null,
    databaseQueryMs: serverTiming.dashboard_db === undefined ? null : databaseQueryMs,
    databaseQueryBreakdown,
    eventLoopP99Ms: serverTiming.event_loop_p99 ?? null,
    externalServiceMs: null,
    responseDownloadMs: bodyReadAt - fetchFinishedAt,
    jsonParsingMs: parsedAt - bodyReadAt,
    responseBytes: Number(response.headers.get('content-length')) || null,
    serverTiming,
    apiUptimeSeconds: response.headers.has('x-api-uptime-seconds')
      ? Number(response.headers.get('x-api-uptime-seconds'))
      : null,
    status: response.status,
  });

  if (!response.ok) {
    const isAuthenticatedRoute = !path.startsWith('/auth/');
    if (response.status === 401 && isAuthenticatedRoute) {
      await unauthorizedHandler?.();
    }

    const message =
      response.status === 401 && isAuthenticatedRoute
        ? 'Your session has expired. Please sign in again.'
        : typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `Request failed (${response.status})`;

    throw new Error(message);
  }

  return data as T;
}
