import { Link, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, LinearGradient, Pressable, ScrollView, Text, useWindowDimensions, View } from '../src/components/ThemedNative';
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  Smartphone,
  UserRoundCog,
  Wrench,
} from 'lucide-react-native';
import { useAuth } from '../src/providers/AuthProvider';

const repairJourneySteps = [
  {
    number: '01',
    title: 'Tell us what needs fixing',
    detail: 'Choose your device, describe the problem and add photos.',
    icon: Smartphone,
    color: '#22D3EE',
    background: '#082B43',
    border: '#155E8A',
  },
  {
    number: '02',
    title: 'We assign a technician',
    detail: 'We find a suitable technician near you.',
    icon: UserRoundCog,
    color: '#C084FC',
    background: '#241744',
    border: '#6233A1',
  },
  {
    number: '03',
    title: 'Get diagnosis and quote',
    detail: 'Your technician checks the device and shares an estimate.',
    icon: FileText,
    color: '#2DD4BF',
    background: '#07343A',
    border: '#087E82',
  },
  {
    number: '04',
    title: 'Your device gets repaired',
    detail: 'Approve the quote, then we complete the repair.',
    icon: Wrench,
    color: '#FBBF24',
    background: '#38290F',
    border: '#A16207',
  },
] as const;

function RepairJourney() {
  return (
    <View className="mt-4 rounded-[26px] border border-[#1C2D4A] bg-[#0D1B38] p-4">
      <Text className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
        How TECHUP works
      </Text>
      <Text className="mt-1 text-xl font-black text-white">A simple 4-step process</Text>
      <Text className="mt-1 text-sm text-slate-400">From your request to a repaired device.</Text>

      {[0, 1].map((row) => (
        <View key={row} className="mt-3 flex-row gap-2.5">
          {repairJourneySteps.slice(row * 2, row * 2 + 2).map((step) => {
            const Icon = step.icon;
            return (
              <View
                key={step.number}
                className="min-h-[148px] flex-1 rounded-[20px] border p-3"
                style={{
                  backgroundColor: step.background,
                  borderColor: step.border,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-black" style={{ color: step.color }}>
                    {step.number}
                  </Text>
                  <Icon size={22} color={step.color} />
                </View>
                <Text className="mt-2 text-sm font-bold leading-[18px] text-white">{step.title}</Text>
                <Text className="mt-1.5 text-[11px] leading-4 text-slate-300">{step.detail}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function RepairHero({
  onStart,
  buttonLabel,
}: {
  onStart: () => void;
  buttonLabel: string;
}) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 360;

  return (
    <View className="relative -mx-5 overflow-hidden" style={{ height: isNarrow ? 342 : 366 }}>
      <Image
        source={require('../man1.png')}
        resizeMode="cover"
        accessibilityLabel="TECHUP technician repairing a laptop"
        style={{
          position: 'absolute',
          right: -78,
          bottom: -4,
          width: isNarrow ? 350 : 390,
          height: isNarrow ? 265 : 294,
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['#07142F', '#07142F', 'rgba(7,20,47,0.9)', 'rgba(7,20,47,0.12)']}
        locations={[0, 0.34, 0.62, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(7,20,47,0.15)', 'rgba(7,20,47,0.82)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View className="px-5 pt-4">
        <Text className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-300">
          From request to repair
        </Text>
        <Text className="mt-2 max-w-[255px] text-[34px] font-black leading-[38px] text-white">
          Your repair,
          {'\n'}
          <Text className="text-cyan-300">made simple.</Text>
        </Text>
        <Text className="mt-3 max-w-[218px] text-sm leading-5 text-slate-300">
          See how we guide every repair, from your first request through to a fixed device.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onStart}
          className="mt-4 self-start overflow-hidden rounded-full"
        >
          <LinearGradient
            colors={['#4568FF', '#334EF2', '#8B22E7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: isNarrow ? 20 : 24,
            }}
          >
            <Text className="text-[13px] font-bold text-white">{buttonLabel}</Text>
            <ArrowRight size={17} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function RepairFlowFrame({ children }: {
  children: ReactNode;
}) {
  return (
    <View className="flex-1 items-center" style={{ backgroundColor: '#040B18' }}>
      <View className="flex-1 w-full" style={{ maxWidth: 430, backgroundColor: '#07142F' }}>
        {children}
      </View>
    </View>
  );
}

export default function RepairFlowScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';
  const requestPath = isCustomer ? '/customer/new-request' : '/login';

  return (
    <RepairFlowFrame>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 }}
      >
        <RepairHero
          onStart={() => router.push(requestPath)}
          buttonLabel={isCustomer ? 'Request a repair' : 'Sign in to request a repair'}
        />

        <View className="mt-2 flex-row items-center rounded-2xl border border-[#1C2D4A] bg-[#0D1B38] p-3">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
            <BadgeCheck size={21} color="#22D3EE" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-white">Trusted and professional</Text>
            <Text className="mt-0.5 text-xs leading-4 text-slate-400">
              Verified technicians · Quality service · Updates at every step
            </Text>
          </View>
        </View>

        <RepairJourney />

      </ScrollView>
    </RepairFlowFrame>
  );
}
