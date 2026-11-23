import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Activity, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Wrench } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandLogo } from '../src/components/BrandLogo';
import { GoogleSignInButton } from '../src/components/auth/GoogleSignInButton';
import { NativeLoginScreen } from '../src/components/auth/NativeLoginScreen';
import { useAuth } from '../src/providers/AuthProvider';

const isWeb = Platform.OS === 'web';

function ResponsiveLoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle, sessionExpired } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  async function handleGoogleLogin(idToken: string) {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle(idToken);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      nativeID="login-page"
      style={isWeb ? undefined : { flex: 1, backgroundColor: '#050B18' }}
    >
      <KeyboardAvoidingView
        nativeID="login-keyboard"
        style={isWeb ? undefined : { flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          nativeID="login-scroll"
          style={isWeb ? undefined : { flex: 1 }}
          contentContainerStyle={isWeb ? undefined : { flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            nativeID="login-layout"
            style={isWeb ? undefined : { flex: 1, paddingHorizontal: 24, paddingVertical: 28 }}
          >
            <View
              nativeID="login-hero"
              style={isWeb ? undefined : { flex: 1, justifyContent: 'center' }}
            >
              <View nativeID="login-hero-brand" style={{ flexDirection: 'row', alignItems: 'center' }}>
                <BrandLogo size={42} />
                <Text nativeID="login-hero-brand-name">TechUp</Text>
                <View nativeID="login-brand-badge">
                  <Text nativeID="login-brand-badge-text">SERVICE PLATFORM</Text>
                </View>
              </View>

              <View nativeID="login-hero-copy">
                <Text nativeID="login-eyebrow">CUSTOMER PORTAL</Text>
                <View nativeID="login-welcome-heading">
                  <Text nativeID="login-welcome-title">Welcome back!</Text>
                  <Text nativeID="login-gradient-title">TechUp!</Text>
                </View>
                <Text nativeID="login-description">
                  Sign in to continue and access your requests, track progress, and more.
                </Text>
              </View>

              <View
                nativeID="login-illustration-wrap"
                style={isWeb ? undefined : { width: '100%', height: 240 }}
              >
                <View nativeID="login-glow-blue" />
                <View nativeID="login-glow-violet" />
                <Image
                  nativeID="login-illustration"
                  source={require('../man1.png')}
                  resizeMode="contain"
                  accessibilityLabel="TechUp technician ready to help with device repairs"
                  style={{ width: '100%', height: '100%' }}
                />
              </View>

              <View nativeID="login-features">
                <View nativeID="login-feature-requests">
                  <View nativeID="login-feature-icon-blue"><Wrench size={17} color="#71B7FF" /></View>
                  <Text nativeID="login-feature-text-requests">Manage your requests</Text>
                </View>
                <View nativeID="login-feature-progress">
                  <View nativeID="login-feature-icon-cyan"><Activity size={17} color="#54E5E5" /></View>
                  <Text nativeID="login-feature-text-progress">Track your progress</Text>
                </View>
                <View nativeID="login-feature-secure">
                  <View nativeID="login-feature-icon-violet"><ShieldCheck size={17} color="#C4A5FF" /></View>
                  <Text nativeID="login-feature-text-secure">Secure and private</Text>
                </View>
              </View>

              <View nativeID="login-support">
                <Text nativeID="login-support-caption">NEED A HAND? OUR TEAM IS HERE TO HELP.</Text>
                <Link href="tel:0782245728" asChild>
                  <Pressable nativeID="login-support-link" accessibilityRole="link">
                    <Text nativeID="login-support-number">0782245728</Text>
                    <Text nativeID="login-support-action">Contact support</Text>
                  </Pressable>
                </Link>
              </View>
            </View>

            <View
              nativeID="login-form-column"
              style={isWeb ? undefined : { justifyContent: 'center', paddingVertical: 12 }}
            >
              <View nativeID="login-card">
                <View nativeID="login-card-brand">
                  <BrandLogo size={38} />
                  <View>
                    <Text nativeID="login-card-brand-name">TechUp</Text>
                    <Text nativeID="login-card-brand-caption">REPAIR, REIMAGINED</Text>
                  </View>
                </View>

                <View nativeID="login-form-heading">
                  <Text nativeID="login-form-title">Sign in</Text>
                  <Text nativeID="login-form-subtitle">Continue to your account</Text>
                </View>

                {sessionExpired ? (
                  <Text nativeID="login-session-expired" accessibilityRole="alert">
                    Your session has expired. Please sign in again to continue.
                  </Text>
                ) : null}

                <View nativeID="login-google">
                  <GoogleSignInButton
                    disabled={loading}
                    onIdToken={handleGoogleLogin}
                    onError={setError}
                  />
                </View>

                <View nativeID="login-divider">
                  <View nativeID="login-divider-line-left" />
                  <Text nativeID="login-divider-label">OR CONTINUE WITH EMAIL</Text>
                  <View nativeID="login-divider-line-right" />
                </View>

                <View nativeID="login-fields">
                  <View nativeID="login-email-group">
                    <Text nativeID="login-email-label">Email address</Text>
                    <View nativeID="login-email-field" style={emailFocused ? { borderColor: '#4C9AFF' } : undefined}>
                      <Mail size={18} color={emailFocused ? '#63C7FF' : '#8292AD'} />
                      <TextInput
                        nativeID="login-email-input"
                        accessibilityLabel="Email address"
                        value={email}
                        onChangeText={(value) => {
                          setEmail(value);
                          setError('');
                        }}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        placeholder="you@example.com"
                        placeholderTextColor="#8292AD"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        keyboardType="email-address"
                        returnKeyType="next"
                        textContentType="emailAddress"
                      />
                    </View>
                  </View>

                  <View nativeID="login-password-group">
                    <Text nativeID="login-password-label">Password</Text>
                    <View nativeID="login-password-field" style={passwordFocused ? { borderColor: '#4C9AFF' } : undefined}>
                      <LockKeyhole size={18} color={passwordFocused ? '#63C7FF' : '#8292AD'} />
                      <TextInput
                        nativeID="login-password-input"
                        accessibilityLabel="Password"
                        value={password}
                        onChangeText={(value) => {
                          setPassword(value);
                          setError('');
                        }}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        onSubmitEditing={handleLogin}
                        placeholder="Enter your password"
                        placeholderTextColor="#8292AD"
                        autoCapitalize="none"
                        autoComplete="current-password"
                        returnKeyType="go"
                        secureTextEntry={!showPassword}
                        textContentType="password"
                      />
                      <Pressable
                        nativeID="login-password-toggle"
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                        accessibilityState={{ checked: showPassword }}
                        onPress={() => setShowPassword((visible) => !visible)}
                      >
                        {showPassword
                          ? <EyeOff size={18} color="#9AABC5" />
                          : <Eye size={18} color="#9AABC5" />}
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View nativeID="login-form-options">
                  <Pressable
                    nativeID="login-forgot"
                    accessibilityRole="button"
                    onPress={() =>
                      Alert.alert(
                        'Password recovery',
                        'Password reset is not available yet. Please contact TECHUP support for help.',
                      )
                    }
                  >
                    <Text nativeID="login-forgot-text">Forgot password?</Text>
                  </Pressable>
                </View>

                {error ? (
                  <Text nativeID="login-error" accessibilityRole="alert">
                    {error}
                  </Text>
                ) : null}

                <Pressable
                  nativeID="login-submit"
                  accessibilityRole="button"
                  accessibilityLabel="Sign in"
                  onPress={handleLogin}
                  disabled={loading}
                  style={{ opacity: loading ? 0.72 : 1 }}
                >
                  <LinearGradient
                    colors={['#1677FF', '#315FF4', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      minHeight: 54,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 16,
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text nativeID="login-submit-text">Sign in</Text>
                        <ArrowRight size={18} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                <View nativeID="login-create-account-row">
                  <Text nativeID="login-create-account-caption">New to TechUp?</Text>
                  <Link href="/register" asChild>
                    <Pressable nativeID="login-create-account" accessibilityRole="link">
                      <Text nativeID="login-create-account-text">Create account</Text>
                    </Pressable>
                  </Link>
                </View>

                <Text nativeID="login-card-footnote">
                  By signing in, you agree to keep your account details safe.
                </Text>
              </View>
              <View nativeID="login-secure-caption">
                <ShieldCheck size={14} color="#788AA7" />
                <Text nativeID="login-secure-caption-text">Secure access to your TechUp account</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function LoginScreen() {
  return isWeb ? <ResponsiveLoginScreen /> : <NativeLoginScreen />;
}
