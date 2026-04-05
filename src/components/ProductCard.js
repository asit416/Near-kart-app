// src/components/ProductCard.js
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product, onPress, style }) {
  const { addToCart, isInCart, getItemQuantity, updateQuantity, removeFromCart } = useCart();

  const inCart = isInCart(product.id);
  const qty = getItemQuantity(product.id);
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Product Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.images?.[0] || 'https://via.placeholder.com/200' }}
          style={styles.image}
          resizeMode="cover"
        />
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPercent}% OFF</Text>
          </View>
        )}
        {product.stock === 0 && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.info}>
        <Text style={styles.shopName} numberOfLines={1}>
          {product.sellerName || 'Local Shop'}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Rating */}
        {product.rating > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={Colors.warning} />
            <Text style={styles.rating}>{product.rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({product.totalRatings})</Text>
          </View>
        )}

        {/* Price Row */}
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>
              ₹{(product.discountPrice || product.price).toLocaleString()}
            </Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                ₹{product.price.toLocaleString()}
              </Text>
            )}
          </View>

          {/* Cart Button */}
          {product.stock > 0 ? (
            inCart ? (
              <View style={styles.qtyControl}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => qty === 1 ? removeFromCart(product.id) : updateQuantity(product.id, qty - 1)}
                >
                  <Ionicons name={qty === 1 ? 'trash-outline' : 'remove'} size={14} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{qty}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(product.id, qty + 1)}
                >
                  <Ionicons name="add" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => addToCart(product)}
              >
                <Ionicons name="add" size={18} color={Colors.white} />
              </TouchableOpacity>
            )
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 140, backgroundColor: Colors.gray100 },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    color: Colors.white,
    fontFamily: Typography.fontBold,
    fontSize: 10,
  },
  outOfStockOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: {
    color: Colors.white,
    fontFamily: Typography.fontBold,
    fontSize: Typography.sm,
  },
  info: { padding: Spacing.sm },
  shopName: {
    fontFamily: Typography.fontRegular,
    fontSize: Typography.xs,
    color: Colors.gray400,
    marginBottom: 2,
  },
  name: {
    fontFamily: Typography.fontMedium,
    fontSize: Typography.sm,
    color: Colors.gray800,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 3,
  },
  rating: {
    fontFamily: Typography.fontMedium,
    fontSize: 11,
    color: Colors.gray700,
  },
  ratingCount: {
    fontFamily: Typography.fontRegular,
    fontSize: 10,
    color: Colors.gray400,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  price: {
    fontFamily: Typography.fontBold,
    fontSize: Typography.md,
    color: Colors.primary,
  },
  originalPrice: {
    fontFamily: Typography.fontRegular,
    fontSize: Typography.xs,
    color: Colors.gray400,
    textDecorationLine: 'line-through',
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryUltraLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  qtyBtn: { padding: 2 },
  qtyText: {
    fontFamily: Typography.fontBold,
    fontSize: Typography.sm,
    color: Colors.primary,
    minWidth: 16,
    textAlign: 'center',
  },
});
