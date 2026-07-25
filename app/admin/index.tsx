import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const adminFeatures = [
  'Dashboard and analytics',
  'User, technician, and manager management',
  'Product, orders, payments, and categories',
  'Reports, notifications, CMS, and settings',
];

export default function AdminScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#0B0B0F]">
      <ScrollView className="flex-1 px-6 py-8">
        <Link href="/" asChild>
          <Pressable className="mb-6">
            <Text className="text-violet-400">← Back</Text>
          </Pressable>
        </Link>
        <View className="rounded-[24px] border border-[#2B2F36] bg-[#14161A] p-6">
          <Text className="text-3xl font-semibold text-white">Admin control center</Text>
          <Text className="mt-3 text-base text-slate-300">
            A centralized command surface for operating the entire platform.
          </Text>
        </View>

        <View className="mt-6 rounded-[24px] border border-[#2B2F36] bg-[#1B1E24] p-5">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">Admin capabilities</Text>
          <View className="mt-4 gap-2">
            {adminFeatures.map((item) => (
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
