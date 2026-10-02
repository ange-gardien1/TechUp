import { usePathname, useRouter } from 'expo-router';
import { Bell, LogOut, Moon, Sun, UserRound } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from './ThemedNative';
import { BrandLogo } from './BrandLogo';
import { useAppTheme } from '../providers/AppThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { apiRequest } from '../lib/api';

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
};

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useAppTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
    () => notifications.filter((notification) => notification.type === 'quote' && !notification.isRead).length,
    [notifications],
  );

  const loadNotifications = useCallback(async () => {
    if (!user || user.role !== 'customer') {
      setNotifications([]);
      setNotificationsOpen(false);
      return;
    }
    try {
      const rows = await apiRequest<NotificationItem[]>(`/notifications/${user.id}`);
      setNotifications(rows);
    } catch (error) {
      console.error('Unable to load customer notifications', error);
    }
  }, [user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications, pathname]);

  async function toggleNotifications() {
    if (user?.role !== 'customer') {
      router.push(user ? `/${user.role}` : '/login');
      return;
    }
    if (notificationsOpen) {
      setNotificationsOpen(false);
      return;
    }

    setNotificationsOpen(true);
    const unreadIds = notifications.slice(0, 4)
      .filter((item) => !item.isRead)
      .map((item) => item.id);
    if (unreadIds.length === 0) return;

    const unreadSet = new Set(unreadIds);
    setNotifications((current) => current.map((item) => (
      unreadSet.has(item.id) ? { ...item, isRead: true } : item
    )));
    try {
      await apiRequest(`/notifications/${user.id}/read`, {
        method: 'POST',
        body: JSON.stringify({ notificationIds: unreadIds }),
      });
    } catch (error) {
      setNotifications((current) => current.map((item) => (
        unreadSet.has(item.id) ? { ...item, isRead: false } : item
      )));
      console.error('Unable to mark customer notifications as read', error);
    }
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
            {unreadCount > 0 ? (
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
      {notificationsOpen && user?.role === 'customer' ? (
        <View className="mt-2 rounded-2xl border border-[#1C2D4A] bg-[#0D1B38] p-3">
          <Text className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Notifications</Text>
          {notifications.length === 0 ? (
            <Text className="text-sm text-slate-300">No updates yet.</Text>
          ) : (
            <ScrollView className="max-h-48" showsVerticalScrollIndicator={false}>
              {notifications.slice(0, 4).map((item) => (
                <View key={item.id} className="mb-2 rounded-xl border border-slate-700 bg-[#101F3D] p-2 last:mb-0">
                  <Text className="text-sm font-semibold text-white">{item.title}</Text>
                  <Text className="mt-1 text-xs text-slate-300">{item.body}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
}
