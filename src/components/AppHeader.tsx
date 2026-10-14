import { usePathname, useRouter } from 'expo-router';
import { Bell, LogOut, Moon, Sun, UserRound, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Modal, Pressable, ScrollView, Text, View } from './ThemedNative';
import { BrandLogo } from './BrandLogo';
import { useAppTheme } from '../providers/AppThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { apiRequest } from '../lib/api';
import { useAudioPlayer } from 'expo-audio';

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  referenceId: number | null;
  createdAt: string;
};

const notificationSound = require('../../assets/notification-beep.wav');

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useAppTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const seenNotificationIds = useRef<Set<number> | null>(null);
  const isLoadingNotifications = useRef(false);
  const notificationPlayer = useAudioPlayer(notificationSound);
  const pageColors = isDark
    ? { page: '#0B1220', surface: '#121D31', border: '#26344A', text: '#F1F5F9', muted: '#A6B2C5' }
    : { page: '#F5F8FC', surface: '#FFFFFF', border: '#E4EAF3', text: '#0B1437', muted: '#64748B' };
  const profileRoute = user?.role === 'customer'
    ? '/customer/profile'
    : user?.role === 'technician'
      ? '/technician'
      : user?.role === 'manager'
        ? '/manager'
        : user?.role === 'admin'
          ? '/admin'
          : '/login';
  const initials = user?.fullName
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') ?? '';
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setNotificationsOpen(false);
      seenNotificationIds.current = null;
      return;
    }
    if (isLoadingNotifications.current) return;
    isLoadingNotifications.current = true;
    try {
      const rows = await apiRequest<NotificationItem[]>(`/notifications/${user.id}`);
      if (seenNotificationIds.current === null) {
        seenNotificationIds.current = new Set(rows.map((item) => item.id));
      } else {
        const newUnread = rows.some(
          (item) => !item.isRead && !seenNotificationIds.current?.has(item.id),
        );
        if (newUnread) {
          try {
            await notificationPlayer.seekTo(0);
            notificationPlayer.play();
          } catch (error) {
            console.error('Unable to play notification sound', error);
          }
        }
        seenNotificationIds.current = new Set(rows.map((item) => item.id));
      }
      setNotifications(rows);
    } catch (error) {
      console.error('Unable to load notifications', error);
    } finally {
      isLoadingNotifications.current = false;
    }
  }, [notificationPlayer, user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications, pathname]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void loadNotifications();
    }, 5000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadNotifications();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [loadNotifications, user?.id]);

  async function toggleNotifications() {
    if (notificationsOpen) {
      setNotificationsOpen(false);
      return;
    }

    setNotificationsOpen(true);
    await loadNotifications();
  }

  async function handleNotificationPress(item: NotificationItem) {
    setNotificationError(null);
    if (!item.isRead) {
      try {
        await apiRequest(`/notifications/${user?.id}/read`, {
          method: 'POST',
          body: JSON.stringify({ notificationIds: [item.id] }),
        });
        setNotifications((current) => current.map((notification) => (
          notification.id === item.id ? { ...notification, isRead: true } : notification
        )));
      } catch (error) {
        setNotificationError(error instanceof Error ? error.message : 'Unable to mark notification as read.');
        return;
      }
    }
    const target = user?.role === 'customer'
      ? '/customer'
      : user?.role === 'technician'
        ? '/technician'
        : user?.role === 'manager'
          ? '/manager'
          : user?.role === 'admin'
            ? '/admin'
            : null;
    setNotificationsOpen(false);
    if (target && pathname !== target) router.push(target);
  }

  async function handleLogout() {
    await logout();
    setNotifications([]);
    router.replace('/');
  }

  return (
    <View className="px-5 pb-3 pt-2" style={{ backgroundColor: pageColors.page }}>
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="TECHUP home"
          onPress={() => router.replace('/')}
          className="min-h-[72px] justify-center"
        >
          <BrandLogo size={82} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            accessibilityState={{ checked: isDark }}
            onPress={() => void toggleTheme()}
            className="h-11 w-11 items-center justify-center rounded-full border"
            style={{ backgroundColor: pageColors.surface, borderColor: pageColors.border }}
          >
            {isDark ? <Sun size={20} color="#F59E0B" /> : <Moon size={20} color="#334155" />}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={notificationsOpen ? 'Close notifications' : 'Open notifications'}
            accessibilityState={{ expanded: notificationsOpen }}
            onPress={() => void toggleNotifications()}
            className="h-11 w-11 items-center justify-center rounded-full border"
            style={{ backgroundColor: pageColors.surface, borderColor: pageColors.border }}
          >
            <Bell size={21} color={pageColors.text} />
            {unreadCount > 0 && !notificationsOpen ? (
              <View className="absolute -right-1 -top-1 min-w-[18px] items-center rounded-full bg-rose-500 px-1">
                <Text className="text-[9px] font-bold text-white">{unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
          {user ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={() => void handleLogout()}
              className="h-11 w-11 items-center justify-center rounded-full border"
              style={{ backgroundColor: pageColors.surface, borderColor: pageColors.border }}
            >
              <LogOut size={19} color={pageColors.muted} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={user ? `Open ${user.fullName}'s profile` : 'Sign in or create an account'}
            onPress={() => router.push(profileRoute)}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: user ? '#DBEAFE' : pageColors.surface }}
          >
            {user ? (
              <Text className="text-base font-black" style={{ color: '#2563EB' }}>{initials}</Text>
            ) : (
              <UserRound size={20} color={pageColors.muted} />
            )}
          </Pressable>
        </View>
      </View>
      <Modal
        visible={notificationsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNotificationsOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/70 px-3 pb-6">
          <View className="w-full self-center overflow-hidden rounded-[24px] border border-slate-700 bg-[#0D1B38] p-4" style={{ maxWidth: 400, maxHeight: '75%' }}>
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-bold text-white">Notifications</Text>
                <Text className="mt-1 text-xs text-slate-400">
                  {unreadCount ? `${unreadCount} unread` : 'All caught up'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close notifications"
                onPress={() => setNotificationsOpen(false)}
                className="rounded-full p-2"
              >
                <X size={20} color={pageColors.muted} />
              </Pressable>
            </View>
            {notifications.length === 0 ? (
              <Text className="py-6 text-center text-sm text-slate-300">No updates yet.</Text>
            ) : (
              <ScrollView
                className="flex-shrink"
                style={{ maxHeight: '100%' }}
                showsVerticalScrollIndicator={false}
              >
                {notifications.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => void handleNotificationPress(item)}
                    className={`mb-2 rounded-xl border p-3 ${
                      item.isRead
                        ? 'border-slate-700 bg-[#101F3D]'
                        : 'border-cyan-400/60 bg-cyan-500/10'
                    }`}
                  >
                    <View className="flex-row items-start justify-between gap-2">
                      <Text className={`flex-1 text-sm font-semibold ${item.isRead ? 'text-slate-200' : 'text-white'}`}>
                        {item.title}
                      </Text>
                      {!item.isRead ? (
                        <View className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                      ) : null}
                    </View>
                    <Text className={`mt-1 text-xs leading-5 ${item.isRead ? 'text-slate-400' : 'text-cyan-50'}`}>
                      {item.body}
                    </Text>
                    <Text className="mt-2 text-[10px] text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            {notificationError ? (
              <Text accessibilityRole="alert" className="mt-2 text-xs text-rose-300">{notificationError}</Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
