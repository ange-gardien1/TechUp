import { AppState } from 'react-native';
import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

export function useLiveRefresh(
  refresh: () => Promise<void>,
  enabled = true,
  intervalMs = 5000,
  refreshOnFocus = true,
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;

      let isFocused = true;
      let isRefreshing = false;
      const refreshIfReady = () => {
        if (!isFocused || isRefreshing || AppState.currentState !== 'active') return;
        isRefreshing = true;
        void refreshRef.current()
          .catch((error: unknown) => console.error('Live data refresh failed', error))
          .finally(() => {
            isRefreshing = false;
          });
      };

      if (refreshOnFocus) refreshIfReady();
      const interval = setInterval(refreshIfReady, intervalMs);
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') refreshIfReady();
      });

      return () => {
        isFocused = false;
        clearInterval(interval);
        subscription.remove();
      };
    }, [enabled, intervalMs, refreshOnFocus]),
  );
}
