import { usePathname, useRouter } from 'expo-router';
import { ClipboardList, Gauge, House, Plus, Smartphone, UserRound } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '../providers/AppThemeProvider';
import { useAuth } from '../providers/AuthProvider';

export type AppBottomNavTab = 'home' | 'requests' | 'newRequest' | 'profile' | 'performance' | 'gadgets';

type AppBottomNavProps = {
  activeTab?: AppBottomNavTab;
  variant?: 'mobile' | 'desktop';
};

export function AppBottomNav({ activeTab, variant = 'mobile' }: AppBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const colors = isDark
    ? { surface: '#121D31', border: '#26344A', accent: '#60A5FA', muted: '#A6B2C5' }
    : { surface: '#FFFFFF', border: '#E4EAF3', accent: '#2563EB', muted: '#64748B' };
  const selectedTab = activeTab ?? (
    pathname === '/' ? 'home'
      : pathname.startsWith('/shop') ? 'gadgets'
        : user?.role === 'technician' && pathname.startsWith('/technician') ? 'performance'
      : pathname.startsWith('/customer/profile') ? 'profile'
        : pathname.startsWith('/customer/new-request') || pathname.startsWith('/repair-flow') ? 'newRequest'
          : pathname.startsWith('/customer') ? 'requests'
            : undefined
  );
  const isTechnician = user?.role === 'technician';
  const hasShopGadgets = !user || user.role === 'customer' || isTechnician;
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
  const requestRoute = isTechnician
    ? null
    : user?.role === 'customer'
      ? '/customer/new-request'
      : user
        ? '/repair-flow'
        : '/login';
  const profileRoute = user?.role === 'customer' ? '/customer/profile' : accountRoute;
  const workRoute = isTechnician ? '/technician' : requestsRoute;
  const workLabel = isTechnician ? 'My Performance' : 'My requests';
  const isDesktop = variant === 'desktop';

  return (
    <View
      className={isDesktop ? 'app-desktop-nav' : 'app-bottom-nav border-t px-3 py-2'}
      style={!isDesktop ? { backgroundColor: colors.surface, borderColor: colors.border } : undefined}
    >
      <View className={isDesktop ? 'app-desktop-nav-items flex-row items-center gap-1' : 'w-full self-center flex-row items-center justify-around'}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Home"
          accessibilityState={{ selected: selectedTab === 'home' }}
          onPress={() => router.replace('/')}
          className={isDesktop ? 'app-desktop-nav-link flex-row items-center gap-2 rounded-xl px-3 py-2' : 'items-center px-3 py-1.5'}
        >
          <House size={isDesktop ? 18 : 21} color={selectedTab === 'home' ? colors.accent : colors.muted} />
          <Text className={isDesktop ? 'text-sm font-semibold' : 'mt-1 text-[11px] font-bold'} style={{ color: selectedTab === 'home' ? colors.accent : colors.muted }}>
            Home
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={workLabel}
          accessibilityState={{ selected: selectedTab === (isTechnician ? 'performance' : 'requests') }}
          onPress={() => router.replace(workRoute)}
          className={isDesktop ? 'app-desktop-nav-link flex-row items-center gap-2 rounded-xl px-3 py-2' : 'items-center px-3 py-1.5'}
        >
          {isTechnician
            ? <Gauge size={isDesktop ? 18 : 21} color={selectedTab === 'performance' ? colors.accent : colors.muted} />
            : <ClipboardList size={isDesktop ? 18 : 21} color={selectedTab === 'requests' ? colors.accent : colors.muted} />}
          <Text
            numberOfLines={1}
            className={isDesktop
              ? `text-sm ${selectedTab === (isTechnician ? 'performance' : 'requests') ? 'font-bold' : 'font-medium'}`
              : `mt-1 text-[11px] ${selectedTab === (isTechnician ? 'performance' : 'requests') ? 'font-bold' : ''}`}
            style={{ color: selectedTab === (isTechnician ? 'performance' : 'requests') ? colors.accent : colors.muted }}
          >
            {workLabel}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isTechnician ? 'New repair requests are unavailable for technicians' : 'Create a new repair request'}
          accessibilityState={{ selected: selectedTab === 'newRequest', disabled: isTechnician }}
          disabled={isTechnician}
          onPress={() => {
            if (requestRoute) router.replace(requestRoute);
          }}
          className={isDesktop
            ? 'app-desktop-request-button ml-2 min-h-10 flex-row items-center justify-center gap-2 rounded-xl bg-[#1769F5] px-4'
            : '-mt-7 h-14 w-14 items-center justify-center rounded-2xl bg-[#1769F5]'}
          style={{ opacity: isTechnician ? 0.55 : 1 }}
        >
          <Plus size={isDesktop ? 18 : 29} color="#FFFFFF" />
          {isDesktop ? <Text className="text-sm font-bold text-white">New request</Text> : null}
        </Pressable>
        {hasShopGadgets ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Shop gadgets"
            accessibilityState={{ selected: selectedTab === 'gadgets' }}
            onPress={() => router.replace('/shop')}
            className={isDesktop ? 'app-desktop-nav-link flex-row items-center gap-2 rounded-xl px-3 py-2' : 'items-center px-2 py-1.5'}
          >
            <Smartphone size={isDesktop ? 18 : 21} color={selectedTab === 'gadgets' ? colors.accent : colors.muted} />
            <Text
              numberOfLines={1}
              className={isDesktop
                ? `text-sm ${selectedTab === 'gadgets' ? 'font-bold' : 'font-medium'}`
                : `mt-1 text-[11px] ${selectedTab === 'gadgets' ? 'font-bold' : ''}`}
              style={{ color: selectedTab === 'gadgets' ? colors.accent : colors.muted }}
            >
              Shop gadgets
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Profile"
            accessibilityState={{ selected: selectedTab === 'profile' }}
            onPress={() => router.replace(profileRoute)}
            className={isDesktop ? 'app-desktop-nav-link flex-row items-center gap-2 rounded-xl px-3 py-2' : 'items-center px-3 py-1.5'}
          >
            <UserRound size={isDesktop ? 18 : 21} color={selectedTab === 'profile' ? colors.accent : colors.muted} />
            <Text className={isDesktop
              ? `text-sm ${selectedTab === 'profile' ? 'font-bold' : 'font-medium'}`
              : `mt-1 text-[11px] ${selectedTab === 'profile' ? 'font-bold' : ''}`}
              style={{ color: selectedTab === 'profile' ? colors.accent : colors.muted }}
            >
              Profile
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
