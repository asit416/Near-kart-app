// src/screens/seller/SellerDashboard.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  getSellerOrders,
  updateOrderStatus,
  subscribeToSellerOrders,
} from '../../services/orderService';
import { Colors, Typography, Spacing, BorderRadius, Shadows, STATUS_COLORS } from '../../theme';
import { format } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STAT_CARDS = (profile, orders) => [
  {
    label: "Today's Orders",
    value: orders.filter((o) => {
      const d = o.createdAt?.toDate?.();
      return d && new Date().toDateString() === d.toDateString();
    }).length,
    icon: 'receipt-outline',
    color: Colors.info,
    bg: '#EFF6FF',
  },
  {
    label: 'Pending',
    value: orders.filter((o) => o.status === 'pending').length,
    icon: 'time-outline',
    color: Colors.warning,
    bg: Colors.warningLight,
  },
  {
    label: 'Total Orders',
    value: profile?.totalOrders || 0,
    icon: 'bag-outline',
    color: Colors.primary,
    bg: Colors.primaryUltraLight,
  },
  {
    label: 'Earnings',
    value: `₹${(profile?.totalEarnings || 0).toLocaleString()}`,
    icon: 'cash-outline',
    color: Colors.accent,
    bg: Colors.successLight,
  },
];

export default function SellerDashboard({ navigation }) {
  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
    // Real-time listener for new pending orders
    const unsubscribe = subscribeToSellerOrders(userProfile?.uid, (newOrders) => {
      setPendingOrders(newOrders);
    });
    return unsubscribe;
  }, [userProfile?.uid]);

  const fetchOrders = async () => {
    if (!userProfile?.uid) return;
    setLoading(true);
    const result = await getSellerOrders(userProfile.uid);
    setOrders(result);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleOrderAction = async (orderId, action) => {
    const newStatus = action === 'accept' ? 'confirmed' : 'rejected';
    const message = action === 'accept' ? 'Order confirmed' : 'Order rejected by seller';
    const result = await updateOrderStatus(orderId, newStatus, message);
    if (result.success) {
      fetchOrders();
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) fetchOrders();
    else Alert.alert('Error', result.error);
  };

  // Chart data (last 7 days)
  const getLast7DaysData = () => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const labels = days.map((d) => format(d, 'dd'));
    const data = days.map((d) =>
      orders.filter((o) => {
        const created = o.createdAt?.toDate?.();
        return created && created.toDateString() === d.toDateString();
      }).length
    );
    return { labels, data };
  };

  const chartData = getLast7DaysData();

  const renderPendingOrder = ({ item }) => (
    <View style={styles.pendingCard}>
      <View style={styles.pendingHeader}>
        <Text style={styles.pendingOrderId}>#{item.orderId?.slice(-8).toUpperCase()}</Text>
        <Text style={styles.pendingTime}>
          {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'hh:mm a') : ''}
        </Text>
      </View>
      <Text style={styles.pendingItems}>
        {item.items?.length} item(s) • ₹{item.total?.toLocaleString()}
      </Text>
      <Text style={styles.pendingAddress} numberOfLines={1}>
        📍 {item.deliveryAddress?.fullAddress || item.deliveryAddress?.street}
      </Text>
      <View style={styles.pendingActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => handleOrderAction(item.orderId, 'reject')}
        >
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.acceptBtn]}
          onPress={() => handleOrderAction(item.orderId, 'accept')}
        >
          <Text style={styles.acceptBtnText}>Accept Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActiveOrder = ({ item }) => {
    const nextStatuses = {
      confirmed: { label: 'Mark as Packed', next: 'packed' },
      packed: { label: 'Out for Delivery', next: 'out_for_delivery' },
      out_for_delivery: { label: 'Mark Delivered', next: 'delivered' },
    };
    const nextAction = nextStatuses[item.status];

    return (
      <View style={styles.activeOrderCard}>
        <View style={styles.activeOrderHeader}>
          <View>
            <Text style={styles.activeOrderId}>#{item.orderId?.slice(-8).toUpperCase()}</Text>
            <Text style={styles.activeOrderTime}>
              {item.items?.length} items • ₹{item.total?.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
              {item.status.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        {nextAction && (
          <TouchableOpacity
            style={styles.updateStatusBtn}
            onPress={() => handleStatusUpdate(item.orderId, nextAction.next)}
          >
            <Text style={styles.updateStatusText}>{nextAction.label}</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const activeOrders = orders.filter((o) => ['confirmed', 'packed', 'out_for_delivery'].includes(o.status));
  const stats = STAT_CARDS(userProfile, orders);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.secondary, '#3D4351']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View>
          <Text style={styles.headerGreeting}>Welcome back,</Text>
          <Text style={styles.headerShopName}>{userProfile?.shopName || 'My Shop'}</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.white} />
          {pendingOrders.length > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{pendingOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: stat.bg }]}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Commission Info */}
        <View style={styles.commissionCard}>
          <Ionicons name="information-circle" size={18} color={Colors.info} />
          <Text style={styles.commissionText}>
            Commission: <Text style={{ fontFamily: Typography.fontBold }}>
              {userProfile?.commissionRate || 5}%
            </Text> per order (auto-deducted from earnings)
          </Text>
        </View>

        {/* New Order Alert */}
        {pendingOrders.length > 0 && (
          <View style={styles.alertBanner}>
            <View style={styles.alertDot} />
            <Text style={styles.alertText}>
              🔔 {pendingOrders.length} new order{pendingOrders.length > 1 ? 's' : ''} waiting!
            </Text>
          </View>
        )}

        {/* Pending Orders */}
        {pendingOrders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏳ New Orders</Text>
            <FlatList
              horizontal
              data={pendingOrders}
              renderItem={renderPendingOrder}
              keyExtractor={(item) => item.orderId}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: Spacing.md }}
            />
          </View>
        )}

        {/* Revenue Chart */}
        {orders.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>📈 Orders Last 7 Days</Text>
            <LineChart
              data={{
                labels: chartData.labels,
                datasets: [{ data: chartData.data.length > 0 ? chartData.data : [0] }],
              }}
              width={SCREEN_WIDTH - Spacing.base * 2 - Spacing.base * 2}
              height={180}
              chartConfig={{
                backgroundColor: Colors.white,
                backgroundGradientFrom: Colors.white,
                backgroundGradientTo: Colors.white,
                decimalPlaces: 0,
                color: () => Colors.primary,
                labelColor: () => Colors.gray400,
                propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.primary },
              }}
              bezier
              style={{ borderRadius: BorderRadius.md }}
            />
          </View>
        )}

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚀 Active Orders</Text>
            <View style={{ paddingHorizontal: Spacing.base, gap: Spacing.sm }}>
              {activeOrders.map((order) => renderActiveOrder({ item: order }))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate('AddProduct')}
          >
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.quickActionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="add-circle" size={24} color={Colors.white} />
              <Text style={styles.quickActionText}>Add Product</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate('ManageOrders')}
          >
            <View style={[styles.quickActionGradient, { backgroundColor: Colors.gray100 }]}>
              <Ionicons name="list" size={24} color={Colors.gray700} />
              <Text style={[styles.quickActionText, { color: Colors.gray700 }]}>All Orders</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate('MyProducts')}
          >
            <View style={[styles.quickActionGradient, { backgroundColor: Colors.gray100 }]}>
              <Ionicons name="cube" size={24} color={Colors.gray700} />
              <Text style={[styles.quickActionText, { color: Colors.gray700 }]}>Products</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
  },
  headerGreeting: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: 'rgba(255,255,255,0.7)' },
  headerShopName: { fontFamily: Typography.fontBold, fontSize: Typography.xl, color: Colors.white },
  notifBtn: { position: 'relative', padding: 6 },
  notifBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: Colors.error, borderRadius: 10,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  notifBadgeText: { color: Colors.white, fontSize: 10, fontFamily: Typography.fontBold },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    padding: Spacing.base,
  },
  statCard: {
    width: '48%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  statValue: { fontFamily: Typography.fontBold, fontSize: Typography['2xl'] },
  statLabel: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray500, marginTop: 2 },

  commissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.info + '15',
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  commissionText: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.info, flex: 1 },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warning + '20',
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning },
  alertText: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.warning },

  section: { marginBottom: Spacing.base },
  sectionTitle: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.gray800, paddingHorizontal: Spacing.base, marginBottom: Spacing.sm },

  pendingCard: {
    width: 280,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pendingOrderId: { fontFamily: Typography.fontBold, fontSize: Typography.sm, color: Colors.gray900 },
  pendingTime: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400 },
  pendingItems: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.gray700 },
  pendingAddress: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400, marginTop: 4 },
  pendingActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  actionBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, alignItems: 'center' },
  rejectBtn: { backgroundColor: Colors.errorLight },
  acceptBtn: { backgroundColor: Colors.primary },
  rejectBtnText: { fontFamily: Typography.fontSemiBold, fontSize: Typography.sm, color: Colors.error },
  acceptBtnText: { fontFamily: Typography.fontSemiBold, fontSize: Typography.sm, color: Colors.white },

  chartCard: {
    backgroundColor: Colors.white,
    margin: Spacing.base,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    ...Shadows.sm,
  },

  activeOrderCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  activeOrderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  activeOrderId: { fontFamily: Typography.fontBold, fontSize: Typography.sm, color: Colors.gray900 },
  activeOrderTime: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontFamily: Typography.fontBold, fontSize: 10 },
  updateStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
  },
  updateStatusText: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.primary },

  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  quickActionBtn: { flex: 1, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.sm },
  quickActionGradient: { padding: Spacing.md, alignItems: 'center', gap: Spacing.xs },
  quickActionText: { fontFamily: Typography.fontSemiBold, fontSize: Typography.xs, color: Colors.white, textAlign: 'center' },
});
