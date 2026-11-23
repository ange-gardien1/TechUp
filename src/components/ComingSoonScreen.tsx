import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Headphones,
  Laptop,
  PackageOpen,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wrench,
} from 'lucide-react-native';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useAppTheme } from '../providers/AppThemeProvider';

type ComingSoonScreenProps = {
  featureName: string;
};

const categories = [
  { label: 'Phones', Icon: Smartphone, color: '#58B7FF' },
  { label: 'Computers', Icon: Laptop, color: '#9B83FF' },
  { label: 'Accessories', Icon: Headphones, color: '#48D8D2' },
];

export function ComingSoonScreen({ featureName }: ComingSoonScreenProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isDark } = useAppTheme();
  const isWide = width >= 960;
  const isCompact = width < 440;
  const colors = isDark
    ? {
        page: '#071126',
        panel: '#101D34',
        panelBorder: 'rgba(144, 169, 208, 0.2)',
        surface: 'rgba(20, 38, 67, 0.82)',
        text: '#F6F9FF',
        muted: '#A8B6CC',
        subtle: '#8092AE',
        badge: 'rgba(52, 211, 206, 0.12)',
        badgeBorder: 'rgba(52, 211, 206, 0.28)',
        badgeText: '#83E7E1',
      }
    : {
        page: '#F3F7FD',
        panel: '#FFFFFF',
        panelBorder: '#DCE5F0',
        surface: '#F4F7FC',
        text: '#102344',
        muted: '#52647E',
        subtle: '#647792',
        badge: '#E8F8F7',
        badgeBorder: '#BDEBE7',
        badgeText: '#087D79',
      };

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView
        nativeID="coming-soon-scroll"
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: isCompact ? 16 : 28,
          paddingVertical: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 1160,
            alignSelf: 'center',
            flexDirection: isWide ? 'row' : 'column',
            alignItems: isWide ? 'center' : 'stretch',
            gap: isWide ? 56 : 30,
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: 0,
              alignItems: isWide ? 'flex-start' : 'center',
              paddingVertical: isWide ? 20 : 0,
            }}
          >
            <View
              style={{
                minHeight: 34,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.badgeBorder,
                backgroundColor: colors.badge,
              }}
            >
              <Sparkles size={14} color={colors.badgeText} />
              <Text
                style={{
                  color: colors.badgeText,
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 1.4,
                }}
              >
                COMING SOON
              </Text>
            </View>

            <Text
              accessibilityRole="header"
              style={{
                maxWidth: 580,
                marginTop: 22,
                color: colors.text,
                fontSize: width < 380 ? 34 : width < 760 ? 40 : 52,
                fontWeight: '800',
                letterSpacing: -1.5,
                lineHeight: width < 380 ? 40 : width < 760 ? 47 : 59,
                textAlign: isWide ? 'left' : 'center',
              }}
            >
              {featureName} are on their way.
            </Text>

            <Text
              style={{
                maxWidth: 490,
                marginTop: 16,
                color: colors.muted,
                fontSize: 16,
                lineHeight: 26,
                textAlign: isWide ? 'left' : 'center',
              }}
            >
              We&apos;re putting the finishing touches on our gadget shop. Check back soon for a
              thoughtful selection of devices and accessories from TechUp.
            </Text>

            <View
              style={{
                width: isCompact ? '100%' : undefined,
                flexDirection: isCompact ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: isWide ? 'flex-start' : 'center',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 26,
              }}
            >
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/repair-flow')}
                style={({ pressed }) => ({
                  minHeight: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  paddingHorizontal: 18,
                  borderRadius: 15,
                  backgroundColor: '#1769F5',
                  opacity: pressed ? 0.88 : 1,
                  width: isCompact ? '100%' : undefined,
                })}
              >
                <Wrench size={17} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                  Explore repair services
                </Text>
                <ArrowRight size={17} color="#FFFFFF" />
              </Pressable>

              <Pressable
                accessibilityRole="link"
                onPress={() => router.replace('/')}
                style={({ pressed }) => ({
                  minHeight: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.panelBorder,
                  backgroundColor: isDark ? 'rgba(16, 29, 52, 0.66)' : '#FFFFFF',
                  opacity: pressed ? 0.76 : 1,
                  width: isCompact ? '100%' : undefined,
                })}
              >
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
                  Back to home
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: 22,
              }}
            >
              <ShieldCheck size={16} color={colors.subtle} />
              <Text style={{ color: colors.subtle, fontSize: 12 }}>
                We&apos;re building a better way to shop with TechUp.
              </Text>
            </View>
          </View>

          <View
            style={{
              width: '100%',
              maxWidth: 470,
              minHeight: 330,
              flex: isWide ? 0.9 : undefined,
              alignSelf: 'center',
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.panelBorder,
              borderRadius: 30,
              backgroundColor: colors.panel,
              boxShadow: `0px 18px 28px rgba(20, 39, 71, ${isDark ? 0.28 : 0.09})`,
            }}
          >
            <LinearGradient
              colors={isDark ? ['#112344', '#10172C', '#14162D'] : ['#FFFFFF', '#F3F7FF', '#F6F2FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, minHeight: 330, padding: isCompact ? 20 : 26 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Text
                  style={{
                    color: colors.subtle,
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 1.6,
                  }}
                >
                  TECHUP  /  GADGETS
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 9,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: isDark ? 'rgba(116, 135, 255, 0.12)' : '#F0EDFF',
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#8570F5',
                    }}
                  />
                  <Text style={{ color: isDark ? '#B8B8FF' : '#6550C7', fontSize: 9, fontWeight: '800' }}>
                    IN PROGRESS
                  </Text>
                </View>
              </View>

              <View
                style={{
                  minHeight: 185,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: isCompact ? 10 : 18,
                }}
              >
                <View
                  style={{
                    width: 52,
                    height: 60,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: colors.panelBorder,
                    borderRadius: 17,
                    backgroundColor: colors.surface,
                    transform: [{ rotate: '-9deg' }],
                  }}
                >
                  <Laptop size={23} color="#9B83FF" />
                </View>
                <LinearGradient
                  colors={['#1685FF', '#5369F5', '#8650E9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: isCompact ? 104 : 118,
                    height: isCompact ? 104 : 118,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 34,
                    boxShadow: '0px 12px 22px rgba(67, 109, 244, 0.35)',
                  }}
                >
                  <PackageOpen size={52} color="#FFFFFF" strokeWidth={1.6} />
                </LinearGradient>
                <View
                  style={{
                    width: 52,
                    height: 60,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: colors.panelBorder,
                    borderRadius: 17,
                    backgroundColor: colors.surface,
                    transform: [{ rotate: '9deg' }],
                  }}
                >
                  <Headphones size={23} color="#48CFCB" />
                </View>
              </View>

              <Text
                style={{
                  marginBottom: 12,
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                Good tech. Thoughtfully chosen.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {categories.map(({ label, Icon, color }) => (
                  <View
                    key={label}
                    style={{
                      minHeight: 57,
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      borderWidth: 1,
                      borderColor: colors.panelBorder,
                      borderRadius: 15,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Icon size={16} color={color} />
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.muted,
                        fontSize: 9,
                        fontWeight: '600',
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
