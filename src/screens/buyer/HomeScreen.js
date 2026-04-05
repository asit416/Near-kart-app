// src/screens/buyer/HomeScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Animated,
  StatusBar,
  Image,
  TextInput,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows, CATEGORIES } from '../../theme';
import {
  getNearbyProducts,
  getTrendingProducts,
  getTopSellingProducts,
} from '../../services/productService';
import ProductCard from '../../components/ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 180;

const DEMO_BANNERS = [
  {
    id: '1',
    gradient: [Colors.primary, '#FF8C5A'],
    title: 'Shop Local, Save More',
    subtitle: 'Up to 40% off on local products',
    icon: '🛍️',
  },
  {
    id: '2',
    gradient: ['#7C3AED', '#A855F7'],
    title: 'Fresh Groceries',
    subtitle: 'From your neighborhood stores',
    icon: '🥦',
  },
  {
    id: '3',
    gradient: ['#0EA5E9', '#38BDF8'],
    title: 'Electronics Deals',
    subtitle: 'Latest gadgets at best prices',
    icon: '📱',
  },
];

export default function HomeScreen({ navigation }) {
  const { userProfile } = useAuth();
  const { itemCount } = useCart();
  const insets = useSafeAreaInsets();

  const [location, setLocation] = useState(null);
  const [locationText, setLocationText] = useState('Detecting location...');
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const bannerRef = useRef(null);

  useEffect(() => {
    getLocation();
    fetchData();
    startBannerAutoplay();
  }, []);

  useEffect(() => {
    fetchProducts(activeCategory);
  }, [activeCategory]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationText('Location not available');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc.coords);

      const [address] = await Location.reverseGeocodeAsync(loc.coords);
      if (address) {
        setLocationText(`${address.district || address.city || address.region}, ${address.country}`);
      }
    } catch {
      setLocationText('Set your location');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const [trendData, topData] = await Promise.all([
      getTrendingProducts(),
      getTopSellingProducts(),
    ]);
    setTrending(trendData);
    setTopSelling(topData);
    setLoading(false);
  };

  const fetchProducts = async (category) => {
    const result = await getNearbyProducts(category);
    if (result.success) setProducts(result.products);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    await fetchProducts(activeCategory);
    setRefreshing(false);
  };

  const startBannerAutoplay = () => {
    let index = 0;
    setInterval(() => {
      index = (index + 1) % DEMO_BANNERS.length;
      setActiveBanner(index);
      bannerRef.current?.scrollTo({
        x: index * SCREEN_WIDTH,
        animated: true,
      });
    }, 3500);
  };

  // ─── Header opacity on scroll ────────────────────────────────────────────
  const headerBg = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: ['rgba(255,107,53,0)', 'rgba(255,107,53,1)'],
    extrapolate: 'clamp',
  });

  const renderBanner = ({ item }) => (
    <LinearGradient
      colors={item.gradient}
      style={styles.bannerCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle}>{item.title}</Text>
        <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
        <TouchableOpacity style={styles.bannerBtn}>
          <Text style={styles.bannerBtnText}>Shop Now</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.bannerIcon}>{item.icon}</Text>
    </LinearGradient>
  );

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        activeCategory === item.id && { backgroundColor: item.color },
      ]}
      onPress={() => setActiveCategory(item.id)}
    >
      <Text style={styles.categoryEmoji}>{item.icon}</Text>
      <Text
        style={[
          styles.categoryName,
          activeCategory === item.id && styles.categoryNameActive,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* ── Sticky Header ───────────────────────────────────────────────── */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        {/* Location Row */}
        <View style={styles.locationRow}>
          <TouchableOpacity style={styles.locationBtn} onPress={getLocation}>
            <Ionicons name="location" size={16} color={Colors.white} />
            <Text style={styles.locationText} numberOfLines={1}>{locationText}</Text>
            <Ionicons name="chevron-down" size={14} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => navigation.navigate('CartTab')}
          >
            <Ionicons name="cart" size={22} color={Colors.white} />
            {itemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('SearchTab')}
        >
          <Ionicons name="search" size={18} color={Colors.gray400} />
          <Text style={styles.searchPlaceholder}>
            Search products, shops...
          </Text>
          <View style={styles.searchMic}>
            <Ionicons name="mic" size={16} color={Colors.primary} />
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Main Scroll ─────────────────────────────────────────────────── */}
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>
            Hey {userProfile?.name?.split(' ')[0] || 'there'} 👋
          </Text>
          <Text style={styles.greetingSubtext}>What are you shopping for today?</Text>
        </View>

        {/* Banners */}
        <ScrollView
          ref={bannerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.bannersContainer}
        >
          {DEMO_BANNERS.map((banner) => renderBanner({ item: banner }))}
        </ScrollView>
        <View style={styles.dotsRow}>
          {DEMO_BANNERS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, activeBanner === i && styles.dotActive]}
            />
          ))}
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Browse Categories</Text>
        <FlatList
          horizontal
          data={CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />

        {/* Trending Products */}
        {trending.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔥 Trending Near You</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Category', { filter: 'trending' })}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={trending}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                  style={styles.horizontalCard}
                />
              )}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Spacing.base }}
            />
          </View>
        )}

        {/* Top Selling */}
        {topSelling.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⭐ Best Sellers</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={topSelling}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                  style={styles.horizontalCard}
                />
              )}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Spacing.base }}
            />
          </View>
        )}

        {/* All Products Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activeCategory === 'all' ? '🏪 All Products' : `Products in ${activeCategory}`}
          </Text>
        </View>
        <View style={styles.productsGrid}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
              style={styles.gridCard}
            />
          ))}
          {products.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🛍️</Text>
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptySubtext}>Try another category</Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },

  // Header
  header: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.md },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  locationText: {
    color: Colors.white,
    fontFamily: Typography.fontMedium,
    fontSize: Typography.sm,
    marginHorizontal: 4,
    flex: 1,
  },
  cartBtn: { padding: 6, position: 'relative' },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: Colors.primary,
    fontSize: 10,
    fontFamily: Typography.fontBold,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    color: Colors.gray400,
    fontFamily: Typography.fontRegular,
    fontSize: Typography.base,
  },
  searchMic: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Greeting
  greetingRow: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.base },
  greetingText: {
    fontFamily: Typography.fontBold,
    fontSize: Typography.xl,
    color: Colors.gray900,
  },
  greetingSubtext: {
    fontFamily: Typography.fontRegular,
    fontSize: Typography.sm,
    color: Colors.gray500,
    marginTop: 2,
  },

  // Banners
  bannersContainer: { paddingLeft: Spacing.base },
  bannerCard: {
    width: SCREEN_WIDTH - Spacing.base * 2,
    height: BANNER_HEIGHT,
    borderRadius: BorderRadius.xl,
    marginRight: Spacing.base,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerContent: { flex: 1 },
  bannerTitle: {
    fontFamily: Typography.fontBold,
    fontSize: Typography.xl,
    color: Colors.white,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontFamily: Typography.fontRegular,
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: Spacing.md,
  },
  bannerBtn: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  bannerBtnText: {
    fontFamily: Typography.fontSemiBold,
    fontSize: Typography.sm,
    color: Colors.primary,
  },
  bannerIcon: { fontSize: 64, marginLeft: Spacing.base },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    marginBottom: Spacing.base,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.gray200 },
  dotActive: { width: 20, backgroundColor: Colors.primary },

  // Categories
  sectionTitle: {
    fontFamily: Typography.fontBold,
    fontSize: Typography.lg,
    color: Colors.gray900,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    marginTop: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.base,
    marginTop: Spacing.base,
  },
  seeAllText: {
    fontFamily: Typography.fontMedium,
    fontSize: Typography.sm,
    color: Colors.primary,
  },
  categoriesList: { paddingHorizontal: Spacing.base, gap: Spacing.sm },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
    marginRight: 4,
  },
  categoryEmoji: { fontSize: 16 },
  categoryName: {
    fontFamily: Typography.fontMedium,
    fontSize: Typography.sm,
    color: Colors.gray700,
  },
  categoryNameActive: { color: Colors.white },

  // Products Grid
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  gridCard: { width: (SCREEN_WIDTH - Spacing.sm * 3) / 2 },
  horizontalCard: { width: 180, marginRight: Spacing.sm },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', padding: Spacing['4xl'], width: '100%' },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.base },
  emptyTitle: {
    fontFamily: Typography.fontSemiBold,
    fontSize: Typography.lg,
    color: Colors.gray700,
  },
  emptySubtext: {
    fontFamily: Typography.fontRegular,
    fontSize: Typography.sm,
    color: Colors.gray400,
    marginTop: 4,
  },
});
