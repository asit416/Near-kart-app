// src/navigation/index.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../theme';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import BuyerOnboardScreen from '../screens/auth/BuyerOnboardScreen';
import SellerOnboardScreen from '../screens/auth/SellerOnboardScreen';

// Main Navigators
import BuyerNavigator from './BuyerNavigator';
import SellerNavigator from './SellerNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, userProfile, loading, role } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Auth Stack
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OTP" component={OTPScreen} />
            <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
            <Stack.Screen name="BuyerOnboard" component={BuyerOnboardScreen} />
            <Stack.Screen name="SellerOnboard" component={SellerOnboardScreen} />
          </>
        ) : role === 'seller' ? (
          <Stack.Screen name="SellerApp" component={SellerNavigator} />
        ) : (
          <Stack.Screen name="BuyerApp" component={BuyerNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
