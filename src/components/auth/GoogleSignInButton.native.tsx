import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
} from 'react-native-nitro-google-signin';
import { useState } from 'react';
import { Platform } from 'react-native';
import { ActivityIndicator, Pressable, Text } from '../ThemedNative';

export function GoogleSignInButton({
  disabled = false,
  label = 'Continue with Google',
  onIdToken,
  onError,
}: {
  disabled?: boolean;
  label?: string;
  onIdToken: (idToken: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

    if (!webClientId || (Platform.OS === 'ios' && !iosClientId)) {
      onError('Google sign-in is not configured for this app yet. Follow the Google authentication setup instructions.');
      return;
    }

    setLoading(true);
    onError('');
    try {
      GoogleOneTapSignIn.configure({ webClientId, iosClientId });
      await GoogleOneTapSignIn.checkPlayServices();

      let response = await GoogleOneTapSignIn.signIn();
      if (isNoSavedCredentialFoundResponse(response)) {
        response = await GoogleOneTapSignIn.createAccount();
      }
      if (isNoSavedCredentialFoundResponse(response)) {
        response = await GoogleOneTapSignIn.presentExplicitSignIn();
      }

      if (isCancelledResponse(response)) return;
      if (!isSuccessResponse(response)) return;
      await onIdToken(response.data.idToken);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to sign in with Google.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={() => void handlePress()}
      className="mt-4 min-h-14 flex-row items-center justify-center rounded-2xl border border-slate-600 bg-white px-4"
      style={{ opacity: disabled || loading ? 0.65 : 1 }}
    >
      {loading ? (
        <ActivityIndicator color="#334155" />
      ) : (
        <>
          <Text className="mr-3 text-lg font-black text-[#4285F4]">G</Text>
          <Text className="text-sm font-bold text-slate-800">{label}</Text>
        </>
      )}
    </Pressable>
  );
}
