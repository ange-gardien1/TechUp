import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  LinearGradient,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from '../src/components/ThemedNative';
import { Eye, EyeOff, LockKeyhole, Mail, MoveRight } from 'lucide-react-native';
import { useAuth } from '../src/providers/AuthProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { login, user } = useAuth();
  const { width, height } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const buttonScale = useRef(new Animated.Value(1)).current;
  const compact = height < 760;

  async function handleLogin() {
    try {
      setLoading(true);
      setError('');
      await login(email.trim(), password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function animateButton(toValue: number) {
    Animated.spring(buttonScale, {
      toValue,
      speed: 30,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }

  return (
    <View className="flex-1 items-center" style={{ backgroundColor: '#040B18' }}>
      <View className="flex-1 w-full" style={{ maxWidth: 430, backgroundColor: '#07142F' }}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 22,
              paddingTop: compact ? 12 : 20,
              paddingBottom: 24,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className={compact ? 'mt-5' : 'mt-7'}>
              <LinearGradient
                colors={['#1677FF', '#00C6FF', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: 38, height: 4, borderRadius: 3, marginBottom: 14 }}
              />
              <Text
                className="font-black text-white"
                style={{ fontSize: width < 360 ? 28 : 31, letterSpacing: -0.6 }}
              >
                Welcome back 👋
              </Text>
              <Text className="mt-1 text-base text-slate-400">
                Sign in to continue
              </Text>
            </View>

            <View
              accessible={false}
              style={{
                height: compact ? 152 : 184,
                marginTop: compact ? -2 : 2,
                marginBottom: compact ? 0 : 4,
                overflow: 'visible',
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: 164,
                  height: 164,
                  borderRadius: 82,
                  right: 26,
                  top: 12,
                  backgroundColor: '#1677FF',
                  opacity: 0.13,
                  shadowColor: '#00C6FF',
                  shadowOpacity: 0.8,
                  shadowRadius: 44,
                  shadowOffset: { width: 0, height: 0 },
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: 112,
                  height: 112,
                  borderRadius: 56,
                  right: 10,
                  top: 38,
                  backgroundColor: '#7C3AED',
                  opacity: 0.1,
                  shadowColor: '#7C3AED',
                  shadowOpacity: 0.8,
                  shadowRadius: 38,
                  shadowOffset: { width: 0, height: 0 },
                }}
              />
              <Image
                source={require('../man1.png')}
                resizeMode="contain"
                accessibilityLabel="TECHUP technician ready to help with device repairs"
                style={{
                  position: 'absolute',
                  right: width < 380 ? -16 : -8,
                  bottom: compact ? -22 : -28,
                  width: Math.min(width - 18, 390),
                  height: compact ? 202 : 242,
                }}
              />
            </View>

            <View>
              <Text className="mb-2 ml-1 text-[13px] font-semibold text-slate-200">Email</Text>
              <View
                className="h-14 flex-row items-center rounded-2xl border px-4"
                style={{
                  backgroundColor: '#101F3D',
                  borderColor: emailFocused ? '#1677FF' : '#1C2D4A',
                  shadowColor: emailFocused ? '#1677FF' : 'transparent',
                  shadowOpacity: emailFocused ? 0.18 : 0,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 0 },
                }}
              >
                <Mail size={19} color={emailFocused ? '#00C6FF' : '#94A3B8'} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="Email address"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  textContentType="emailAddress"
                  className="ml-3 flex-1 text-base text-white"
                  style={{ paddingVertical: 0 }}
                />
              </View>

              <Text className="mb-2 ml-1 mt-4 text-[13px] font-semibold text-slate-200">Password</Text>
              <View
                className="h-14 flex-row items-center rounded-2xl border px-4"
                style={{
                  backgroundColor: '#101F3D',
                  borderColor: passwordFocused ? '#1677FF' : '#1C2D4A',
                  shadowColor: passwordFocused ? '#1677FF' : 'transparent',
                  shadowOpacity: passwordFocused ? 0.18 : 0,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 0 },
                }}
              >
                <LockKeyhole size={19} color={passwordFocused ? '#00C6FF' : '#94A3B8'} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onSubmitEditing={handleLogin}
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  returnKeyType="go"
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  className="ml-3 flex-1 text-base text-white"
                  style={{ paddingVertical: 0 }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityState={{ checked: showPassword }}
                  hitSlop={8}
                  onPress={() => setShowPassword((visible) => !visible)}
                  className="h-11 w-11 items-center justify-center"
                >
                  {showPassword ? (
                    <EyeOff size={19} color="#94A3B8" />
                  ) : (
                    <Eye size={19} color="#94A3B8" />
                  )}
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  Alert.alert(
                    'Password recovery',
                    'Password reset is not available yet. Please contact TECHUP support for help.',
                  )
                }
                className="mt-3 min-h-11 self-end justify-center"
              >
                <Text className="text-sm font-semibold" style={{ color: '#4D9AFF' }}>
                  Forgot password?
                </Text>
              </Pressable>

              {error ? (
                <Text accessibilityRole="alert" className="mt-1 text-sm text-rose-400">
                  {error}
                </Text>
              ) : null}

              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleLogin}
                  onPressIn={() => animateButton(0.98)}
                  onPressOut={() => animateButton(1)}
                  disabled={loading}
                  className="mt-2 overflow-hidden rounded-2xl"
                  style={{ opacity: loading ? 0.75 : 1 }}
                >
                  <LinearGradient
                    colors={['#1677FF', '#315FF4', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      height: 56,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text className="text-[15px] font-extrabold text-white" style={{ letterSpacing: 1.1 }}>
                          SIGN IN
                        </Text>
                        <MoveRight size={19} color="#FFFFFF" style={{ marginLeft: 10 }} />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>

              <View className="mt-5 flex-row flex-wrap items-center justify-center">
                <Text className="text-sm text-slate-400">Don&apos;t have an account? </Text>
                <Link href="/register" asChild>
                  <Pressable accessibilityRole="link" className="min-h-11 justify-center px-1">
                    <Text className="text-sm font-bold" style={{ color: '#00C6FF' }}>
                      Create account
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}
