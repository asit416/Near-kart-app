// src/services/notificationService.js
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';

// ─── Configure notification handler ─────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Register for Push Notifications ────────────────────────────────────────
export const registerForPushNotifications = async (userId, userType = 'buyer') => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'YOUR_EAS_PROJECT_ID', // from app.json
    });

    const token = tokenData.data;

    // Save token to Firestore
    const collection = userType === 'seller' ? COLLECTIONS.SELLERS : COLLECTIONS.USERS;
    await updateDoc(doc(db, collection, userId), { fcmToken: token });

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Order Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
      });
    }

    return token;
  } catch (error) {
    console.error('Push registration error:', error);
    return null;
  }
};

// ─── Send Order Notification (called from Cloud Functions) ──────────────────
export const sendOrderNotification = async (orderData) => {
  // This is called locally to trigger the Cloud Function
  // Actual FCM sending is done server-side via Firebase Cloud Functions
  console.log('Order notification trigger:', orderData.orderId);
};

// ─── Local Notification (for testing without backend) ───────────────────────
export const sendLocalNotification = async (title, body, data = {}) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null, // Immediate
  });
};

// ─── Listen to Notifications ─────────────────────────────────────────────────
export const addNotificationListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};
