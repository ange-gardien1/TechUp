import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const managerFeatures = [
  'Assign technicians to jobs',
  'Approve quotations and monitor active work',
  'Manage service categories and pricing',
  'View payments and resolve disputes',
  'Track team performance and reports',
];

export default function ManagerScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#0B0B0F]">
      <ScrollView className="flex-1 px-6 py-8">
        <Link href="/" asChild>
          <Pressable className="mb-6">
            <Text className="text-amber-400">← Back</Text>
          </Pressable>
        </Link>
        <View className="rounded-[24px] border border-[#2B2F36] bg-[#14161A] p-6">
          <Text className="text-3xl font-semibold text-white">Manager dashboard</Text>
          <Text className="mt-3 text-base text-slate-300">
            Operational tools for overseeing technicians, jobs, pricing, and service quality.
          </Text>
        </View>

        <View className="mt-6 rounded-[24px] border border-[#2B2F36] bg-[#1B1E24] p-5">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">Manager capabilities</Text>
          <View className="mt-4 gap-2">
            {managerFeatures.map((item) => (
              <Text key={item} className="text-slate-200">
                • {item}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
