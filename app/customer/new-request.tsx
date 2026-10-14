import { Link, Redirect, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from '../../src/components/ThemedNative';
import { ArrowLeft, CheckCircle2, Laptop, Smartphone, Wrench } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../../src/lib/api';
import { useAuth } from '../../src/providers/AuthProvider';
import { formatScheduleTime, SchedulePicker } from '../../src/components/SchedulePicker';

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

const MAX_PHOTO_BASE64_LENGTH = 5_500_000;

export default function CustomerNewRequestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [deviceType, setDeviceType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [customerPhone, setCustomerPhone] = useState(user?.phone ?? '');
  const [serviceAddress, setServiceAddress] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; dataUrl: string } | null>(null);
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
    const trimmedPhone = customerPhone.trim();
    const phoneDigits = trimmedPhone.replace(/\D/g, '');

    if (!trimmedDeviceType || !trimmedIssue) {
      setError('Choose or enter a device type and describe the issue to continue.');
      return;
    }
    if (!/^\+?[0-9().\s-]+$/.test(trimmedPhone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
      setError('Enter a valid customer phone number (7 to 15 digits).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const request = await apiRequest<SubmittedRequest>('/repair-requests', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          customerPhone: trimmedPhone,
          deviceType: trimmedDeviceType,
          brand: brand.trim() || undefined,
          model: model.trim() || undefined,
          issueDescription: trimmedIssue,
          serviceAddress: serviceAddress.trim() || undefined,
          preferredTime: preferredTime.trim() || undefined,
          images: selectedPhoto ? [selectedPhoto.dataUrl] : [],
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

  async function selectPhotoFromLibrary() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      attachPhoto(asset.uri, asset.base64, asset.mimeType);
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Unable to select a photo.');
    }
  }

  function attachPhoto(uri: string, base64: string | null | undefined, mimeType?: string | null) {
    if (!base64) {
      setError('The photo could not be prepared. Please try another photo.');
      return;
    }
    if (base64.length > MAX_PHOTO_BASE64_LENGTH) {
      setError('Choose a smaller photo. The attachment must be under 4 MB.');
      return;
    }

    const normalizedMimeType = mimeType?.toLowerCase() ?? 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(normalizedMimeType)) {
      setError('Choose a JPEG, PNG, or WebP photo.');
      return;
    }

    setSelectedPhoto({ uri, dataUrl: `data:${normalizedMimeType};base64,${base64}` });
    setError('');
  }

  async function openCamera() {
    setError('');
    try {
      if (!cameraPermission?.granted) {
        const permission = await requestCameraPermission();
        if (!permission.granted) {
          setError('Allow camera access to take a photo, or choose one from your photo library.');
          return;
        }
      }
      setCameraReady(false);
      setCameraModalVisible(true);
    } catch (permissionError) {
      setError(permissionError instanceof Error ? permissionError.message : 'Unable to request camera permission.');
    }
  }

  async function capturePhoto() {
    if (!cameraReady || !cameraRef.current || takingPhoto) return;

    setTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true });
      if (!photo) {
        setError('The camera did not return a photo. Please try again.');
        return;
      }
      attachPhoto(photo.uri, photo.base64, 'image/jpeg');
      setCameraModalVisible(false);
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Unable to take a photo.');
    } finally {
      setTakingPhoto(false);
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

                  <Text className="mb-2 mt-4 text-sm font-semibold text-white">Your phone number *</Text>
                  <TextInput
                    value={customerPhone}
                    onChangeText={(value) => {
                      setCustomerPhone(value);
                      setError('');
                    }}
                    placeholder="Phone number we can reach you on"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    className="min-h-12 rounded-xl border border-[#263955] bg-[#101F3D] px-4 py-3 text-white"
                    returnKeyType="next"
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
                  <View className="mt-4">
                    <Text className="mb-2 text-sm font-semibold text-white">Preferred service time (optional)</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setScheduleModalVisible(true)}
                      className="min-h-12 justify-center rounded-xl border border-[#263955] bg-[#101F3D] px-4 py-3"
                    >
                      <Text className={preferredTime ? 'text-sm font-semibold text-white' : 'text-sm text-slate-400'}>
                        {preferredTime ? formatScheduleTime(preferredTime) : 'Choose date and time (optional)'}
                      </Text>
                    </Pressable>
                    <Text className="mt-2 text-xs leading-5 text-slate-400">
                      A technician will confirm this time or decline it so the manager can assign another technician.
                    </Text>
                  </View>
                  <View className="mt-4">
                    <Text className="mb-1 text-sm font-semibold text-white">Add a photo (optional)</Text>
                    <Text className="mb-3 text-xs text-slate-400">A photo can help the technician understand the problem.</Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void selectPhotoFromLibrary()}
                        className="min-h-11 flex-1 justify-center rounded-xl border border-[#263955] bg-[#101F3D] px-3"
                      >
                        <Text className="text-center text-xs font-semibold text-slate-200">Choose photo</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void openCamera()}
                        className="min-h-11 flex-1 justify-center rounded-xl border border-[#263955] bg-[#101F3D] px-3"
                      >
                        <Text className="text-center text-xs font-semibold text-slate-200">Take photo</Text>
                      </Pressable>
                    </View>
                    {selectedPhoto ? (
                      <View className="mt-3 flex-row items-center gap-3 rounded-xl border border-[#263955] bg-[#101F3D] p-2">
                        <Image source={{ uri: selectedPhoto.uri }} className="h-16 w-16 rounded-lg" resizeMode="cover" />
                        <Text className="flex-1 text-xs text-emerald-200">Photo attached</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Remove attached photo"
                          onPress={() => setSelectedPhoto(null)}
                          className="rounded-lg px-3 py-2"
                        >
                          <Text className="text-xs font-semibold text-rose-300">Remove</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
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
        <Modal
          visible={cameraModalVisible}
          animationType="slide"
          onRequestClose={() => setCameraModalVisible(false)}
          statusBarTranslucent
        >
          <View className="flex-1 bg-black">
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing="back"
              mode="picture"
              onCameraReady={() => setCameraReady(true)}
            />
            <View className="absolute inset-0 justify-between px-5 py-8">
              <Pressable
                accessibilityRole="button"
                onPress={() => setCameraModalVisible(false)}
                className="self-start rounded-full bg-black/60 px-4 py-3"
              >
                <Text className="text-sm font-semibold text-white">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Capture photo"
                disabled={!cameraReady || takingPhoto}
                onPress={() => void capturePhoto()}
                className="h-16 w-16 self-center items-center justify-center rounded-full border-4 border-white bg-white/30"
                style={{ opacity: cameraReady && !takingPhoto ? 1 : 0.5 }}
              >
                <View className="h-10 w-10 rounded-full bg-white" />
              </Pressable>
            </View>
          </View>
        </Modal>
        <Modal
          visible={scheduleModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setScheduleModalVisible(false)}
        >
          <View className="flex-1 justify-center bg-black/70 px-4 py-6">
            <View className="w-full self-center rounded-[24px] border border-[#263955] bg-[#0D1B38] p-4" style={{ maxWidth: 430, maxHeight: '90%' }}>
              <Text className="mb-3 text-lg font-bold text-white">Choose preferred service time</Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                <SchedulePicker value={preferredTime} onChange={setPreferredTime} optional />
              </ScrollView>
              <View className="mt-4 flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setScheduleModalVisible(false)}
                  className="min-h-12 flex-1 justify-center rounded-xl border border-[#263955] px-3"
                >
                  <Text className="text-center text-sm font-semibold text-slate-200">Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setScheduleModalVisible(false)}
                  className="min-h-12 flex-1 justify-center rounded-xl bg-[#1677FF] px-3"
                >
                  <Text className="text-center text-sm font-bold text-white">Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}
