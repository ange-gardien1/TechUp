import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from '../ThemedNative';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentityServices = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type: 'standard';
          theme: 'outline';
          size: 'large';
          text: 'continue_with' | 'signup_with';
          shape: 'rectangular';
          width: number;
        },
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

const GOOGLE_SCRIPT_ID = 'google-identity-services';
let googleServicesPromise: Promise<GoogleIdentityServices> | null = null;

function loadGoogleIdentityServices() {
  if (window.google?.accounts.id) return Promise.resolve(window.google);
  if (googleServicesPromise) return googleServicesPromise;

  googleServicesPromise = new Promise<GoogleIdentityServices>((resolve, reject) => {
    let script = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    const isNewScript = !script;
    if (!script) {
      script = document.createElement('script');
      script.id = GOOGLE_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
    }

    script.addEventListener('load', () => {
      if (window.google?.accounts.id) resolve(window.google);
      else reject(new Error('Google sign-in failed to initialize in this browser.'));
    }, { once: true });
    script.addEventListener('error', () => {
      if (isNewScript) script?.remove();
      reject(new Error('Could not load Google sign-in. Check your network and try again.'));
    }, { once: true });
    if (isNewScript) document.head.appendChild(script);
  });

  googleServicesPromise = googleServicesPromise.catch((error: unknown) => {
    googleServicesPromise = null;
    throw error;
  });
  return googleServicesPromise;
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const onIdTokenRef = useRef(onIdToken);
  const onErrorRef = useRef(onError);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

  useEffect(() => {
    onIdTokenRef.current = onIdToken;
    onErrorRef.current = onError;
  }, [onError, onIdToken]);

  useEffect(() => {
    if (!clientId || disabled || scriptFailed) return;

    let active = true;
    setScriptLoading(true);
    loadGoogleIdentityServices()
      .then((google) => {
        if (!active || !containerRef.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response.credential) {
              onErrorRef.current('Google did not return an identity token. Please try again.');
              return;
            }
            void onIdTokenRef.current(response.credential).catch((error: unknown) => {
              onErrorRef.current(
                error instanceof Error ? error.message : 'Unable to sign in with Google.',
              );
            });
          },
        });
        containerRef.current.replaceChildren();
        google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: label === 'Sign up with Google' ? 'signup_with' : 'continue_with',
          shape: 'rectangular',
          width: Math.min(350, Math.max(240, Math.floor(containerRef.current.clientWidth))),
        });
        setScriptFailed(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setScriptFailed(true);
        onErrorRef.current(error instanceof Error ? error.message : 'Unable to load Google sign-in.');
      })
      .finally(() => {
        if (active) setScriptLoading(false);
      });

    return () => {
      active = false;
    };
  }, [clientId, disabled, label, scriptFailed]);

  function handleUnconfiguredPress() {
    if (!clientId) {
      onError(
        'Google sign-in is not configured yet. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your app environment, then restart the app.',
      );
      return;
    }
    setScriptFailed(false);
    onError('');
  }

  if (!clientId || scriptFailed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={handleUnconfiguredPress}
        className="mt-4 min-h-14 flex-row items-center justify-center rounded-2xl border border-slate-300 bg-white px-4"
        style={{ opacity: disabled ? 0.65 : 1 }}
      >
        <Text className="mr-3 text-lg font-black text-[#4285F4]">G</Text>
        <Text className="text-sm font-bold text-slate-800">{label}</Text>
      </Pressable>
    );
  }

  return (
    <View className="mt-4 min-h-14 items-center justify-center rounded-2xl bg-white px-2">
      {scriptLoading ? <ActivityIndicator color="#334155" /> : null}
      <div
        ref={containerRef}
        aria-label={label}
        style={{ display: 'flex', width: '100%', justifyContent: 'center' }}
      />
    </View>
  );
}
