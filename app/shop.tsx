import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, PackageOpen, RefreshCw, Smartphone } from 'lucide-react-native';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, useWindowDimensions, View } from '../src/components/ThemedNative';
import { apiRequest } from '../src/lib/api';
import { useAppTheme } from '../src/providers/AppThemeProvider';

type Product = {
  id: number;
  name: string;
  description: string | null;
  sku: string | null;
  category: string;
  price: number;
  stockQuantity: number;
  imageUrl: string | null;
  isFeatured: boolean;
};

function formatPrice(price: number) {
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ShopScreen() {
  const { width } = useWindowDimensions();
  const { isDark } = useAppTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const colors = isDark
    ? { page: '#0B1220', card: '#111827', border: '#26344A', text: '#F1F5F9', muted: '#A6B2C5' }
    : { page: '#F5F8FC', card: '#FFFFFF', border: '#E4EAF3', text: '#0B1437', muted: '#64748B' };
  const cardWidth = Math.max(145, (width - 52) / 2);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await apiRequest<Product[]>('/products');
      setProducts(rows.filter((product) => product.stockQuantity > 0));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the gadget catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.page }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 pb-5 pt-5">
          <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">TechUp store</Text>
          <Text className="mt-2 text-3xl font-black" style={{ color: colors.text }}>Shop gadgets</Text>
          <Text className="mt-2 text-sm leading-5" style={{ color: colors.muted }}>
            Browse available devices and accessories from our product catalog.
          </Text>
        </View>

        {loading ? (
          <View className="mx-5 items-center rounded-2xl border p-7" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <ActivityIndicator color="#67e8f9" />
            <Text className="mt-3 text-xs" style={{ color: colors.muted }}>Loading available gadgets...</Text>
          </View>
        ) : error ? (
          <View className="mx-5 rounded-2xl border border-rose-800/70 bg-rose-500/10 p-4">
            <View className="flex-row items-center gap-2">
              <AlertCircle size={17} color="#fda4af" />
              <Text className="flex-1 text-sm font-semibold text-rose-100">Catalog unavailable</Text>
            </View>
            <Text className="mt-2 text-xs leading-5 text-rose-200">{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadProducts()}
              className="mt-3 min-h-10 flex-row items-center justify-center gap-2 self-start rounded-xl border border-rose-300/30 px-3"
            >
              <RefreshCw size={14} color="#fecdd3" />
              <Text className="text-xs font-bold text-rose-100">Try again</Text>
            </Pressable>
          </View>
        ) : products.length === 0 ? (
          <View className="mx-5 items-center rounded-2xl border p-7" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <PackageOpen size={24} color="#67e8f9" />
            <Text className="mt-3 text-sm font-bold" style={{ color: colors.text }}>No gadgets available right now</Text>
            <Text className="mt-1 text-center text-xs leading-5" style={{ color: colors.muted }}>
              Check back later for products currently in stock.
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-center gap-3 px-5">
            {products.map((product) => (
              <View
                key={product.id}
                className="overflow-hidden rounded-2xl border"
                style={{ width: cardWidth, backgroundColor: colors.card, borderColor: colors.border }}
              >
                <View className="h-32 items-center justify-center bg-[#0D1B38]">
                  {product.imageUrl ? (
                    <Image
                      source={{ uri: product.imageUrl }}
                      resizeMode="contain"
                      accessibilityLabel={product.name}
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <Smartphone size={34} color="#67e8f9" />
                  )}
                  {product.isFeatured ? (
                    <View className="absolute left-2 top-2 rounded-full bg-cyan-400/15 px-2 py-1">
                      <Text className="text-[9px] font-bold uppercase tracking-wider text-cyan-200">Featured</Text>
                    </View>
                  ) : null}
                </View>
                <View className="p-3">
                  <Text className="text-[9px] font-bold uppercase tracking-wider text-cyan-300">{product.category}</Text>
                  <Text className="mt-1 text-sm font-bold" numberOfLines={2} style={{ color: colors.text }}>{product.name}</Text>
                  {product.description ? (
                    <Text className="mt-1 text-[10px] leading-4" numberOfLines={2} style={{ color: colors.muted }}>
                      {product.description}
                    </Text>
                  ) : null}
                  <View className="mt-3 flex-row items-end justify-between gap-2">
                    <Text className="text-base font-black text-emerald-300">{formatPrice(product.price)}</Text>
                    <Text className="text-[9px] text-slate-400">{product.stockQuantity} in stock</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        {!loading && !error && products.length > 0 ? (
          <Text className="mx-5 mt-4 text-center text-[10px] leading-4" style={{ color: colors.muted }}>
            Catalog prices and availability reflect the latest product listing. Ordering is not available in this catalog yet.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
