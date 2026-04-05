// src/screens/buyer/CartScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';

export default function CartScreen({ navigation }) {
  const { items, subtotal, deliveryCharge, discount, total, itemCount,
    updateQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  if (items.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtext}>Add products from nearby shops to get started</Text>
        <TouchableOpacity
          style={styles.shopNowBtn}
          onPress={() => navigation.navigate('HomeTab')}
        >
          <Text style={styles.shopNowText}>Browse Products</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/80' }}
        style={styles.itemImage}
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemShop}>{item.sellerName}</Text>
        <View style={styles.itemFooter}>
          <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toLocaleString()}</Text>
          <View style={styles.qtyControl}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => item.quantity === 1
                ? Alert.alert('Remove item?', '', [
                    { text: 'Cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeFromCart(item.productId) },
                  ])
                : updateQuantity(item.productId, item.quantity - 1)
              }
            >
              <Ionicons name={item.quantity === 1 ? 'trash-outline' : 'remove'} size={16} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQuantity(item.productId, item.quantity + 1)}
              disabled={item.quantity >= item.stock}
            >
              <Ionicons name="add" size={16} color={item.quantity >= item.stock ? Colors.gray300 : Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Cart</Text>
        <Text style={styles.headerCount}>{itemCount} items</Text>
        <TouchableOpacity onPress={() => Alert.alert('Clear cart?', '', [
          { text: 'Cancel' },
          { text: 'Clear', style: 'destructive', onPress: clearCart },
        ])}>
          <Text style={styles.clearBtn}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Order Summary */}
      <View style={[styles.summaryCard, { paddingBottom: insets.bottom + Spacing.base }]}>
        <Text style={styles.summaryTitle}>Order Summary</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>₹{subtotal.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery</Text>
          <Text style={[styles.summaryValue, deliveryCharge === 0 && { color: Colors.accent }]}>
            {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
          </Text>
        </View>
        {discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={[styles.summaryValue, { color: Colors.accent }]}>-₹{discount}</Text>
          </View>
        )}
        {deliveryCharge > 0 && (
          <View style={styles.freeDeliveryHint}>
            <Ionicons name="information-circle" size={14} color={Colors.info} />
            <Text style={styles.freeDeliveryText}>
              Add ₹{(500 - subtotal).toLocaleString()} more for free delivery
            </Text>
          </View>
        )}

        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => {
            if (!user) {
              navigation.navigate('Login');
              return;
            }
            navigation.navigate('Checkout');
          }}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.checkoutGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },

  emptyContainer: { justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontFamily: Typography.fontBold, fontSize: Typography.xl, color: Colors.gray800 },
  emptySubtext: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray400, textAlign: 'center', paddingHorizontal: Spacing['2xl'] },
  shopNowBtn: { marginTop: Spacing.md, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.full },
  shopNowText: { color: Colors.white, fontFamily: Typography.fontSemiBold, fontSize: Typography.base },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  headerTitle: { fontFamily: Typography.fontBold, fontSize: Typography.xl, color: Colors.gray900, flex: 1 },
  headerCount: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray400, marginRight: Spacing.md },
  clearBtn: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.error },

  listContent: { padding: Spacing.base, gap: Spacing.sm },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
    gap: Spacing.md,
  },
  itemImage: { width: 80, height: 80, borderRadius: BorderRadius.md, backgroundColor: Colors.gray100 },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.gray800 },
  itemShop: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400, marginTop: 2 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  itemPrice: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.primary },

  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.gray100, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  qtyBtn: { padding: 2 },
  qtyText: { fontFamily: Typography.fontBold, fontSize: Typography.sm, color: Colors.gray800, minWidth: 18, textAlign: 'center' },

  separator: { height: Spacing.sm },

  summaryCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.base,
    ...Shadows.lg,
  },
  summaryTitle: { fontFamily: Typography.fontBold, fontSize: Typography.lg, color: Colors.gray900, marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  summaryLabel: { fontFamily: Typography.fontRegular, fontSize: Typography.base, color: Colors.gray500 },
  summaryValue: { fontFamily: Typography.fontMedium, fontSize: Typography.base, color: Colors.gray800 },
  freeDeliveryHint: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.info + '15', borderRadius: BorderRadius.sm, padding: Spacing.xs, marginBottom: Spacing.sm },
  freeDeliveryText: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.info, flex: 1 },
  divider: { height: 1, backgroundColor: Colors.gray100, marginVertical: Spacing.sm },
  totalLabel: { fontFamily: Typography.fontBold, fontSize: Typography.lg, color: Colors.gray900 },
  totalValue: { fontFamily: Typography.fontBold, fontSize: Typography.xl, color: Colors.primary },
  checkoutBtn: { marginTop: Spacing.md, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.primary },
  checkoutGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, gap: Spacing.sm },
  checkoutText: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.white },
});
