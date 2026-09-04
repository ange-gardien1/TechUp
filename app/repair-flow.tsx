import { Link, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  ShieldCheck,
  UserRoundCog,
  Wrench,
} from 'lucide-react-native';
import { apiRequest } from '../src/lib/api';
import { getRepairStatusIndex } from '../src/lib/repairWorkflow';
import { useAuth } from '../src/providers/AuthProvider';

const serviceCards = [
  { title: 'Phone repair', detail: 'Screen, battery, charging and diagnostics' },
  { title: 'Laptop repair', detail: 'Hardware checks, upgrades and motherboard fixes' },
  { title: 'Home electronics', detail: 'Smart devices, printers and entertainment systems' },
];

const serviceMethods = [
  { value: 'company_location', label: 'Company location' },
  { value: 'technician_visit', label: 'Technician visit' },
  { value: 'pickup_delivery', label: 'Pickup / delivery' },
];

const repairStatusFlow = [
  { label: 'Submitted', icon: ClipboardList },
  { label: 'Review', icon: ClipboardCheck },
  { label: 'Assigned', icon: UserRoundCog },
  { label: 'Scheduled', icon: CalendarClock },
  { label: 'Diagnosis', icon: ShieldCheck },
  { label: 'Quote', icon: FileText },
  { label: 'Approval', icon: BadgeCheck },
  { label: 'Repair', icon: Wrench },
  { label: 'Done', icon: CheckCircle2 },
] as const;

type RepairRequest = {
  id: number;
  customerId: number | null;
  deviceType: string;
  brand?: string | null;
  model?: string | null;
  issueDescription: string;
  serviceAddress?: string | null;
  preferredTime?: string | null;
  status?: string | null;
  quoteAmount?: number | null;
  serviceFee?: number | null;
  paymentStatus?: string | null;
  technicianId?: number | null;
  createdAt?: string | null;
};

