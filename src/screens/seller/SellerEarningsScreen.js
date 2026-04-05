// src/screens/seller/SellerEarningsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getSellerOrders } from '../../services/orderService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SellerEarningsScreen({ navigation }) {
  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all'); // 'today' | 'week' | 'month' | 'all'

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    if (!userProfile?.uid) return;
    const result = await getSellerOrders(userProfile.uid, 'delivered');
    setOrders(result);
  };

  const filterOrders = (orderList) => {
    const now = new Date();
    return orderList.filter((o) => {
      const created = o.createdAt?.toDate?.();
      if (!created) return false;
      if (filter === 'today') return created.toDateString() === now.toDateString();
      if (filter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return created >= weekAgo;
      }
      if (filter === 'month') {
        return isWithinInterval(created, { start: startOfMonth(now), end: endOfMonth(now) });
      }
      return true;
    });
  };

  const filtered = filterOrders(orders);
  const totalRevenue = filtered.reduce((s, o) => s + (o.subtotal || 0), 0);
  const totalCommission = filtered.reduce((s, o) => s + (o.commission || 0), 0);
  const netEarnings = filtered.reduce((s, o) => s + (o.sellerEarning || 0), 0);

  // Bar chart - last 7 days earnings
  const getLast7Days = () => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return {
      labels: days.map((d) => format(d, 'dd')),
      datasets: [{
        data: days.map((d) =>
          orders
            .filter((o) => o.createdAt?.toDate?.()?.toDateString() === d.toDateString())
            .reduce((s, o) => s + (o.sellerEarning || 0), 0)
        ),
      }],
    };
  };

  const FILTERS = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#00C896', '#00A67E']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.headerTitle}>💰 Earnings</Text>
        <TouchableOpacity style={styles.helpBtn}>
          <Ionicons name="help-circle-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Lifetime Earnings */}
        <View style={styles.lifetimeCard}>
          <Text style={styles.lifetimeLabel}>Total Lifetime Earnings</Text>
          <Text style={styles.lifetimeValue}>₹{(userProfile?.totalEarnings || 0).toLocaleString()}</Text>
          <Text style={styles.lifetimeSubtext}>
            After {userProfile?.commissionRate || 5}% NearKart commission
          </Text>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: Spacing.sm }}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
              onPress={() => setFilter(f.id)}
            >
              <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stat Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: Colors.primaryUltraLight }]}>
            <Text style={styles.statIcon}>🛒</Text>
            <Text style={[styles.statValue, { color: Colors.primary }]}>₹{totalRevenue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Gross Sales</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: Colors.errorLight }]}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={[styles.statValue, { color: Colors.error }]}>₹{totalCommission.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Commission</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: Colors.successLight }]}>
            <Text style={styles.statIcon}>💵</Text>
            <Text style={[styles.statValue, { color: Colors.accent }]}>₹{netEarnings.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Net Earned</Text>
          </View>
        </View>

        {/* Commission Explainer */}
        <View style={styles.commissionCard}>
          <Text style={styles.commissionTitle}>How Commission Works</Text>
          <View style={styles.commissionRow}>
            <Text style={styles.commissionStep}>Order Value</Text>
            <Text style={styles.commissionValue}>₹1,000</Text>
          </View>
          <View style={styles.commissionRow}>
            <Text style={styles.commissionStep}>
              NearKart Commission ({userProfile?.commissionRate || 5}%)
            </Text>
            <Text style={[styles.commissionValue, { color: Colors.error }]}>
              - ₹{Math.round((userProfile?.commissionRate || 5) / 100 * 1000)}
            </Text>
          </View>
          <View style={[styles.commissionRow, styles.commissionTotal]}>
            <Text style={styles.commissionTotalLabel}>Your Earnings</Text>
            <Text style={[styles.commissionValue, { color: Colors.accent, fontFamily: Typography.fontBold }]}>
              ₹{Math.round((1 - (userProfile?.commissionRate || 5) / 100) * 1000)}
            </Text>
          </View>
          <Text style={styles.commissionNote}>
            ⚡ Earnings are credited after successful delivery
          </Text>
        </View>

        {/* Bar Chart */}
        {orders.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>📈 Earnings Last 7 Days</Text>
            <BarChart
              data={getLast7Days()}
              width={SCREEN_WIDTH - Spacing.base * 2 - Spacing.base * 2}
              height={200}
              chartConfig={{
                backgroundColor: Colors.white,
                backgroundGradientFrom: Colors.white,
                backgroundGradientTo: Colors.white,
                decimalPlaces: 0,
                color: () => Colors.accent,
                labelColor: () => Colors.gray400,
              }}
              style={{ borderRadius: BorderRadius.md }}
              showValuesOnTopOfBars
              fromZero
            />
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Recent Transactions ({filtered.length})</Text>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💸</Text>
              <Text style={styles.emptyText}>No transactions in this period</Text>
            </View>
          ) : (
            filtered.slice(0, 20).map((order, i) => (
              <View key={i} style={styles.transactionRow}>
                <View style={styles.txIcon}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txOrderId}>#{order.orderId?.slice(-8).toUpperCase()}</Text>
                  <Text style={styles.txDate}>
                    {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'dd MMM, hh:mm a') : ''}
                  </Text>
                </View>
                <View style={styles.txAmounts}>
                  <Text style={styles.txNet}>+₹{order.sellerEarning?.toLocaleString()}</Text>
                  <Text style={styles.txCommission}>
                    Commission: ₹{order.commission?.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.lg,
  },
  headerTitle: { fontFamily: Typography.fontBold, fontSize: Typography.xl, color: Colors.white },
  helpBtn: { padding: 4 },

  lifetimeCard: {
    backgroundColor: Colors.white, margin: Spacing.base,
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    alignItems: 'center', ...Shadows.md,
    borderTopWidth: 4, borderTopColor: Colors.accent,
  },
  lifetimeLabel: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray400 },
  lifetimeValue: { fontFamily: Typography.fontBold, fontSize: 42, color: Colors.accent, marginVertical: Spacing.sm },
  lifetimeSubtext: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400 },

  filterScroll: { marginBottom: Spacing.md },
  filterChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
  },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.gray500 },
  filterTextActive: { color: Colors.white },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.base, marginBottom: Spacing.md },
  statBox: { flex: 1, borderRadius: BorderRadius.xl, padding: Spacing.md, alignItems: 'center', ...Shadows.sm },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontFamily: Typography.fontBold, fontSize: Typography.md },
  statLabel: { fontFamily: Typography.fontRegular, fontSize: 10, color: Colors.gray500, marginTop: 2, textAlign: 'center' },

  commissionCard: {
    backgroundColor: Colors.white, marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadows.sm, marginBottom: Spacing.md,
  },
  commissionTitle: { fontFamily: Typography.fontBold, fontSize: Typography.sm, color: Colors.gray800, marginBottom: Spacing.md },
  commissionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  commissionStep: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray600 },
  commissionValue: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.gray800 },
  commissionTotal: { borderTopWidth: 1, borderColor: Colors.gray100, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  commissionTotalLabel: { fontFamily: Typography.fontBold, fontSize: Typography.sm, color: Colors.gray900 },
  commissionNote: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400, marginTop: Spacing.sm },

  chartCard: {
    backgroundColor: Colors.white, marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadows.sm, marginBottom: Spacing.md,
  },
  chartTitle: { fontFamily: Typography.fontBold, fontSize: Typography.sm, color: Colors.gray800, marginBottom: Spacing.md },

  transactionsSection: { paddingHorizontal: Spacing.base },
  sectionTitle: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.gray800, marginBottom: Spacing.md },

  emptyState: { alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 36, marginBottom: Spacing.sm },
  emptyText: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray400 },

  transactionRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  txIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txOrderId: { fontFamily: Typography.fontSemiBold, fontSize: Typography.sm, color: Colors.gray800 },
  txDate: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400, marginTop: 2 },
  txAmounts: { alignItems: 'flex-end' },
  txNet: { fontFamily: Typography.fontBold, fontSize: Typography.sm, color: Colors.accent },
  txCommission: { fontFamily: Typography.fontRegular, fontSize: 10, color: Colors.gray400, marginTop: 2 },
});
