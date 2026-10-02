import { usePathname, useRouter } from 'expo-router';
import { ClipboardList, House, Plus, UserRound } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '../providers/AppThemeProvider';
import { useAuth } from '../providers/AuthProvider';

export type AppBottomNavTab = 'home' | 'requests' | 'newRequest' | 'profile';

type AppBottomNavProps = {
  activeTab?: AppBottomNavTab;
};

export function AppBottomNav({ activeTab }: AppBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const colors = isDark
    ? { surface: '#121D31', border: '#26344A', accent: '#60A5FA', muted: '#A6B2C5' }
    : { surface: '#FFFFFF', border: '#E4EAF3', accent: '#2563EB', muted: '#64748B' };
  const selectedTab = activeTab ?? (
    pathname === '/' ? 'home'
      : pathname.startsWith('/customer/profile') ? 'profile'
        : pathname.startsWith('/customer/new-request') || pathname.startsWith('/repair-flow') ? 'newRequest'
          : pathname.startsWith('/customer') ? 'requests'
            : undefined
  );
  const accountRoute = user?.role === 'customer'
    ? '/customer'
    : user?.role === 'technician'
      ? '/technician'
      : user?.role === 'manager'
        ? '/manager'
        : user?.role === 'admin'
          ? '/admin'
          : '/login';
  const requestsRoute = user?.role === 'customer' ? '/customer' : accountRoute;
  const requestRoute = user?.role === 'customer'
    ? '/customer/new-request'
    : user
      ? '/repair-flow'
      : '/login';
  const profileRoute = user?.role === 'customer' ? '/customer/profile' : accountRoute;

  return (
    <View className="border-t px-3 py-2" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <View className="w-full max-w-[430px] self-center flex-row items-center justify-around">
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Home"
          accessibilityState={{ selected: selectedTab === 'home' }}
          onPress={() => router.replace('/')}
          className="items-center px-3 py-1.5"
        >
          <House size={21} color={colors.accent} />
          <Text className="mt-1 text-[11px] font-bold" style={{ color: colors.accent }}>
            Home
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="My requests"
          accessibilityState={{ selected: selectedTab === 'requests' }}
          onPress={() => router.replace(requestsRoute)}
          className="items-center px-3 py-1.5"
        >
          <ClipboardList size={21} color={selectedTab === 'requests' ? colors.accent : colors.muted} />
          <Text className={`mt-1 text-[11px] ${selectedTab === 'requests' ? 'font-bold' : ''}`} style={{ color: selectedTab === 'requests' ? colors.accent : colors.muted }}>
            My requests
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a new repair request"
          accessibilityState={{ selected: selectedTab === 'newRequest' }}
          onPress={() => router.replace(requestRoute)}
          className="-mt-7 h-14 w-14 items-center justify-center rounded-2xl bg-[#1769F5]"
        >
          <Plus size={29} color="#FFFFFF" />
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Profile"
          accessibilityState={{ selected: selectedTab === 'profile' }}
          onPress={() => router.replace(profileRoute)}
          className="items-center px-3 py-1.5"
        >
          <UserRound size={21} color={selectedTab === 'profile' ? colors.accent : colors.muted} />
          <Text className={`mt-1 text-[11px] ${selectedTab === 'profile' ? 'font-bold' : ''}`} style={{ color: selectedTab === 'profile' ? colors.accent : colors.muted }}>
            Profile
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