export default function RepairFlowScreen() {
  const router = useRouter();
  const { user } = useAuth();
  type RepairFormState = {
    deviceType: string;
    brand: string;
    model: string;
    issueDescription: string;
    serviceAddress: string;
    preferredTime: string;
    serviceMethod: string;
    photoNote: string;
  };

  const initialFormState: RepairFormState = {
    deviceType: 'Phone',
    brand: 'Apple',
    model: 'iPhone 13',
    issueDescription: 'Battery drains quickly and screen flickers at times.',
    serviceAddress: 'Kigali, Rwanda',
    preferredTime: 'Today · 2:00 PM',
    serviceMethod: 'company_location',
    photoNote: '',
  };

  const [form, setForm] = useState<RepairFormState>(initialFormState);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<RepairRequest | null>(null);
  const [customerRequests, setCustomerRequests] = useState<RepairRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const updateFormField = <K extends keyof RepairFormState>(key: K, value: RepairFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value } as RepairFormState));
  };

  const isSignedInCustomer = !!user && user.role === 'customer';

  useEffect(() => {
    if (!isSignedInCustomer) {
      setCustomerRequests([]);
      return;
    }

    async function loadCustomerRequests() {
      setLoadingRequests(true);
      try {
        if (!user) {
          setCustomerRequests([]);
          setRequest(null);
          return;
        }

        const rows = await apiRequest<RepairRequest[]>('/repair-requests');
        const mine = rows.filter((item) => item.customerId === user.id).sort((a, b) => Number(b.id) - Number(a.id));
        setCustomerRequests(mine);
        setRequest(mine[0] ?? null);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingRequests(false);
      }
    }

    loadCustomerRequests();
  }, [isSignedInCustomer, user?.id]);

  const currentStatusIndex = useMemo(() => getRepairStatusIndex(request?.status), [request?.status]);

  async function submitRequest() {
    if (!isSignedInCustomer) {
      setMessage('Please sign in as a customer to submit a repair request.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const data = await apiRequest<RepairRequest>('/repair-requests', {
        method: 'POST',
        body: JSON.stringify({
          customerId: user.id,
          deviceType: form.deviceType,
          brand: form.brand,
          model: form.model,
          issueDescription: form.issueDescription,
          serviceAddress: form.serviceAddress,
          preferredTime: form.preferredTime,
          serviceFee: 0,
          status: 'submitted',
          paymentStatus: 'pending',
          latitude: -1.9441,
          longitude: 30.0619,
          images: form.photoNote ? [form.photoNote] : [],
        }),
      });

      setRequest(data);
      setCustomerRequests((prev) => [data, ...prev]);
      setForm({ ...initialFormState, deviceType: 'Phone' });
      setMessage(`Your repair request has been successfully sent. Request number #${data.id} is now in the company review queue.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-[#0B0B0F]">
        <ScrollView className="flex-1 px-6 py-8" contentContainerStyle={{ paddingBottom: 32 }}>
          <View className="mb-6 flex-row items-center justify-between">
            <Link href="/" asChild>
              <Pressable>
                <Text className="text-cyan-400">← Back</Text>
              </Pressable>
            </Link>
            <Link href="/register" asChild>
              <Pressable className="rounded-full bg-cyan-500 px-3 py-2">
                <Text className="text-xs font-bold uppercase tracking-[0.2em] text-white">Create account</Text>
              </Pressable>
            </Link>
          </View>

          <View className="rounded-[28px] border border-[#2B2F36] bg-[#14161A] p-6">
            <Text className="text-3xl font-black text-white">Book a repair</Text>
            <Text className="mt-3 text-base text-slate-300">
              Submit a service request to the company and let our team review, assign, and manage the repair process.
            </Text>
          </View>

          <View className="mt-6 rounded-[24px] border border-[#2B2F36] bg-[#1B1E24] p-5">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">How it works</Text>
            <View className="mt-4 space-y-3">
              {serviceCards.map((service) => (
                <View key={service.title} className="rounded-2xl border border-[#2B2F36] bg-[#14161A] p-4">
                  <Text className="text-base font-semibold text-white">{service.title}</Text>
                  <Text className="mt-1 text-sm text-slate-300">{service.detail}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="mt-6 rounded-[24px] border border-[#2B2F36] bg-[#1B1E24] p-5">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Need a service?</Text>
            <Text className="mt-3 text-sm leading-6 text-slate-300">
              Sign in or create a customer account before submitting a request so the company can review your service request, schedule the right support, and keep you updated through every stage.
            </Text>
            <View className="mt-4 gap-3">
              <Link href="/login" asChild>
                <Pressable className="rounded-xl bg-cyan-500 px-4 py-3">
                  <Text className="text-center font-semibold text-white">Sign in</Text>
                </Pressable>
              </Link>
              <Link href="/register" asChild>
                <Pressable className="rounded-xl border border-[#2B2F36] bg-[#14161A] px-4 py-3">
                  <Text className="text-center font-semibold text-slate-100">Create customer account</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (user.role !== 'customer') {
    return (
      <SafeAreaView className="flex-1 bg-[#0B0B0F]">
        <ScrollView className="flex-1 px-6 py-8" contentContainerStyle={{ paddingBottom: 32 }}>
          <View className="rounded-[24px] border border-[#2B2F36] bg-[#14161A] p-6">
            <Text className="text-3xl font-black text-white">Repair request portal</Text>
            <Text className="mt-3 text-base text-slate-300">
              This area is reserved for customer accounts. Please sign in with a customer profile to submit a repair request.
            </Text>
          </View>
          <Link href="/login" asChild>
            <Pressable className="mt-6 rounded-xl bg-cyan-500 px-4 py-3">
              <Text className="text-center font-semibold text-white">Go to sign in</Text>
            </Pressable>
          </Link>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0B0B0F]">
      <ScrollView className="flex-1 px-6 py-8" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mb-6 flex-row items-center justify-between">
          <Link href="/" asChild>
            <Pressable>
              <Text className="text-cyan-400">← Back</Text>
            </Pressable>
          </Link>
          <Link href="/customer" asChild>
            <Pressable className="rounded-full bg-cyan-500 px-3 py-2">
              <Text className="text-xs font-bold uppercase tracking-[0.2em] text-white">My dashboard</Text>
            </Pressable>
          </Link>
        </View>

        <View className="rounded-[28px] border border-[#2B2F36] bg-[#14161A] p-6">
          <Text className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-400">Customer repair portal</Text>
          <Text className="mt-3 text-3xl font-black text-white">Request a service</Text>
          <Text className="mt-3 text-base text-slate-300">
            Select your repair needs, share device details, and submit the request to the company. The company reviews and assigns the right technician.
          </Text>
        </View>

        {request ? (
          <View className="mt-6 rounded-[24px] border border-emerald-800 bg-[#101b17] p-5">
            <Text className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">Active request</Text>
            <Text className="mt-3 text-2xl font-black text-white">Request #{request.id}</Text>
            <Text className="mt-2 text-sm text-slate-300">
              {request.deviceType} · {request.brand ?? 'Device'} {request.model ?? ''}
            </Text>
            <Text className="mt-2 text-sm text-emerald-300">
              Status: {(request.status ?? 'submitted').replace(/_/g, ' ')}
            </Text>
          </View>
        ) : null}

        <View className="mt-6 rounded-[24px] border border-[#2B2F36] bg-[#1B1E24] p-5">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">Service details</Text>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-medium text-slate-300">Service type</Text>
            <View className="flex-row flex-wrap gap-2">
              {serviceCards.map((service) => (
                <Pressable
                  key={service.title}
                  onPress={() => updateFormField('deviceType', service.title.replace(' repair', ''))}
                  className={`rounded-xl border px-3 py-2 ${
                    form.deviceType.toLowerCase() === service.title.toLowerCase().replace(' repair', '')
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-[#2B2F36] bg-[#14161A]'
                  }`}
                >
                  <Text className="text-sm font-medium text-slate-100">{service.title}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <TextInput
            value={form.deviceType}
            onChangeText={(value) => updateFormField('deviceType', value)}
            placeholder="Device type"
            placeholderTextColor="#64748b"
            className="mt-4 rounded-xl border border-[#2B2F36] bg-[#14161A] px-3 py-3 text-white"
          />
          <View className="mt-3 flex-row gap-3">
            <TextInput
              value={form.brand}
              onChangeText={(value) => updateFormField('brand', value)}
              placeholder="Brand"
              placeholderTextColor="#64748b"
              className="flex-1 rounded-xl border border-[#2B2F36] bg-[#14161A] px-3 py-3 text-white"
            />
            <TextInput
              value={form.model}
              onChangeText={(value) => updateFormField('model', value)}
              placeholder="Model"
              placeholderTextColor="#64748b"
              className="flex-1 rounded-xl border border-[#2B2F36] bg-[#14161A] px-3 py-3 text-white"
            />
          </View>

          <TextInput
            value={form.issueDescription}
            onChangeText={(value) => updateFormField('issueDescription', value)}
            placeholder="Describe the problem"
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={4}
            className="mt-4 min-h-[110px] rounded-xl border border-[#2B2F36] bg-[#14161A] px-3 py-3 text-white"
          />

          <TextInput
            value={form.photoNote}
            onChangeText={(value) => updateFormField('photoNote', value)}
            placeholder="Optional: photo or file reference"
            placeholderTextColor="#64748b"
            className="mt-4 rounded-xl border border-[#2B2F36] bg-[#14161A] px-3 py-3 text-white"
          />
        </View>

        <View className="mt-6 rounded-[24px] border border-[#2B2F36] bg-[#1B1E24] p-5">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Service method</Text>
          <View className="mt-4 gap-2">
            {serviceMethods.map((method) => (
              <Pressable
                key={method.value}
                onPress={() => updateFormField('serviceMethod', method.value)}
                className={`rounded-xl border px-4 py-3 ${
                  form.serviceMethod === method.value ? 'border-emerald-400 bg-emerald-500/10' : 'border-[#2B2F36] bg-[#14161A]'
                }`}
              >
                <Text className="text-base font-medium text-slate-100">{method.label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={form.serviceAddress}
            onChangeText={(value) => updateFormField('serviceAddress', value)}
            placeholder="Service address or pickup location"
            placeholderTextColor="#64748b"
            className="mt-4 rounded-xl border border-[#2B2F36] bg-[#14161A] px-3 py-3 text-white"
          />

          <TextInput
            value={form.preferredTime}
            onChangeText={(value) => updateFormField('preferredTime', value)}
            placeholder="Preferred date and time"
            placeholderTextColor="#64748b"
            className="mt-4 rounded-xl border border-[#2B2F36] bg-[#14161A] px-3 py-3 text-white"
          />
        </View>

        <View className="mt-6 rounded-[24px] border border-[#2B2F36] bg-[#1B1E24] p-5">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">Service status</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8, paddingRight: 12 }}
            className="mt-4"
          >
            <View className="flex-row gap-2">
              {repairStatusFlow.map((status, index) => {
                const isActive = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const Icon = status.icon;

                return (
                  <View
                    key={status.label}
                    className={`flex-row items-center gap-2 rounded-2xl border px-3 py-2 ${
                      isCurrent
                        ? 'border-amber-300 bg-amber-500/15'
                        : isActive
                          ? 'border-cyan-400 bg-cyan-500/10'
                          : 'border-[#2B2F36] bg-[#14161A]'
                    }`}
                  >
                    <View
                      className={`h-7 w-7 items-center justify-center rounded-full ${
                        isCurrent
                          ? 'bg-amber-400/20'
                          : isActive
                            ? 'bg-cyan-500/15'
                            : 'bg-slate-700/70'
                      }`}
                    >
                      <Icon
                        size={14}
                        color={isCurrent ? '#fcd34d' : isActive ? '#67e8f9' : '#94a3b8'}
                      />
                    </View>
                    <Text
                      className={`text-[9px] font-bold uppercase tracking-[0.18em] ${
                        isActive ? 'text-cyan-200' : 'text-slate-400'
                      }`}
                    >
                      {status.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View className="mt-6 rounded-[24px] border border-[#2B2F36] bg-[#1B1E24] p-5">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">Company review</Text>
          <Text className="mt-3 text-sm leading-6 text-slate-300">
            The company will review your request, confirm service eligibility, and assign an available technician when required. Pricing is determined after diagnosis or according to the company’s approved service pricing.
          </Text>
        </View>

        <Pressable onPress={submitRequest} className="mt-6 rounded-2xl bg-cyan-500 px-4 py-4">
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-center text-base font-bold text-white">Submit repair request</Text>}
        </Pressable>

        {message ? (
          <View className="mt-4 rounded-[20px] border border-[#2B2F36] bg-[#14161A] p-4">
            <Text className="text-sm text-slate-200">{message}</Text>
          </View>
        ) : null}

        {loadingRequests ? (
          <View className="mt-6 rounded-[20px] border border-[#2B2F36] bg-[#14161A] p-4">
            <ActivityIndicator color="#67e8f9" />
            <Text className="mt-3 text-center text-sm text-slate-300">Loading your service history...</Text>
          </View>
        ) : customerRequests.length > 0 ? (
          <View className="mt-6 rounded-[24px] border border-[#2B2F36] bg-[#1B1E24] p-5">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">Request history</Text>
            <View className="mt-4 space-y-3">
              {customerRequests.slice(0, 3).map((item) => (
                <View key={item.id} className="rounded-2xl border border-[#2B2F36] bg-[#14161A] p-4">
                  <Text className="text-base font-semibold text-white">#{item.id} · {item.deviceType}</Text>
                  <Text className="mt-1 text-sm text-slate-300">Status: {item.status ?? 'submitted'}</Text>
                  <Text className="mt-1 text-xs text-slate-400">{item.preferredTime ?? 'Need schedule confirmation'}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
