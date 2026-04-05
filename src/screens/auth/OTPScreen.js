// src/screens/auth/OTPScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { OtpInput } from 'react-native-otp-entry';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { doc, getDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../config/firebase';

const RESEND_TIMER = 30;

export default function OTPScreen({ route, navigation }) {
  const { verificationId, phone, role } = route.params;
  const { verifyOTP } = useAuth();
  const insets = useSafeAreaInsets();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_TIMER);
  const [canResend, setCanResend] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { setCanResend(true); clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async (code = otp) => {
    if (code.length !== 6) { shakeError(); return; }
    setLoading(true);
    try {
      const result = await verifyOTP(verificationId, code);
      if (!result.success) {
        shakeError();
        Alert.alert('Invalid OTP', 'Please check the code and try again.');
        setLoading(false);
        return;
      }

      const uid = result.user.uid;

      // Check if user exists
      const buyerDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
      const sellerDoc = await getDoc(doc(db, COLLECTIONS.SELLERS, uid));

      if (buyerDoc.exists() || sellerDoc.exists()) {
        // Existing user — navigation handled by AuthContext listener
      } else {
        // New user — go to onboarding
        if (role === 'seller') {
          navigation.replace('SellerOnboard', { uid, phone });
        } else {
          navigation.replace('BuyerOnboard', { uid, phone });
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const handleResend = () => {
    setTimer(RESEND_TIMER);
    setCanResend(false);
    Alert.alert('OTP Sent', `A new OTP has been sent to ${phone}`);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray800} />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Icon */}
          <LinearGradient colors={[Colors.primaryUltraLight, '#FFF'} style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>📱</Text>
          </LinearGradient>

          <Text style={styles.title}>Verify Your Number</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit OTP to{'\n'}
            <Text style={styles.phoneText}>{phone}</Text>
          </Text>

          {/* OTP Input */}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }], width: '100%' }}>
            <OtpInput
              numberOfDigits={6}
              onFilled={handleVerify}
              onTextChange={setOtp}
              focusColor={Colors.primary}
              theme={{
                containerStyle: styles.otpContainer,
                inputsContainerStyle: styles.otpInputsContainer,
                pinCodeContainerStyle: styles.pinBox,
                pinCodeTextStyle: styles.pinText,
                focusedPinCodeContainerStyle: styles.pinBoxFocused,
              }}
            />
          </Animated.View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.verifyBtn, (loading || otp.length < 6) && styles.verifyBtnDisabled]}
            onPress={() => handleVerify()}
            disabled={loading || otp.length < 6}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.verifyBtnText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive the OTP? </Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>Resend in {timer}s</Text>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  backBtn: { padding: Spacing.base },
  content: { flex: 1, paddingHorizontal: Spacing.xl, alignItems: 'center', paddingTop: Spacing.xl },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl,
  },
  iconEmoji: { fontSize: 44 },
  title: { fontFamily: Typography.fontBold, fontSize: Typography['2xl'], color: Colors.gray900, marginBottom: Spacing.sm },
  subtitle: { fontFamily: Typography.fontRegular, fontSize: Typography.base, color: Colors.gray400, textAlign: 'center', lineHeight: 24, marginBottom: Spacing['2xl'] },
  phoneText: { fontFamily: Typography.fontBold, color: Colors.primary },
  otpContainer: { width: '100%', marginBottom: Spacing.xl },
  otpInputsContainer: { gap: Spacing.sm, justifyContent: 'center' },
  pinBox: {
    width: 46, height: 56, borderRadius: BorderRadius.lg, borderWidth: 1.5,
    borderColor: Colors.gray200, backgroundColor: Colors.gray50,
  },
  pinBoxFocused: { borderColor: Colors.primary, backgroundColor: Colors.primaryUltraLight },
  pinText: { fontFamily: Typography.fontBold, fontSize: Typography.xl, color: Colors.gray900 },
  verifyBtn: {
    width: '100%', backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl, paddingVertical: Spacing.md,
    alignItems: 'center', ...Shadows.primary, marginBottom: Spacing.lg,
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.white },
  resendRow: { flexDirection: 'row', alignItems: 'center' },
  resendText: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray400 },
  resendLink: { fontFamily: Typography.fontSemiBold, fontSize: Typography.sm, color: Colors.primary },
  timerText: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.gray400 },
});
