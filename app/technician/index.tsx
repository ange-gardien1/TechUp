import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const technicianFeatures = [
  'Receive assigned jobs',
  'Accept or reject requests',
  'Inspect devices and update quotations',
  'Upload repair photos and progress',
  'Complete jobs and receive ratings',
  'Track earnings and service history',
];

export default function TechnicianScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#0B0B0F]">
      <ScrollView className="flex-1 px-6 py-8">
        <Link href="/" asChild>
          <Pressable className="mb-6">
            <Text className="text-emerald-400">← Back</Text>
          </Pressable>
        </Link>
        <View className="rounded-[24px] border border-[#2B2F36] bg-[#14161A] p-6">
          <Text className="text-3xl font-semibold text-white">Technician workspace</Text>
          <Text className="mt-3 text-base text-slate-300">
            A focused toolkit for mobile repair technicians managing on-site jobs efficiently.
          </Text>
        </View>

        <View className="mt-6 rounded-[24px] border border-[#2B2F36] bg-[#1B1E24] p-5">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">What technicians can do</Text>
          <View className="mt-4 gap-2">
            {technicianFeatures.map((item) => (
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
