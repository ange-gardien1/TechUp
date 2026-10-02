import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, View } from '../src/components/ThemedNative';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://127.0.0.1:4000');

type DashboardSummary = {
  userCount: number;
  repairCount: number;
  productCount: number;
};

export default function DatabaseScreen() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) {
          throw new Error('Backend is unavailable');
        }

        const summaryResponse = await fetch(`${API_BASE_URL}/database/summary`);
        if (!summaryResponse.ok) {
          throw new Error('Unable to load database summary');
        }

        const data = (await summaryResponse.json()) as DashboardSummary;
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Database error');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <View className="flex-1 bg-[#09111F]">
      <ScrollView className="flex-1 px-6 py-8" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="rounded-[24px] border border-slate-700 bg-[#111827] p-6">
          <Text className="text-3xl font-semibold text-white">Live database view</Text>
          <Text className="mt-3 text-base text-slate-300">
            Monitor your Neon-backed TeckUP platform and keep the service layer connected to real data.
          </Text>
        </View>

        <View className="mt-6 rounded-[24px] border border-slate-700 bg-[#0F172A] p-5">
          <Text className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">Platform snapshot</Text>
          {loading ? (
            <View className="mt-4 items-center py-4">
              <ActivityIndicator color="#38bdf8" />
              <Text className="mt-3 text-slate-300">Connecting to backend and database...</Text>
            </View>
          ) : error ? (
            <Text className="mt-4 text-rose-400">{error}</Text>
          ) : summary ? (
            <View className="mt-4 flex-row flex-wrap gap-3">
              <View className="min-w-[140px] flex-1 rounded-[18px] border border-slate-700 bg-[#111827] p-4">
                <Text className="text-2xl font-semibold text-white">{summary.userCount}</Text>
                <Text className="mt-1 text-sm text-slate-400">Users</Text>
              </View>
              <View className="min-w-[140px] flex-1 rounded-[18px] border border-slate-700 bg-[#111827] p-4">
                <Text className="text-2xl font-semibold text-white">{summary.repairCount}</Text>
                <Text className="mt-1 text-sm text-slate-400">Repair requests</Text>
              </View>
              <View className="min-w-[140px] flex-1 rounded-[18px] border border-slate-700 bg-[#111827] p-4">
                <Text className="text-2xl font-semibold text-white">{summary.productCount}</Text>
                <Text className="mt-1 text-sm text-slate-400">Products</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View className="mt-6 rounded-[24px] border border-slate-700 bg-[#0F172A] p-5">
          <Text className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Backend status</Text>
          <Text className="mt-3 text-slate-300">
            API health and database summary routes are wired so your app can display live backend data from the Neon service.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
