import { Link, Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Laptop,
  MapPin,
  Monitor,
  Network,
  Phone,
  Printer,
  Settings,
  UserRound,
  Wrench,
} from "lucide-react-native";
import {
  Image,
  LinearGradient,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "../src/components/ThemedNative";
import { BrandLogo } from "../src/components/BrandLogo";
import { apiRequest } from "../src/lib/api";
import { useAuth } from "../src/providers/AuthProvider";
import { useAppTheme } from "../src/providers/AppThemeProvider";

const CLOSED_REQUEST_STATUSES = new Set(["completed", "closed", "cancelled", "rejected"]);

type HomeRepairRequest = {
  id: number;
  customerId: number | null;
  deviceType: string;
  brand?: string | null;
  model?: string | null;
  issueDescription: string;
  status: string;
  preferredTime?: string | null;
  technicianId?: number | null;
};

const services = [
  {
    title: "Laptops",
    subtitle: "Repair & Maintenance",
    icon: Laptop,
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    title: "Phones",
    subtitle: "Screen, Battery & More",
    icon: Phone,
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    title: "Desktops",
    subtitle: "Repair & Setup",
    icon: Monitor,
    color: "#10B981",
    bg: "#ECFDF5",
  },
  {
    title: "Printers",
    subtitle: "Setup & Fix",
    icon: Printer,
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
  {
    title: "Network",
    subtitle: "Wi-Fi, Router & More",
    icon: Network,
    color: "#06B6D4",
    bg: "#ECFEFF",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const [activeRequest, setActiveRequest] = useState<HomeRepairRequest | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadActiveRequest() {
      if (!user || user.role !== "customer") {
        setActiveRequest(null);
        setRequestLoading(false);
        setRequestError(null);
        return;
      }

      setRequestLoading(true);
      setRequestError(null);
      try {
        const requests = await apiRequest<HomeRepairRequest[]>("/repair-requests");
        const latestActiveRequest = requests
          .filter((request) =>
            request.customerId === user.id &&
            !CLOSED_REQUEST_STATUSES.has(String(request.status ?? "").toLowerCase()),
          )
          .sort((first, second) => second.id - first.id)[0] ?? null;

        if (isMounted) {
          setActiveRequest(latestActiveRequest);
        }
      } catch (error) {
        console.warn("Unable to load active customer request", error);
        if (isMounted) {
          setRequestError("Your latest request is unavailable right now.");
        }
      } finally {
        if (isMounted) {
          setRequestLoading(false);
        }
      }
    }

    loadActiveRequest();
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.role]);

  const theme = isDark
    ? {
        page: "#0B1220",
        surface: "#121D31",
        surfaceSoft: "#18243A",
        text: "#F1F5F9",
        muted: "#A6B2C5",
        border: "#26344A",
        accent: "#60A5FA",
        heroColors: ["#0B1B4B", "#101D4A", "#10245A"] as const,
      }
    : {
        page: "#F5F8FC",
        surface: "#FFFFFF",
        surfaceSoft: "#EFF4FB",
        text: "#0B1437",
        muted: "#64748B",
        border: "#E4EAF3",
        accent: "#2563EB",
        heroColors: ["#0B1B4B", "#101D4A", "#10245A"] as const,
      };

  const normalizedRequestStatus = String(activeRequest?.status ?? "submitted").toLowerCase();
  const requestStatusIndex = ({
    submitted: 0,
    pending: 0,
    under_review: 0,
    technician_assigned: 1,
    assigned: 1,
    scheduled: 1,
    customer_approval: 1,
    repair_in_progress: 1,
    in_progress: 1,
  } as Record<string, number>)[normalizedRequestStatus] ?? 0;
  const ActiveDeviceIcon = activeRequest?.deviceType.toLowerCase().includes("phone")
    ? Phone
    : activeRequest?.deviceType.toLowerCase().includes("printer")
      ? Printer
      : activeRequest?.deviceType.toLowerCase().includes("desktop")
        ? Monitor
        : Laptop;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.page }}>
        <Text className="font-semibold" style={{ color: theme.text }}>
          Loading...
        </Text>
      </View>
    );
  }

  if (user && user.role !== "customer") {
    const destination = `/${user.role}`;
    return <Redirect href={destination as any} />;
  }

  return (
    <View className="flex-1 items-center" style={{ backgroundColor: theme.page }}>
      <View className="flex-1 w-full" style={{ backgroundColor: theme.page }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
        <View style={{ width: "100%", maxWidth: 430, alignSelf: "center" }}>
        {/* ========================================================= */}
        {/* HERO */}
        {/* ========================================================= */}

        <View className="px-4">
          <LinearGradient
            colors={theme.heroColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 30,
              overflow: "hidden",
              minHeight: width < 390 ? 440 : 430,
            }}
          >
            {/* Quiet brand mark behind the technician */}
            <View
              className="absolute right-[-78] top-12"
              style={{
                opacity: 0.1,
                transform: [{ rotate: "-10deg" }],
              }}
            >
              <BrandLogo size={330} />
            </View>

            <Image
              source={require("../man1.png")}
              resizeMode="cover"
              accessibilityLabel="TeckUP repair technician"
              style={{
                position: "absolute",
                right: 0,
                bottom: -26,
                width: width < 360 ? 250 : width < 520 ? 274 : 310,
                height: width < 390 ? 368 : 390,
              }}
            />

            <LinearGradient
              colors={["#0B1B4B", "rgba(11,27,75,0.97)", "rgba(11,27,75,0.72)", "rgba(11,27,75,0)"]}
              locations={[0, 0.34, 0.58, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "100%", pointerEvents: "none" }}
            />

            <LinearGradient
              colors={["rgba(11,27,75,0.86)", "rgba(11,27,75,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ position: "absolute", top: 0, right: 0, width: "82%", height: 105, pointerEvents: "none" }}
            />

            <View className="px-6 pt-6 pb-6" style={{ maxWidth: width < 390 ? 300 : 560 }}>
              {/* Badge */}
              <View className="self-start flex-row items-center rounded-full border border-white/15 px-4 py-2" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                <Wrench size={15} color="#67E8F9" />

                <Text className="ml-2 font-bold text-sm text-[#E7F5FF]">
                  Fast • Reliable • Near You
                </Text>
              </View>

              {/* Heading */}
              <Text
                className="mt-5 font-black"
                style={{
                  color: "#FFFFFF",
                  fontSize: width < 390 ? 34 : 38,
                  lineHeight: width < 390 ? 39 : 43,
                  maxWidth: width < 390 ? 255 : 320,
                }}
              >
                Your Devices.{"\n"}
                <Text style={{ color: "#55D9FF" }}>
                  Our Experts.
                </Text>
              </Text>

              {/* Description */}
              <Text
                className="mt-4 text-base leading-6"
                style={{ color: "#CBD8F0", maxWidth: width < 390 ? 240 : 285 }}
              >
                Request a repair or maintenance service and
                our technician comes directly to your location.
              </Text>

              {/* CTA */}
              <Link href="/repair-flow" asChild>
                <Pressable className="mt-6 self-start">
                  <LinearGradient
                    colors={["#006EFF", "#7C3AED"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 18,
                      paddingHorizontal: width < 360 ? 12 : 22,
                      paddingVertical: 15,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Text className="text-white font-black" style={{ fontSize: width < 360 ? 14 : 16 }}>
                      Request a Service
                    </Text>

                    <ArrowRight
                      size={21}
                      color="white"
                      style={{ marginLeft: width < 360 ? 8 : 12 }}
                    />
                  </LinearGradient>
                </Pressable>
              </Link>

              {/* Small trust indicators */}
              <View className="flex-row flex-wrap mt-6 gap-x-5 gap-y-2">
                <View className="flex-row items-center">
                  <Check size={15} color="#67E8F9" />
                  <Text className="ml-1 text-xs font-semibold text-[#DAE8FF]">
                    Verified Technicians
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <MapPin size={15} color="#A78BFA" />
                  <Text className="ml-1 text-xs font-semibold text-[#DAE8FF]">
                    Doorstep Service
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ========================================================= */}
        {/* SERVICES */}
        {/* ========================================================= */}

        <View className="mt-7">
          <View className="px-5 flex-row items-center justify-between">
            <Text className="font-black" style={{ color: theme.text, fontSize: width < 390 ? 19 : 22, flexShrink: 1 }}>
              What do you need help with?
            </Text>

            <Pressable onPress={() => router.push("/repair-flow")} className="flex-row items-center">
              <Text className="font-bold" style={{ color: theme.accent }}>
                See all
              </Text>

              <ChevronRight
                size={18}
                color={theme.accent}
              />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 18,
              paddingTop: 16,
              paddingBottom: 5,
            }}
          >
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <Link
                  key={service.title}
                  href="/repair-flow"
                  asChild
                >
                  <Pressable
                    className="mr-3 rounded-[20px] border px-3 py-4"
                    style={{ width: 125, backgroundColor: theme.surface, borderColor: theme.border }}
                  >
                    <View
                      className="h-14 w-14 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: service.bg,
                      }}
                    >
                      <Icon
                        size={27}
                        color={service.color}
                      />
                    </View>

                    <Text className="mt-3 font-black" style={{ color: theme.text }}>
                      {service.title}
                    </Text>

                    <Text className="mt-1 text-xs leading-4" style={{ color: theme.muted }}>
                      {service.subtitle}
                    </Text>
                  </Pressable>
                </Link>
              );
            })}
          </ScrollView>
        </View>

        {/* ========================================================= */}
        {/* ACTIVE REQUEST */}
        {/* ========================================================= */}

        <View className="mt-8 px-5">
          <View className="rounded-[24px] border p-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceSoft }}>
                  <Clock3 size={21} color={theme.accent} />
                </View>

                <Text className="ml-3 text-lg font-black" style={{ color: theme.text }}>
                  Active Request
                </Text>
              </View>

              <Pressable onPress={() => router.push(user ? "/customer" : "/login")} className="flex-row items-center">
                <Text className="font-bold text-sm" style={{ color: theme.accent }}>
                  View Details
                </Text>

                <ChevronRight
                  size={17}
                  color={theme.accent}
                />
              </Pressable>
            </View>

            <View className="mt-5 rounded-2xl p-4" style={{ backgroundColor: theme.surfaceSoft }}>
              {activeRequest ? (
                <>
                  <View className="flex-row items-center">
                    <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F0FF]">
                      <ActiveDeviceIcon size={31} color="#2563EB" />
                    </View>

                    <View className="ml-4 flex-1">
                      <View className="flex-row items-center">
                        <View className={`h-2.5 w-2.5 rounded-full ${requestStatusIndex > 0 ? "bg-emerald-500" : "bg-amber-400"}`} />
                        <Text className={`ml-2 font-semibold ${requestStatusIndex > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                          {activeRequest.status.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase())}
                        </Text>
                      </View>
                      <Text className="mt-1 text-lg font-black" style={{ color: theme.text }}>
                        {activeRequest.deviceType}{activeRequest.brand ? ` · ${activeRequest.brand}` : ""} Repair
                      </Text>
                      <Text className="text-sm" numberOfLines={1} style={{ color: theme.muted }}>
                        {activeRequest.issueDescription}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-5 flex-row items-center">
                    <View className="w-[28%] items-center">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-[#2563EB]">
                        <Check size={18} color="white" />
                      </View>
                      <Text className="mt-2 text-center text-xs" style={{ color: theme.muted }}>Request{"\n"}Received</Text>
                    </View>
                    <View className={`h-[2px] flex-1 ${requestStatusIndex > 0 ? "bg-[#2563EB]" : "bg-slate-300"}`} />
                    <View className="w-[28%] items-center">
                      <View className={`h-9 w-9 items-center justify-center rounded-full ${requestStatusIndex > 0 ? "bg-[#2563EB]" : "bg-slate-200"}`}>
                        {requestStatusIndex > 0 ? <Check size={18} color="white" /> : null}
                      </View>
                      <Text className="mt-2 text-center text-xs" style={{ color: theme.muted }}>Technician{"\n"}Assigned</Text>
                    </View>
                    <View className="h-[2px] flex-1 bg-slate-300" />
                    <View className="w-[28%] items-center">
                      <View className="h-9 w-9 rounded-full bg-slate-200" />
                      <Text className="mt-2 text-center text-xs" style={{ color: theme.muted }}>Service{"\n"}Complete</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View className="items-center py-5">
                  <Text className="text-center font-bold" style={{ color: theme.text }}>
                    {requestLoading
                      ? "Checking your latest request..."
                      : requestError
                        ? requestError
                        : user
                          ? "No active repair request"
                          : "Sign in to track your repairs"}
                  </Text>
                  {!requestLoading ? (
                    <Pressable onPress={() => router.push(user ? "/repair-flow" : "/login")} className="mt-3 rounded-full bg-[#2563EB] px-5 py-2.5">
                      <Text className="font-bold text-white">{user ? "Request a service" : "Sign in"}</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ========================================================= */}
        {/* HOW TECHUP WORKS */}
        {/* ========================================================= */}

        <View className="mt-9 px-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-black" style={{ color: theme.text }}>
              How TECHUP Works
            </Text>

            <Pressable onPress={() => router.push("/repair-flow")} className="flex-row items-center">
              <Text className="font-bold" style={{ color: theme.accent }}>
                See all
              </Text>

              <ChevronRight
                size={18}
                color={theme.accent}
              />
            </Pressable>
          </View>

          <View className="mt-6 flex-row justify-between">
            {/* STEP 1 */}
            <View
              className="items-center"
              style={{ width: "30%" }}
            >
              <View className="relative">
                <View className="h-16 w-16 rounded-full bg-[#EEF4FF] items-center justify-center">
                  <Wrench size={27} color="#2563EB" />
                </View>

                <View className="absolute right-[-3] top-[-5] h-7 w-7 rounded-full bg-[#2563EB] items-center justify-center">
                  <Text className="text-white font-black text-xs">
                    1
                  </Text>
                </View>
              </View>

              <Text className="mt-4 font-black text-center" style={{ color: theme.text }}>
                Raise a Request
              </Text>

              <Text className="mt-2 text-xs leading-4 text-center" style={{ color: theme.muted }}>
                Choose a service and tell us the problem
              </Text>
            </View>

            {/* STEP 2 */}
            <View
              className="items-center"
              style={{ width: "30%" }}
            >
              <View className="relative">
                <View className="h-16 w-16 rounded-full bg-[#F1EDFF] items-center justify-center">
                  <MapPin size={27} color="#7C3AED" />
                </View>

                <View className="absolute right-[-3] top-[-5] h-7 w-7 rounded-full bg-[#7C3AED] items-center justify-center">
                  <Text className="text-white font-black text-xs">
                    2
                  </Text>
                </View>
              </View>

              <Text className="mt-4 font-black text-center" style={{ color: theme.text }}>
                We Assign
              </Text>

              <Text className="mt-2 text-xs leading-4 text-center" style={{ color: theme.muted }}>
                A nearby technician is assigned
              </Text>
            </View>

            {/* STEP 3 */}
            <View
              className="items-center"
              style={{ width: "30%" }}
            >
              <View className="relative">
                <View className="h-16 w-16 rounded-full bg-[#EAFBF6] items-center justify-center">
                  <Settings size={27} color="#10B981" />
                </View>

                <View className="absolute right-[-3] top-[-5] h-7 w-7 rounded-full bg-[#10B981] items-center justify-center">
                  <Text className="text-white font-black text-xs">
                    3
                  </Text>
                </View>
              </View>

              <Text className="mt-4 font-black text-center" style={{ color: theme.text }}>
                Get It Fixed
              </Text>

              <Text className="mt-2 text-xs leading-4 text-center" style={{ color: theme.muted }}>
                Our technician comes to you
              </Text>
            </View>
          </View>
        </View>

        {/* ========================================================= */}
        {/* PROMOTIONAL BANNER */}
        {/* ========================================================= */}

        <View className="mt-9 px-4">
          <LinearGradient
            colors={isDark ? ["#07142F", "#173C9B", "#402075"] : ["#061B59", "#1749C8", "#5B21B6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 28,
              overflow: "hidden",
              padding: 23,
              minHeight: width < 390 ? 205 : 190,
            }}
          >
            <Image
              source={require("../boy1.png")}
              resizeMode="contain"
              accessibilityLabel="TeckUP service technician"
              style={{
                position: "absolute",
                right: width < 520 ? 0 : 10,
                bottom: 0,
                width: width < 360 ? 135 : width < 520 ? 168 : 235,
                height: width < 360 ? 122 : width < 520 ? 144 : 185,
              }}
            />

            <View style={{ maxWidth: width < 390 ? "59%" : 300 }}>
              <Text className="text-white font-black" style={{ fontSize: width < 390 ? 19 : 24 }}>
                Keep Your Devices
              </Text>

              <Text className="text-[#8DDCFF] font-black" style={{ fontSize: width < 390 ? 19 : 24 }}>
                Running Smoothly
              </Text>

              <Text
                className="mt-2 text-[#D8E5FF] text-sm leading-5"
                style={{ maxWidth: width < 390 ? 185 : 250 }}
              >
                Reliable repair and maintenance services delivered right to your doorstep.
              </Text>

              <Link href="/repair-flow" asChild>
                <Pressable className={`mt-5 self-start rounded-full bg-white ${width < 360 ? "px-2" : "px-4"} py-3 flex-row items-center`}>
                  <Text className="text-[#0B1437] font-black" style={{ fontSize: width < 360 ? 12 : width < 390 ? 13 : 15 }}>
                    Book a Service
                  </Text>

                  <ArrowRight
                    size={18}
                    color="#2563EB"
                    style={{ marginLeft: 8 }}
                  />
                </Pressable>
              </Link>
            </View>
          </LinearGradient>
        </View>

        {/* ========================================================= */}
        {/* FOOTER */}
        {/* ========================================================= */}

        <View className="items-center px-5 pt-10 pb-5">
          <BrandLogo size={95} />

          <Text className="mt-3 text-xs" style={{ color: theme.muted }}>
            TECH. UPGRADED.
          </Text>

          <Text className="mt-2 text-xs text-center" style={{ color: theme.muted }}>
            Professional technology repair & maintenance.
          </Text>
        </View>
        </View>
        </ScrollView>

      </View>
    </View>
  );
}