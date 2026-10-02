import { Link, Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { ArrowLeft, BadgeCheck, UserRound } from 'lucide-react-native';
import { apiRequest } from '../../src/lib/api';
import { useAuth, type AppUser } from '../../src/providers/AuthProvider';

type CustomerProfile = {
  address: string | null;
  city: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  preferredLanguage: string | null;
};

type ProfileResponse = {
  user: AppUser;
  customerProfile: CustomerProfile | null;
};

type ProfileForm = {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  preferredLanguage: 'en' | 'fr' | 'rw';
};

const emptyForm: ProfileForm = {
  fullName: '',
  phone: '',
  address: '',
  city: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  preferredLanguage: 'en',
};

const languages = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'rw', label: 'Kinyarwanda' },
] as const;

function ProfileField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  multiline?: boolean;
}) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-sm font-semibold text-slate-200">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#71819A"
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`min-h-14 rounded-2xl border border-[#263955] bg-[#101F3D] px-4 py-3 text-white ${
          multiline ? 'min-h-[92px]' : ''
        }`}
      />
    </View>
  );
}

export default function CustomerProfileScreen() {
  const { user, refreshUser } = useAuth();
  const userId = user?.id;
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const loadProfile = useCallback(async () => {
    if (userId === undefined) return;
    setLoading(true);
    setError('');
    setLoadFailed(false);
    try {
      const profile = await apiRequest<ProfileResponse>(`/users/${userId}/profile`);
      setForm({
        fullName: profile.user.fullName ?? '',
        phone: profile.user.phone ?? '',
        address: profile.customerProfile?.address ?? '',
        city: profile.customerProfile?.city ?? '',
        emergencyContactName: profile.customerProfile?.emergencyContactName ?? '',
        emergencyContactPhone: profile.customerProfile?.emergencyContactPhone ?? '',
        preferredLanguage: languages.some(({ code }) => code === profile.customerProfile?.preferredLanguage)
          ? (profile.customerProfile?.preferredLanguage as ProfileForm['preferredLanguage'])
          : 'en',
      });
      await refreshUser(profile.user);
      setProfileLoaded(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your profile.');
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [refreshUser, userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'customer') return <Redirect href={`/${user.role}` as any} />;

  function updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function saveProfile() {
    if (userId === undefined || !profileLoaded) return;
    const fullName = form.fullName.trim();
    if (!fullName) {
      setError('Please enter your full name.');
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const profile = await apiRequest<ProfileResponse>(`/users/${userId}/profile`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          fullName,
          phone: form.phone.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          emergencyContactName: form.emergencyContactName.trim(),
          emergencyContactPhone: form.emergencyContactPhone.trim(),
        }),
      });
      await refreshUser(profile.user);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  }

  const initials = form.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <View className="flex-1 items-center bg-[#040B18]">
      <View className="flex-1 w-full bg-[#07142F]" style={{ maxWidth: 430 }}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 28 }}
          >
            <View className="px-5 pb-5 pt-4">
              <View className="mb-6 flex-row items-center justify-start">
                <Link href="/customer" asChild>
                  <Pressable accessibilityRole="link" accessibilityLabel="Back to my requests" className="h-11 w-11 items-center justify-center rounded-full border border-[#263955] bg-[#0D1B38]">
                    <ArrowLeft size={20} color="#E2E8F0" />
                  </Pressable>
                </Link>
              </View>

              <View className="items-center rounded-[26px] border border-[#1C2D4A] bg-[#0D1B38] px-5 py-6">
                <View className="h-[76px] w-[76px] items-center justify-center rounded-full border border-blue-400/40 bg-[#1677FF]/15">
                  {initials ? (
                    <Text className="text-2xl font-black text-cyan-200">{initials}</Text>
                  ) : (
                    <UserRound size={32} color="#67E8F9" />
                  )}
                </View>
                <Text className="mt-3 text-xl font-black text-white">{form.fullName || 'Your profile'}</Text>
                <Text className="mt-1 text-sm text-slate-400">{user.email}</Text>
                <View className={`mt-3 flex-row items-center rounded-full border px-3 py-1.5 ${
                  user.isVerified ? 'border-emerald-400/20 bg-emerald-400/10' : 'border-slate-600 bg-slate-700/30'
                }`}>
                  {user.isVerified ? <BadgeCheck size={15} color="#6EE7B7" /> : <UserRound size={15} color="#CBD5E1" />}
                  <Text className={`ml-1.5 text-xs font-semibold capitalize ${
                    user.isVerified ? 'text-emerald-200' : 'text-slate-300'
                  }`}>
                    {user.isVerified ? 'Verified account' : `${user.status ?? 'Active'} account`}
                  </Text>
                </View>
              </View>
            </View>

            <View className="px-5">
              <Text className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">Account</Text>
              <Text className="mt-1 text-2xl font-black text-white">Your profile</Text>
              <Text className="mt-1 text-sm leading-5 text-slate-400">
                Keep your contact and service details up to date.
              </Text>

              {loading ? (
                <View className="mt-5 items-center rounded-2xl border border-[#1C2D4A] bg-[#0D1B38] p-6">
                  <ActivityIndicator color="#67E8F9" />
                  <Text className="mt-3 text-sm text-slate-300">Loading your profile...</Text>
                </View>
              ) : (
                <>
                  <View className="mt-5 rounded-[24px] border border-[#1C2D4A] bg-[#0D1B38] p-4">
                    <Text className="text-base font-bold text-white">Personal information</Text>
                    <ProfileField
                      label="Full name"
                      value={form.fullName}
                      onChangeText={(value) => updateField('fullName', value)}
                      placeholder="Your full name"
                    />
                    <ProfileField
                      label="Phone number"
                      value={form.phone}
                      onChangeText={(value) => updateField('phone', value)}
                      placeholder="Add a phone number"
                      keyboardType="phone-pad"
                    />
                    <View className="mt-4">
                      <Text className="mb-2 text-sm font-semibold text-slate-200">Email address</Text>
                      <View className="min-h-14 justify-center rounded-2xl border border-[#263955] bg-[#0A162C] px-4">
                        <Text className="text-base text-slate-400">{user.email}</Text>
                      </View>
                      <Text className="mt-1.5 text-xs text-slate-500">Email is used to sign in and can’t be changed here.</Text>
                    </View>
                  </View>

                  <View className="mt-4 rounded-[24px] border border-[#1C2D4A] bg-[#0D1B38] p-4">
                    <Text className="text-base font-bold text-white">Service details</Text>
                    <ProfileField
                      label="Address"
                      value={form.address}
                      onChangeText={(value) => updateField('address', value)}
                      placeholder="Street address or neighborhood"
                      multiline
                    />
                    <ProfileField
                      label="City"
                      value={form.city}
                      onChangeText={(value) => updateField('city', value)}
                      placeholder="Your city"
                    />
                    <Text className="mb-2 mt-4 text-sm font-semibold text-slate-200">Preferred language</Text>
                    <View className="flex-row gap-2">
                      {languages.map((language) => {
                        const selected = form.preferredLanguage === language.code;
                        return (
                          <Pressable
                            key={language.code}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                            onPress={() => updateField('preferredLanguage', language.code)}
                            className={`min-h-11 flex-1 items-center justify-center rounded-xl border px-2 ${
                              selected ? 'border-[#1677FF] bg-[#1677FF]/15' : 'border-[#263955] bg-[#101F3D]'
                            }`}
                          >
                            <Text className={`text-xs font-semibold ${selected ? 'text-cyan-200' : 'text-slate-300'}`}>
                              {language.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View className="mt-4 rounded-[24px] border border-[#1C2D4A] bg-[#0D1B38] p-4">
                    <Text className="text-base font-bold text-white">Emergency contact</Text>
                    <ProfileField
                      label="Contact name"
                      value={form.emergencyContactName}
                      onChangeText={(value) => updateField('emergencyContactName', value)}
                      placeholder="Emergency contact name"
                    />
                    <ProfileField
                      label="Contact phone"
                      value={form.emergencyContactPhone}
                      onChangeText={(value) => updateField('emergencyContactPhone', value)}
                      placeholder="Emergency contact phone"
                      keyboardType="phone-pad"
                    />
                  </View>

                  {error ? (
                    <View className="mt-4 rounded-2xl border border-rose-800 bg-[#1F1117] p-3">
                      <Text accessibilityRole="alert" className="text-sm text-rose-300">{error}</Text>
                      {loadFailed ? (
                        <Pressable onPress={() => void loadProfile()} className="mt-2 min-h-10 justify-center self-start">
                          <Text className="text-sm font-bold text-cyan-300">Try again</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  {saved ? (
                    <Text accessibilityLiveRegion="polite" className="mt-3 text-center text-sm font-semibold text-emerald-300">
                      Profile saved successfully.
                    </Text>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void saveProfile()}
                    disabled={saving || !profileLoaded}
                    className="mt-5 min-h-14 items-center justify-center rounded-2xl bg-[#1677FF]"
                    style={{ opacity: saving || !profileLoaded ? 0.7 : 1 }}
                  >
                    {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-bold text-white">Save changes</Text>}
                  </Pressable>
                </>
              )}

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}
