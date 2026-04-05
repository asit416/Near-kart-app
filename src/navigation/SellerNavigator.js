// src/navigation/SellerNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadows } from '../theme';

import SellerDashboard from '../screens/seller/SellerDashboard';
import ManageOrdersScreen from '../screens/seller/ManageOrdersScreen';
import MyProductsScreen from '../screens/seller/MyProductsScreen';
import AddProductScreen from '../screens/seller/AddProductScreen';
import SellerProfileScreen from '../screens/seller/SellerProfileScreen';
import SellerEarningsScreen from '../screens/seller/SellerEarningsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={SellerDashboard} />
      <Stack.Screen name="ManageOrders" component={ManageOrdersScreen} />
      <Stack.Screen name="SellerEarnings" component={SellerEarningsScreen} />
    </Stack.Navigator>
  );
}

function ProductsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyProducts" component={MyProductsScreen} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
    </Stack.Navigator>
  );
}

export default function SellerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            DashboardTab: focused ? 'grid' : 'grid-outline',
            OrdersTab: focused ? 'receipt' : 'receipt-outline',
            ProductsTab: focused ? 'cube' : 'cube-outline',
            EarningsTab: focused ? 'cash' : 'cash-outline',
            SellerProfileTab: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardStack} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="OrdersTab" component={ManageOrdersScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="ProductsTab" component={ProductsStack} options={{ title: 'Products' }} />
      <Tab.Screen name="EarningsTab" component={SellerEarningsScreen} options={{ title: 'Earnings' }} />
      <Tab.Screen name="SellerProfileTab" component={SellerProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    ...Shadows.md,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontFamily: Typography.fontMedium,
    fontSize: 10,
    marginTop: 2,
  },
});
