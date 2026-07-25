import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowRight,
  Database,
  ShieldCheck,
  Smartphone,
  Users,
  Wrench,
} from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const roles = [
  {
    title: "Customer",
    subtitle: "Book repairs and purchase devices",
    icon: "👤",
    color: "#06B6D4",
    route: "/customer",
  },
  {
    title: "Technician",
    subtitle: "Accept and complete repair jobs",
    icon: "🛠️",
    color: "#10B981",
    route: "/technician",
  },
  {
    title: "Manager",
    subtitle: "Coordinate technicians",
    icon: "📊",
    color: "#F59E0B",
    route: "/manager",
  },
  {
    title: "Admin",
    subtitle: "Manage the entire platform",
    icon: "⚙️",
    color: "#8B5CF6",
    route: "/admin",
  },
];

const stats = [
  {
    value: "24/7",
    label: "Support",
    icon: ShieldCheck,
  },
  {
    value: "120+",
    label: "Technicians",
    icon: Users,
  },
  {
    value: "100%",
    label: "Secure",
    icon: Database,
  },
];

const actions = [
  {
    title: "Book Repair",
    route: "/customer",
    icon: Wrench,
  },
  {
    title: "Browse Devices",
    route: "/customer",
    icon: Smartphone,
  },
  {
    title: "Database",
    route: "/database",
    icon: Database,
  },
  {
    title: "Repair Flow",
    route: "/repair-flow",
    icon: ArrowRight,
  },
];

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#09090B]">

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      >

        {/* HERO */}

        <LinearGradient
          colors={["#06B6D4", "#2563EB", "#312E81"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            padding: 24,
            paddingTop: 40,
          }}
        >

          <View className="flex-row justify-between items-center">

            <View className="bg-white/20 rounded-full px-4 py-2">

              <Text className="text-white font-bold tracking-widest">
                TECKUP
              </Text>

            </View>

            <View className="bg-white/20 rounded-full px-3 py-2">

              <Text className="text-white text-xs">
                SMART REPAIR
              </Text>

            </View>

          </View>

          <Text className="text-white text-5xl font-black mt-8 leading-[55px]">
            Repair{"\n"}Anything.
          </Text>

          <Text className="text-blue-100 text-base mt-5 leading-7">

            Connect with certified technicians,
            request repairs, track progress
            and pay securely.

          </Text>

          <View className="flex-row mt-8 gap-4">

            <Link href="/customer" asChild>

              <Pressable className="flex-1 bg-white rounded-2xl py-4">

                <Text className="text-center font-bold text-slate-900">
                  Book Repair
                </Text>

              </Pressable>

            </Link>

            <Link href="/repair-flow" asChild>

              <Pressable className="flex-1 border border-white rounded-2xl py-4">

                <Text className="text-center text-white font-bold">
                  Explore
                </Text>

              </Pressable>

            </Link>

          </View>

        </LinearGradient>

        {/* STATS */}

        <View className="px-5 mt-6">

          <Text className="text-white text-xl font-bold mb-4">
            Platform Highlights
          </Text>

          <View className="flex-row flex-wrap justify-between gap-3">

            {stats.map((item) => {

              const Icon = item.icon;

              return (

                <View
                  key={item.label}
                  className="bg-[#18181B] rounded-3xl p-5 border border-zinc-800 flex-1 min-w-[46%]"
                >

                  <View
                    className="w-12 h-12 rounded-2xl bg-cyan-500/20 items-center justify-center"
                  >

                    <Icon
                      size={24}
                      color="#06B6D4"
                    />

                  </View>

                  <Text className="text-white text-2xl font-black mt-5">
                    {item.value}
                  </Text>

                  <Text className="text-zinc-400 mt-1">
                    {item.label}
                  </Text>

                </View>

              );

            })}

          </View>

        </View>

        {/* QUICK ACTIONS */}

        <View className="px-5 mt-8">

          <Text className="text-white text-xl font-bold mb-4">
            Quick Actions
          </Text>

          <View className="flex-row flex-wrap justify-between gap-4">
            {actions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.title}
                  href={action.route as any}
                  asChild
                >
                  <Pressable className="flex-1 min-w-[46%] mb-4 rounded-3xl border border-zinc-800 bg-[#18181B] p-5 active:opacity-80">

                    <View className="flex-row items-center justify-between mb-6">
                      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15">
                        <Icon
                          size={24}
                          color="#06B6D4"
                        />
                      </View>

                      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                        <ArrowRight
                          size={18}
                          color="#06B6D4"
                        />
                      </View>
                    </View>

                    <Text className="text-lg font-bold text-white">
                      {action.title}
                    </Text>

                    <Text className="mt-2 text-sm text-zinc-400 leading-5">
                      {action.title} and stay connected.
                    </Text>

                  </Pressable>
                </Link>
              );
            })}
          </View>
        </View>

        {/* SERVICES */}

        <View className="mt-8 px-5">

          <View className="mb-5 flex-row items-center justify-between">

            <View>
              <Text className="text-2xl font-black text-white">
                Our Services
              </Text>

              <Text className="mt-1 text-zinc-400">
                Everything repaired in one place
              </Text>
            </View>

          </View>

          <View className="space-y-4">

            <View className="rounded-3xl border border-zinc-800 bg-[#18181B] p-5">

              <View className="flex-row items-center">

                <View className="mr-4 h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15">

                  <Text className="text-2xl">
                    📱
                  </Text>

                </View>

                <View className="flex-1">

                  <Text className="text-xl font-bold text-white">
                    Phone Repairs
                  </Text>

                  <Text className="mt-1 text-zinc-400">
                    Screen, battery, charging ports and water damage.
                  </Text>

                </View>

              </View>

            </View>

            <View className="rounded-3xl border border-zinc-800 bg-[#18181B] p-5">

              <View className="flex-row items-center">

                <View className="mr-4 h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">

                  <Text className="text-2xl">
                    💻
                  </Text>

                </View>

                <View className="flex-1">

                  <Text className="text-xl font-bold text-white">
                    Laptop Repairs
                  </Text>

                  <Text className="mt-1 text-zinc-400">
                    Hardware diagnostics, SSD upgrades and motherboard repairs.
                  </Text>

                </View>

              </View>

            </View>

            <View className="rounded-3xl border border-zinc-800 bg-[#18181B] p-5">

              <View className="flex-row items-center">

                <View className="mr-4 h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15">

                  <Text className="text-2xl">
                    🖥️
                  </Text>

                </View>

                <View className="flex-1">

                  <Text className="text-xl font-bold text-white">
                    Computer Support
                  </Text>

                  <Text className="mt-1 text-zinc-400">
                    Software installation, virus removal and system optimization.
                  </Text>

                </View>

              </View>

            </View>

            <View className="rounded-3xl border border-zinc-800 bg-[#18181B] p-5">

              <View className="flex-row items-center">

                <View className="mr-4 h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15">

                  <Text className="text-2xl">
                    📺
                  </Text>

                </View>

                <View className="flex-1">

                  <Text className="text-xl font-bold text-white">
                    Home Electronics
                  </Text>

                  <Text className="mt-1 text-zinc-400">
                    TVs, printers, smart devices and home appliances.
                  </Text>

                </View>

              </View>

            </View>

          </View>

        </View>

        {/* ROLES */}

        <View className="mt-10 px-5">

          <Text className="text-2xl font-black text-white">
            Choose Your Role
          </Text>

          <Text className="mt-2 text-zinc-400">
            Continue to your workspace
          </Text>

          <View className="mt-6 space-y-4">
            {roles.map((role) => (
            <Link
              key={role.title}
              href={role.route as any}
              asChild
            >
              <Pressable className="overflow-hidden rounded-[28px] border border-zinc-800 bg-[#18181B] active:opacity-90">

                {/* Top Accent */}
                <View
                  style={{
                    backgroundColor: role.color,
                    height: 6,
                    width: "100%",
                  }}
                />

                <View className="p-6">

                  <View className="flex-row items-center justify-between">

                    <View className="flex-row items-center flex-1">

                      <View
                        style={{
                          backgroundColor: `${role.color}20`,
                        }}
                        className="h-16 w-16 items-center justify-center rounded-3xl"
                      >
                        <Text className="text-3xl">
                          {role.icon}
                        </Text>
                      </View>

                      <View className="ml-4 flex-1">

                        <Text className="text-2xl font-black text-white">
                          {role.title}
                        </Text>

                        <Text className="mt-1 text-zinc-400">
                          {role.subtitle}
                        </Text>

                      </View>

                    </View>

                    <View
                      style={{
                        backgroundColor: `${role.color}20`,
                      }}
                      className="h-12 w-12 items-center justify-center rounded-full"
                    >
                      <ArrowRight
                        size={22}
                        color={role.color}
                      />
                    </View>

                  </View>

                  {/* Highlights */}

                  <View className="mt-6">

                    <View className="mb-3 flex-row items-center">

                      <View
                        style={{
                          backgroundColor: role.color,
                        }}
                        className="mr-3 h-2.5 w-2.5 rounded-full"
                      />

                      <Text className="text-zinc-300">
                        Fast and secure access
                      </Text>

                    </View>

                    <View className="mb-3 flex-row items-center">

                      <View
                        style={{
                          backgroundColor: role.color,
                        }}
                        className="mr-3 h-2.5 w-2.5 rounded-full"
                      />

                      <Text className="text-zinc-300">
                        Real-time notifications
                      </Text>

                    </View>

                    <View className="flex-row items-center">

                      <View
                        style={{
                          backgroundColor: role.color,
                        }}
                        className="mr-3 h-2.5 w-2.5 rounded-full"
                      />

                      <Text className="text-zinc-300">
                        Personalized dashboard
                      </Text>

                    </View>

                  </View>

                  {/* Button */}

                  <Pressable
                    style={{
                      backgroundColor: role.color,
                    }}
                    className="mt-6 rounded-2xl py-4"
                  >

                    <Text className="text-center text-base font-bold text-white">
                      Continue as {role.title}
                    </Text>

                  </Pressable>

                </View>

              </Pressable>
            </Link>
          ))}
                    </View>
        </View>

        {/* TRUST SECTION */}

        <View className="mt-10 px-5">

          <LinearGradient
            colors={["#0F172A", "#111827"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 28,
              padding: 24,
            }}
          >

            <Text className="text-3xl">
              ⭐
            </Text>

            <Text className="mt-5 text-2xl font-black text-white">
              Trusted by hundreds of customers
            </Text>

            <Text className="mt-3 leading-6 text-zinc-300">
              We connect customers with certified technicians for fast,
              reliable and secure repairs. From smartphones to laptops and
              home electronics, everything is managed from one platform.
            </Text>

            <View className="mt-6 flex-row">

              <View className="mr-8">

                <Text className="text-3xl font-black text-cyan-400">
                  4.9★
                </Text>

                <Text className="text-zinc-400">
                  Average Rating
                </Text>

              </View>

              <View>

                <Text className="text-3xl font-black text-emerald-400">
                  8K+
                </Text>

                <Text className="text-zinc-400">
                  Repairs Completed
                </Text>

              </View>

            </View>

          </LinearGradient>

        </View>

        {/* SUPPORT */}

        <View className="mt-8 px-5">

          <LinearGradient
            colors={["#06B6D4", "#0EA5E9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 28,
              padding: 24,
            }}
          >

            <Text className="text-4xl">
              🎧
            </Text>

            <Text className="mt-4 text-3xl font-black text-white">
              Need Help?
            </Text>

            <Text className="mt-3 text-base leading-7 text-cyan-50">
              Our support team and certified technicians are available
              around the clock to assist with bookings, repairs,
              payments and technical questions.
            </Text>

            <Link href="/customer" asChild>

              <Pressable className="mt-8 rounded-2xl bg-white py-4">

                <Text className="text-center text-lg font-bold text-cyan-600">
                  Contact Support
                </Text>

              </Pressable>

            </Link>

          </LinearGradient>

        </View>

        {/* FOOTER */}

        <View className="items-center px-5 py-12 border-t border-zinc-900">

          <Text className="text-2xl font-black text-white">
            TECKUP
          </Text>

          <Text className="mt-3 text-center leading-6 text-zinc-500">
            Smart Repair Platform
          </Text>

          <Text className="mt-1 text-center leading-6 text-zinc-500">
            Built with ❤️ for fast and reliable repairs.
          </Text>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}