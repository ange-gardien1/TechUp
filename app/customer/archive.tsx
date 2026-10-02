import { Link, Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from '../../src/components/ThemedNative';
import { apiRequest } from '../../src/lib/api';
import { formatRepairStatus } from '../../src/lib/repairWorkflow';
import { useAuth } from '../../src/providers/AuthProvider';

type RepairRequest = {
  id: number;
  customerId: number | null;
  deviceType: string;
  brand?: string | null;
  model?: string | null;
  issueDescription: string;
  status: string;
  quoteAmount?: number | null;
  serviceFee?: number | null;
  createdAt?: string | null;
};

const ARCHIVE_STATUSES = new Set(['completed', 'closed', 'cancelled', 'rejected']);

export default function CustomerArchiveScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const rows = await apiRequest<RepairRequest[]>('/repair-requests');
        setRepairs(rows
          .filter((request) => request.customerId === user.id && ARCHIVE_STATUSES.has(String(request.status ?? '').toLowerCase()))
          .sort((first, second) => Number(second.id) - Number(first.id)));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load your history');
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [user?.id]);

  const historyCount = useMemo(() => repairs.length, [repairs]);

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
          <Text className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">Your service records</Text>
          <Text className="mt-2 text-3xl font-black text-white">Repair history</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-300">Completed and closed requests, all in one place.</Text>
        </View>

        <View className="px-5 pt-1">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-white">Archived requests</Text>
            <View className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1">
              <Text className="text-xs font-semibold text-cyan-200">{historyCount} total</Text>
            </View>
          </View>
          {loading ? (
            <View className="rounded-2xl border border-[#1C2D4A] bg-[#0D1B38] p-5">
              <ActivityIndicator color="#67e8f9" />
              <Text className="mt-3 text-center text-sm text-slate-300">Loading your history...</Text>
            </View>
          ) : error ? (
            <View className="rounded-2xl border border-rose-800 bg-[#1f1117] p-4">
              <Text className="text-sm text-rose-300">{error}</Text>
            </View>
          ) : repairs.length === 0 ? (
            <View className="rounded-2xl border border-[#1C2D4A] bg-[#0D1B38] p-5">
              <Text className="text-base font-semibold text-white">No history yet</Text>
              <Text className="mt-2 text-sm text-slate-300">Finished requests will appear here.</Text>
            </View>
          ) : (
            <View className="gap-3">
              {repairs.map((repair) => (
                <View key={repair.id} className="rounded-2xl border border-[#1C2D4A] bg-[#0D1B38] p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <Text className="flex-1 text-base font-bold text-white">#{repair.id} · {repair.deviceType}{repair.brand ? ` · ${repair.brand}` : ''}</Text>
                    <Text className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold uppercase text-cyan-200">{formatRepairStatus(repair.status)}</Text>
                  </View>
                  <Text className="mt-2 text-sm text-slate-300">{repair.issueDescription}</Text>
                  <Text className="mt-2 text-xs text-slate-400">
                    {repair.createdAt ? new Date(repair.createdAt).toLocaleDateString() : 'Date unavailable'} · RWF {Number(repair.quoteAmount ?? repair.serviceFee ?? 0).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Pressable onPress={() => router.push('/customer/new-request')} className="mt-5 min-h-12 justify-center rounded-2xl bg-[#1677FF] px-4">
            <Text className="text-center text-sm font-bold text-white">Request another repair</Text>
          </Pressable>
        </View>
      </ScrollView>

      </View>
    </View>
  );
}