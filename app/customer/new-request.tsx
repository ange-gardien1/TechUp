import { Link, Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from '../../src/components/ThemedNative';
import { ArrowLeft, CheckCircle2, Laptop, Smartphone, Wrench } from 'lucide-react-native';
import { apiRequest } from '../../src/lib/api';
import { useAuth } from '../../src/providers/AuthProvider';

type SubmittedRequest = {
  id: number;
  deviceType: string;
  brand?: string | null;
  model?: string | null;
  status: string;
};

const deviceTypes = [
  { label: 'Phone', icon: Smartphone },
  { label: 'Laptop', icon: Laptop },
  { label: 'Home electronics', icon: Wrench },
];

export default function CustomerNewRequestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [deviceType, setDeviceType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [photoNote, setPhotoNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedRequest | null>(null);

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'customer') {
    return <Redirect href={`/${user.role}` as any} />;
  }

  const customerId = user.id;

  async function handleSubmit() {
    const trimmedDeviceType = deviceType.trim();
    const trimmedIssue = issueDescription.trim();

    if (!trimmedDeviceType || !trimmedIssue) {
      setError('Choose or enter a device type and describe the issue to continue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const request = await apiRequest<SubmittedRequest>('/repair-requests', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          deviceType: trimmedDeviceType,
          brand: brand.trim() || undefined,
          model: model.trim() || undefined,
          issueDescription: trimmedIssue,
          serviceAddress: serviceAddress.trim() || undefined,
          preferredTime: preferredTime.trim() || undefined,
          images: photoNote.trim() ? [photoNote.trim()] : [],
          serviceFee: 0,
          status: 'submitted',
          paymentStatus: 'pending',
        }),
      });

      setSubmittedRequest(request);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit your repair request.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 items-center bg-[#040B18]">
      <View className="flex-1 w-full bg-[#07142F]" style={{ maxWidth: 430 }}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 }}
          >
            <View className="mb-6 flex-row items-center justify-start">
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Back to requests"
                onPress={() => router.replace('/customer')}
                className="min-h-11 flex-row items-center"
              >
                <ArrowLeft size={19} color="#94A3B8" />
                <Text className="ml-2 text-sm font-semibold text-slate-300">Requests</Text>
              </Pressable>
            </View>

            {submittedRequest ? (
              <View className="mt-8 rounded-[26px] border border-emerald-500/40 bg-[#0D241F] p-5">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-emerald-400/15">
                  <CheckCircle2 size={27} color="#34D399" />
                </View>
                <Text className="mt-4 text-2xl font-black text-white">Request submitted</Text>
                <Text className="mt-2 text-sm leading-5 text-slate-300">
                  Request #{submittedRequest.id} for your {submittedRequest.deviceType} has been sent to our team for review.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace('/customer')}
                  className="mt-5 min-h-12 justify-center rounded-2xl bg-[#1677FF] px-4"
                >
                  <Text className="text-center font-bold text-white">View my requests</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                  New service request
                </Text>
                <Text className="mt-2 text-3xl font-black text-white">Request a repair</Text>
                <Text className="mt-2 text-sm leading-5 text-slate-300">
                  Share a few details about your device and our team will take it from there.
                </Text>

                <View className="mt-5 rounded-[24px] border border-[#1C2D4A] bg-[#0D1B38] p-4">
                  <Text className="text-sm font-semibold text-white">What needs fixing? *</Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {deviceTypes.map(({ label, icon: Icon }) => {
                      const selected = deviceType === label;
                      return (
                        <Pressable
                          key={label}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => {
                            setDeviceType(label);
                            setError('');
                          }}
                          className={`min-h-11 flex-row items-center rounded-xl border px-3 ${
                            selected ? 'border-[#1677FF] bg-[#1677FF]/15' : 'border-[#263955] bg-[#101F3D]'
                          }`}
                        >
                          <Icon size={16} color={selected ? '#22D3EE' : '#94A3B8'} />
                          <Text className={`ml-2 text-xs font-semibold ${selected ? 'text-cyan-200' : 'text-slate-200'}`}>
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <TextInput
                    value={deviceType}
                    onChangeText={(value) => {
                      setDeviceType(value);
                      setError('');
                    }}
                    placeholder="Or enter another device type"
                    placeholderTextColor="#94A3B8"
                    className="mt-3 min-h-12 rounded-xl border border-[#263955] bg-[#101F3D] px-4 py-3 text-white"
                    returnKeyType="next"
                  />

                  <View className="mt-4 flex-row gap-3">
                    <TextInput
                      value={brand}
                      onChangeText={setBrand}
                      placeholder="Brand (optional)"
                      placeholderTextColor="#94A3B8"
                      className="min-h-12 flex-1 rounded-xl border border-[#263955] bg-[#101F3D] px-3 py-3 text-white"
                      returnKeyType="next"
                    />
                    <TextInput
                      value={model}
                      onChangeText={setModel}
                      placeholder="Model (optional)"
                      placeholderTextColor="#94A3B8"
                      className="min-h-12 flex-1 rounded-xl border border-[#263955] bg-[#101F3D] px-3 py-3 text-white"
                      returnKeyType="next"
                    />
                  </View>

                  <Text className="mb-2 mt-4 text-sm font-semibold text-white">Describe the problem *</Text>
                  <TextInput
                    value={issueDescription}
                    onChangeText={setIssueDescription}
                    placeholder="What is happening with your device?"
                    placeholderTextColor="#94A3B8"
                    multiline
                    textAlignVertical="top"
                    className="min-h-[110px] rounded-xl border border-[#263955] bg-[#101F3D] px-4 py-3 text-white"
                  />

                  <Text className="mb-2 mt-4 text-sm font-semibold text-white">Service details</Text>
                  <TextInput
                    value={serviceAddress}
                    onChangeText={setServiceAddress}
                    placeholder="Address or preferred service location (optional)"
                    placeholderTextColor="#94A3B8"
                    className="min-h-12 rounded-xl border border-[#263955] bg-[#101F3D] px-4 py-3 text-white"
                    returnKeyType="next"
                  />
                  <TextInput
                    value={preferredTime}
                    onChangeText={setPreferredTime}
                    placeholder="Preferred date or time (optional)"
                    placeholderTextColor="#94A3B8"
                    className="mt-3 min-h-12 rounded-xl border border-[#263955] bg-[#101F3D] px-4 py-3 text-white"
                    returnKeyType="next"
                  />
                  <TextInput
                    value={photoNote}
                    onChangeText={setPhotoNote}
                    placeholder="Photo or file reference (optional)"
                    placeholderTextColor="#94A3B8"
                    className="mt-3 min-h-12 rounded-xl border border-[#263955] bg-[#101F3D] px-4 py-3 text-white"
                    returnKeyType="done"
                  />
                </View>

                {error ? (
                  <Text accessibilityRole="alert" className="mt-3 text-sm text-rose-300">
                    {error}
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={handleSubmit}
                  disabled={loading}
                  className="mt-4 min-h-14 justify-center rounded-2xl bg-[#1677FF] px-4"
                  style={{ opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-center text-base font-bold text-white">Submit repair request</Text>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}
