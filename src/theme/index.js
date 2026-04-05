// src/theme/index.js
// NearKart Design System

export const Colors = {
  // Primary brand colors
  primary: '#FF6B35',       // Vibrant orange - energy, local commerce
  primaryDark: '#E55A28',
  primaryLight: '#FF8C5A',
  primaryUltraLight: '#FFF0EB',

  // Secondary
  secondary: '#1A1D23',     // Near-black
  secondaryLight: '#2D3139',

  // Accent
  accent: '#00C896',        // Green - success, money
  accentDark: '#00A67E',
  warning: '#FFB800',
  error: '#FF4B4B',
  info: '#3B82F6',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Dark mode
  darkBg: '#0F1117',
  darkCard: '#1A1D23',
  darkBorder: '#2D3139',
  darkText: '#E5E7EB',
  darkTextSecondary: '#9CA3AF',

  // Semantic
  success: '#00C896',
  successLight: '#E6FBF5',
  errorLight: '#FEE8E8',
  warningLight: '#FFF8E6',
};

export const Typography = {
  // Font families
  fontBold: 'Poppins-Bold',
  fontSemiBold: 'Poppins-SemiBold',
  fontMedium: 'Poppins-Medium',
  fontRegular: 'Poppins-Regular',
  fontLight: 'Poppins-Light',

  // Font sizes
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  primary: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};

// Light theme
export const LightTheme = {
  background: Colors.gray50,
  card: Colors.white,
  text: Colors.gray900,
  textSecondary: Colors.gray500,
  border: Colors.gray200,
  placeholder: Colors.gray400,
  inputBg: Colors.gray100,
  navBg: Colors.white,
  statusBar: 'dark-content',
};

// Dark theme
export const DarkTheme = {
  background: Colors.darkBg,
  card: Colors.darkCard,
  text: Colors.darkText,
  textSecondary: Colors.darkTextSecondary,
  border: Colors.darkBorder,
  placeholder: Colors.gray600,
  inputBg: Colors.darkCard,
  navBg: Colors.darkCard,
  statusBar: 'light-content',
};

export const CATEGORIES = [
  { id: 'all', name: 'All', icon: '🏪', color: '#FF6B35' },
  { id: 'food', name: 'Food', icon: '🍔', color: '#FF8C42' },
  { id: 'grocery', name: 'Grocery', icon: '🛒', color: '#00C896' },
  { id: 'clothing', name: 'Clothing', icon: '👕', color: '#7C3AED' },
  { id: 'electronics', name: 'Electronics', icon: '📱', color: '#3B82F6' },
  { id: 'furniture', name: 'Furniture', icon: '🛋️', color: '#8B5CF6' },
  { id: 'beauty', name: 'Beauty', icon: '💄', color: '#EC4899' },
  { id: 'pharmacy', name: 'Pharmacy', icon: '💊', color: '#10B981' },
  { id: 'books', name: 'Books', icon: '📚', color: '#F59E0B' },
  { id: 'sports', name: 'Sports', icon: '⚽', color: '#EF4444' },
  { id: 'toys', name: 'Toys', icon: '🧸', color: '#06B6D4' },
  { id: 'other', name: 'Other', icon: '📦', color: '#6B7280' },
];

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PACKED: 'packed',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
};

export const STATUS_COLORS = {
  pending: '#FFB800',
  confirmed: '#3B82F6',
  packed: '#8B5CF6',
  out_for_delivery: '#FF6B35',
  delivered: '#00C896',
  cancelled: '#FF4B4B',
  rejected: '#FF4B4B',
};
