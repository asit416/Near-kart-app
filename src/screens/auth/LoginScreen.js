// src/screens/auth/LoginScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import app from '../../config/firebase';

const COUNTRY_CODE = '+91';

export default function LoginScreen({ navigation }) {
  const { sendOTP } = useAuth();
  const insets = useSafeAreaInsets();
  const recaptchaVerifier = useRef(null);

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('buyer'); // 'buyer' | 'seller'

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `${COUNTRY_CODE}${phone}`;
      const result = await sendOTP(fullPhone, recaptchaVerifier.current);

      if (result.success) {
        navigation.navigate('OTP', {
          verificationId: result.verificationId,
          phone: fullPhone,
          role: activeTab,
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Hero Section */}
        <LinearGradient
          colors={[Colors.primary, '#FF8C5A', '#FFAB7B']}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🛍️</Text>
            <Text style={styles.logoText}>NearKart</Text>
            <Text style={styles.logoTagline}>Your City. Your Store.</Text>
          </View>
        </LinearGradient>

        {/* Login Card */}
        <View style={[styles.card, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Text style={styles.cardTitle}>Welcome!</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue shopping locally</Text>

          {/* Role Toggle */}
          <View style={styles.roleToggle}>
            <TouchableOpacity
              style={[styles.roleTab, activeTab === 'buyer' && styles.roleTabActive]}
              onPress={() => setActiveTab('buyer')}
            >
              <Text style={styles.roleTabEmoji}>🛒</Text>
              <Text style={[styles.roleTabText, activeTab === 'buyer' && styles.roleTabTextActive]}>
                I'm a Buyer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleTab, activeTab === 'seller' && styles.roleTabActive]}
              onPress={() => setActiveTab('seller')}
            >
              <Text style={styles.roleTabEmoji}>🏪</Text>
              <Text style={[styles.roleTabText, activeTab === 'seller' && styles.roleTabTextActive]}>
                I'm a Seller
              </Text>
            </TouchableOpacity>
          </View>

          {/* Phone Input */}
          <View style={styles.phoneContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.countryCodeText}>{COUNTRY_CODE}</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="Enter mobile number"
              placeholderTextColor={Colors.gray400}
              keyboardType="phone-pad"
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={handleSendOTP}
            />
          </View>

          <TouchableOpacity
            style={[styles.otpBtn, loading && styles.otpBtnDisabled]}
            onPress={handleSendOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Text style={styles.otpBtnText}>Send OTP</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Login */}
          <TouchableOpacity style={styles.googleBtn}>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

          {/* Seller Benefits (for sellers) */}
          {activeTab === 'seller' && (
            <View style={styles.sellerBenefits}>
              <Text style={styles.benefitsTitle}>Why sell on NearKart?</Text>
              {[
                '✅ Reach local customers easily',
                '✅ Simple inventory management',
                '✅ Instant order notifications',
                '✅ Low commission (5% only)',
              ].map((b, i) => (
                <Text key={i} style={styles.benefitItem}>{b}</Text>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Firebase Recaptcha (required for phone auth) */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={app.options}
        attemptInvisibleVerification={true}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing['4xl'] },
  logoContainer: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  logoIcon: { fontSize: 56, marginBottom: Spacing.sm },
  logoText: { fontFamily: Typography.fontBold, fontSize: Typography['4xl'], color: Colors.white, letterSpacing: -1 },
  logoTagline: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: 'rgba(255,255,255,0.85)', marginTop: 4 },

  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    padding: Spacing.xl,
  },
  cardTitle: { fontFamily: Typography.fontBold, fontSize: Typography['2xl'], color: Colors.gray900 },
  cardSubtitle: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray400, marginTop: 4, marginBottom: Spacing.xl },

  roleToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.xl,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  roleTabActive: { backgroundColor: Colors.white, ...Shadows.sm },
  roleTabEmoji: { fontSize: 16 },
  roleTabText: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.gray400 },
  roleTabTextActive: { color: Colors.gray900 },

  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.gray50,
    marginBottom: Spacing.base,
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  flag: { fontSize: 18 },
  countryCodeText: { fontFamily: Typography.fontMedium, fontSize: Typography.base, color: Colors.gray800 },
  phoneInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Typography.fontRegular,
    fontSize: Typography.lg,
    color: Colors.gray800,
    letterSpacing: 1,
  },

  otpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    ...Shadows.primary,
  },
  otpBtnDisabled: { opacity: 0.7 },
  otpBtnText: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.white },

  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.gray200 },
  dividerText: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400 },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  googleIcon: { fontFamily: Typography.fontBold, fontSize: Typography.lg, color: '#4285F4' },
  googleBtnText: { fontFamily: Typography.fontMedium, fontSize: Typography.base, color: Colors.gray700 },

  terms: {
    textAlign: 'center',
    fontFamily: Typography.fontRegular,
    fontSize: Typography.xs,
    color: Colors.gray400,
    marginTop: Spacing.lg,
    lineHeight: 18,
  },
  termsLink: { color: Colors.primary },

  sellerBenefits: {
    backgroundColor: Colors.primaryUltraLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginTop: Spacing.xl,
  },
  benefitsTitle: { fontFamily: Typography.fontBold, fontSize: Typography.sm, color: Colors.primary, marginBottom: Spacing.sm },
  benefitItem: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.gray700, marginBottom: 4 },
});
