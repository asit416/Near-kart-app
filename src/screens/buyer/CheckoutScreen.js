// src/screens/buyer/CheckoutScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { placeOrder } from '../../services/orderService';
import { openRazorpayCheckout } from '../../services/paymentService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: 'cash-outline', desc: 'Pay when you receive' },
  { id: 'upi', label: 'UPI / Online Pay', icon: 'qr-code-outline', desc: 'Razorpay (UPI, Cards, Net Banking)' },
];

export default function CheckoutScreen({ navigation }) {
  const { userProfile, user } = useAuth();
  const { items, subtotal, deliveryCharge, discount, total, clearCart } = useCart();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || user?.phoneNumber || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [placing, setPlacing] = useState(false);

  const validate = () => {
    if (!name.trim()) { Alert.alert('Error', 'Please enter your name'); return false; }
    if (!phone || phone.length < 10) { Alert.alert('Error', 'Please enter a valid phone number'); return false; }
    if (!address.trim()) { Alert.alert('Error', 'Please enter your delivery address'); return false; }
    if (!city.trim()) { Alert.alert('Error', 'Please enter your city'); return false; }
    if (!pincode || pincode.length !== 6) { Alert.alert('Error', 'Please enter a valid 6-digit pincode'); return false; }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validate()) return;
    setPlacing(true);

    try {
      let paymentId = null;

      // Handle online payment first
      if (paymentMethod === 'upi') {
        const payResult = await openRazorpayCheckout({
          amount: total,
          userPhone: phone,
          userName: name,
          userEmail: userProfile?.email || '',
          description: `NearKart Order - ${items.length} items`,
        });

        if (!payResult.success) {
          Alert.alert('Payment Failed', payResult.error || 'Payment was not completed');
          setPlacing(false);
          return;
        }
        paymentId = payResult.paymentId;
      }

      const deliveryAddress = {
        name,
        phone,
        street: address,
        city,
        pincode,
        fullAddress: `${address}, ${city} - ${pincode}`,
      };

      const result = await placeOrder(
        {
          paymentMethod: paymentMethod === 'upi' ? 'online' : 'cod',
          paymentId,
          deliveryAddress,
          deliveryCharge,
          discount,
          notes,
          estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        items,
        user.uid
      );

      if (result.success) {
        clearCart();
        navigation.replace('OrderSuccess', { orderIds: result.orderIds });
      } else {
        Alert.alert('Order Failed', result.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setPlacing(false);
    }
  };

  const InputRow = ({ label, value, onChange, placeholder, keyboardType = 'default', half = false }) => (
    <View style={[styles.inputGroup, half && { width: '48%' }]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.gray400}
        keyboardType={keyboardType}
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          <InputRow label="Full Name *" value={name} onChange={setName} placeholder="Your name" />
          <InputRow label="Phone *" value={phone} onChange={setPhone} placeholder="10-digit mobile" keyboardType="phone-pad" />
          <InputRow label="Street Address *" value={address} onChange={setAddress} placeholder="House no, Street, Area" />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputRow label="City *" value={city} onChange={setCity} placeholder="City" />
            </View>
            <View style={{ flex: 1 }}>
              <InputRow label="Pincode *" value={pincode} onChange={setPincode} placeholder="6-digit code" keyboardType="numeric" />
            </View>
          </View>
        </View>

        {/* Delivery Instructions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Delivery Instructions (Optional)</Text>
          </View>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Leave at door, Ring doorbell twice..."
            placeholderTextColor={Colors.gray400}
            multiline
          />
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[styles.paymentOption, paymentMethod === method.id && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod(method.id)}
            >
              <View style={[styles.paymentIconWrap, paymentMethod === method.id && { backgroundColor: Colors.primaryUltraLight }]}>
                <Ionicons name={method.icon} size={22} color={paymentMethod === method.id ? Colors.primary : Colors.gray500} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.paymentLabel, paymentMethod === method.id && { color: Colors.primary }]}>
                  {method.label}
                </Text>
                <Text style={styles.paymentDesc}>{method.desc}</Text>
              </View>
              <View style={[styles.radio, paymentMethod === method.id && styles.radioActive]}>
                {paymentMethod === method.id && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Order Summary ({items.length} items)</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.orderItem}>
              <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.orderItemQty}>×{item.quantity}</Text>
              <Text style={styles.orderItemPrice}>₹{(item.price * item.quantity).toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.divider} />
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
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.base }]}>
        <View style={styles.footerAmount}>
          <Text style={styles.footerAmountLabel}>Total</Text>
          <Text style={styles.footerAmountValue}>₹{total.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderBtn, placing && { opacity: 0.7 }]}
          onPress={handlePlaceOrder}
          disabled={placing}
        >
          {placing ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.placeOrderGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name={paymentMethod === 'upi' ? 'card' : 'cash'} size={18} color={Colors.white} />
              <Text style={styles.placeOrderText}>
                {paymentMethod === 'upi' ? 'Pay Now' : 'Place Order'}
              </Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.white, ...Shadows.sm,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: Typography.fontBold, fontSize: Typography.lg, color: Colors.gray900 },

  section: {
    backgroundColor: Colors.white, marginHorizontal: Spacing.base,
    marginTop: Spacing.md, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadows.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.gray800 },

  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontFamily: Typography.fontMedium, fontSize: Typography.xs, color: Colors.gray600, marginBottom: 5 },
  input: {
    backgroundColor: Colors.gray50, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.gray200,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray800,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },

  paymentOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.gray200, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.white,
  },
  paymentOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryUltraLight },
  paymentIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
  paymentLabel: { fontFamily: Typography.fontSemiBold, fontSize: Typography.sm, color: Colors.gray800 },
  paymentDesc: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.gray300, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },

  orderItem: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  orderItemName: { flex: 1, fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray700 },
  orderItemQty: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray400, marginHorizontal: Spacing.sm },
  orderItemPrice: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.gray800 },
  divider: { height: 1, backgroundColor: Colors.gray100, marginVertical: Spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  summaryLabel: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray500 },
  summaryValue: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.gray800 },
  totalLabel: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.gray900 },
  totalValue: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.primary },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, padding: Spacing.base,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, ...Shadows.lg,
  },
  footerAmount: { flex: 1 },
  footerAmountLabel: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400 },
  footerAmountValue: { fontFamily: Typography.fontBold, fontSize: Typography.xl, color: Colors.primary },
  placeOrderBtn: { flex: 2, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.primary },
  placeOrderGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  placeOrderText: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.white },
});
