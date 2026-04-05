// src/screens/buyer/OrderTrackingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows, STATUS_COLORS } from '../../theme';
import { subscribeToOrder } from '../../services/orderService';
import { format } from 'date-fns';

const ORDER_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: 'receipt-outline', description: 'Your order has been placed successfully' },
  { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline', description: 'Seller has accepted your order' },
  { key: 'packed', label: 'Packed', icon: 'cube-outline', description: 'Your order is packed and ready' },
  { key: 'out_for_delivery', label: 'On the Way', icon: 'bicycle-outline', description: 'Order is out for delivery' },
  { key: 'delivered', label: 'Delivered', icon: 'home-outline', description: 'Order delivered successfully' },
];

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const unsubscribe = subscribeToOrder(orderId, setOrder);
    return unsubscribe;
  }, [orderId]);

  useEffect(() => {
    // Pulse animation for active step
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const getStepIndex = (status) =>
    ORDER_STEPS.findIndex((s) => s.key === status);

  if (!order) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loading}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  const currentStepIndex = getStepIndex(order.status);
  const isCancelled = ['cancelled', 'rejected'].includes(order.status);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray800} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Track Order</Text>
          <Text style={styles.orderId}>#{order.orderId?.slice(-8).toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Status Banner */}
        <LinearGradient
          colors={isCancelled ? ['#FF4B4B', '#FF6B6B'] : [Colors.primary, Colors.primaryDark]}
          style={styles.statusBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Text style={styles.statusText}>
              {isCancelled ? '❌ Order Cancelled' : ORDER_STEPS[currentStepIndex]?.label || order.status}
            </Text>
          </View>
          <Text style={styles.statusEmoji}>
            {isCancelled ? '😔' : '🚀'}
          </Text>
        </LinearGradient>

        {/* Timeline */}
        {!isCancelled && (
          <View style={styles.timelineCard}>
            <Text style={styles.sectionTitle}>Order Progress</Text>
            {ORDER_STEPS.map((step, index) => {
              const isDone = index <= currentStepIndex;
              const isActive = index === currentStepIndex;
              const isLast = index === ORDER_STEPS.length - 1;

              return (
                <View key={step.key} style={styles.timelineRow}>
                  {/* Line */}
                  {!isLast && (
                    <View
                      style={[
                        styles.timelineLine,
                        { backgroundColor: isDone ? Colors.primary : Colors.gray200 },
                      ]}
                    />
                  )}

                  {/* Step circle */}
                  <Animated.View
                    style={[
                      styles.stepCircle,
                      isDone && styles.stepCircleDone,
                      isActive && {
                        transform: [{ scale: pulseAnim }],
                        shadowColor: Colors.primary,
                        shadowOpacity: 0.4,
                        shadowRadius: 8,
                        elevation: 6,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isDone ? 'checkmark' : step.icon}
                      size={16}
                      color={isDone ? Colors.white : Colors.gray400}
                    />
                  </Animated.View>

                  {/* Step info */}
                  <View style={styles.stepInfo}>
                    <Text style={[styles.stepLabel, isDone && styles.stepLabelDone]}>
                      {step.label}
                    </Text>
                    {isActive && (
                      <Text style={styles.stepDescription}>{step.description}</Text>
                    )}
                    {isActive && order.updatedAt?.toDate && (
                      <Text style={styles.stepTime}>
                        {format(order.updatedAt.toDate(), 'hh:mm a, dd MMM')}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items?.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Image
                source={{ uri: item.image || 'https://via.placeholder.com/60' }}
                style={styles.itemImage}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>₹{item.subtotal?.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>₹{order.subtotal?.toLocaleString()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery</Text>
            <Text style={[styles.priceValue, order.deliveryCharge === 0 && { color: Colors.accent }]}>
              {order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`}
            </Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>₹{order.total?.toLocaleString()}</Text>
          </View>
          <View style={styles.paymentMethod}>
            <Ionicons
              name={order.paymentMethod === 'cod' ? 'cash-outline' : 'card-outline'}
              size={16}
              color={Colors.gray500}
            />
            <Text style={styles.paymentText}>
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
            </Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.addressCard}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <Text style={styles.addressText}>
              {order.deliveryAddress?.fullAddress || order.deliveryAddress?.street}
            </Text>
          </View>
        </View>

        {/* Seller Info */}
        <View style={styles.sellerCard}>
          <Text style={styles.sectionTitle}>Seller</Text>
          <View style={styles.sellerRow}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>
                {order.sellerName?.[0]?.toUpperCase() || 'S'}
              </Text>
            </View>
            <View>
              <Text style={styles.sellerName}>{order.sellerName}</Text>
              <TouchableOpacity>
                <Text style={styles.contactSeller}>Contact Seller</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: Typography.fontBold, fontSize: Typography.lg, color: Colors.gray900 },
  orderId: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400 },

  statusBanner: {
    margin: Spacing.base,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: 'rgba(255,255,255,0.8)' },
  statusText: { fontFamily: Typography.fontBold, fontSize: Typography.lg, color: Colors.white, marginTop: 2 },
  statusEmoji: { fontSize: 36 },

  sectionTitle: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.gray800, marginBottom: Spacing.md },

  timelineCard: { backgroundColor: Colors.white, marginHorizontal: Spacing.base, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadows.sm, marginBottom: Spacing.sm },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.lg, position: 'relative' },
  timelineLine: { position: 'absolute', left: 15, top: 32, width: 2, height: 48, zIndex: 0 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepCircleDone: { backgroundColor: Colors.primary },
  stepInfo: { flex: 1, paddingTop: 4 },
  stepLabel: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.gray400 },
  stepLabelDone: { color: Colors.gray800 },
  stepDescription: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray500, marginTop: 2 },
  stepTime: { fontFamily: Typography.fontRegular, fontSize: 11, color: Colors.primary, marginTop: 2 },

  itemsCard: { backgroundColor: Colors.white, marginHorizontal: Spacing.base, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadows.sm, marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  itemImage: { width: 50, height: 50, borderRadius: BorderRadius.md, backgroundColor: Colors.gray100 },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.gray800 },
  itemQty: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400, marginTop: 2 },
  itemPrice: { fontFamily: Typography.fontBold, fontSize: Typography.sm, color: Colors.primary },

  pricingCard: { backgroundColor: Colors.white, marginHorizontal: Spacing.base, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadows.sm, marginBottom: Spacing.sm },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  priceLabel: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray500 },
  priceValue: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.gray800 },
  totalRow: { borderTopWidth: 1, borderColor: Colors.gray100, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  totalLabel: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.gray900 },
  totalValue: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.primary },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
  paymentText: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400 },

  addressCard: { backgroundColor: Colors.white, marginHorizontal: Spacing.base, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadows.sm, marginBottom: Spacing.sm },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  addressText: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray700, flex: 1, lineHeight: 20 },

  sellerCard: { backgroundColor: Colors.white, marginHorizontal: Spacing.base, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadows.sm, marginBottom: Spacing.sm },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryUltraLight, alignItems: 'center', justifyContent: 'center' },
  sellerAvatarText: { fontFamily: Typography.fontBold, fontSize: Typography.lg, color: Colors.primary },
  sellerName: { fontFamily: Typography.fontSemiBold, fontSize: Typography.sm, color: Colors.gray800 },
  contactSeller: { fontFamily: Typography.fontMedium, fontSize: Typography.xs, color: Colors.primary, marginTop: 2 },
});
