// firebase/functions/index.js
// Deploy with: firebase deploy --only functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Razorpay = require('razorpay');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

// ─── Razorpay Setup ─────────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: functions.config().razorpay.key_id,
  key_secret: functions.config().razorpay.key_secret,
});

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// Create Razorpay Order
exports.createRazorpayOrder = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  try {
    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: receipt || `rcp_${Date.now()}`,
      payment_capture: 1,
    });

    res.json(order);
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify Payment Signature
exports.verifyPayment = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const secret = functions.config().razorpay.key_secret;
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      res.json({ verified: true });
    } else {
      res.status(400).json({ verified: false, error: 'Invalid signature' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initiate Refund
exports.initiateRefund = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  try {
    const { paymentId, amount, reason = 'Order cancelled' } = req.body;
    const refund = await razorpay.payments.refund(paymentId, {
      amount,
      notes: { reason },
    });
    res.json(refund);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

// Send push notification when a new order is placed
exports.onNewOrder = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();

    try {
      // Get seller's FCM token
      const sellerDoc = await db.collection('sellers').doc(order.sellerId).get();
      const seller = sellerDoc.data();

      if (seller?.fcmToken) {
        await admin.messaging().send({
          token: seller.fcmToken,
          notification: {
            title: '🛒 New Order Received!',
            body: `${order.items?.length} item(s) • ₹${order.total} from a nearby customer`,
          },
          data: {
            type: 'new_order',
            orderId: context.params.orderId,
          },
          android: {
            notification: {
              channelId: 'orders',
              priority: 'high',
              sound: 'default',
            },
          },
        });
      }

      // Create notification record for seller
      await db.collection('notifications').add({
        userId: order.sellerId,
        userType: 'seller',
        title: '🛒 New Order!',
        body: `Order #${context.params.orderId.slice(-8).toUpperCase()} received`,
        type: 'new_order',
        orderId: context.params.orderId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('New order notification error:', error);
    }
  });

// Send push notification when order status changes
exports.onOrderStatusUpdate = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status) return; // No status change

    try {
      // Get buyer's FCM token
      const buyerDoc = await db.collection('users').doc(after.buyerId).get();
      const buyer = buyerDoc.data();

      const statusMessages = {
        confirmed: { title: '✅ Order Confirmed', body: 'Seller has confirmed your order' },
        packed: { title: '📦 Order Packed', body: 'Your order is packed and ready for pickup' },
        out_for_delivery: { title: '🚴 Out for Delivery', body: 'Your order is on the way!' },
        delivered: { title: '🎉 Order Delivered!', body: 'Your order has been delivered. Enjoy!' },
        cancelled: { title: '❌ Order Cancelled', body: 'Your order has been cancelled' },
        rejected: { title: '❌ Order Rejected', body: 'Seller has rejected your order' },
      };

      const msg = statusMessages[after.status];
      if (!msg) return;

      if (buyer?.fcmToken) {
        await admin.messaging().send({
          token: buyer.fcmToken,
          notification: { title: msg.title, body: msg.body },
          data: {
            type: 'order_status',
            orderId: context.params.orderId,
            status: after.status,
          },
        });
      }

      // Create notification record
      await db.collection('notifications').add({
        userId: after.buyerId,
        userType: 'buyer',
        title: msg.title,
        body: msg.body,
        type: 'order_status',
        orderId: context.params.orderId,
        status: after.status,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Order status notification error:', error);
    }
  });

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// Update commission rate for all or specific seller
exports.updateCommissionRate = functions.https.onCall(async (data, context) => {
  // Only admin can call this
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

  const adminDoc = await db.collection('users').doc(context.auth.uid).get();
  if (adminDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }

  const { sellerId, rate } = data;

  if (sellerId) {
    // Update specific seller
    await db.collection('sellers').doc(sellerId).update({ commissionRate: rate });
  } else {
    // Update all sellers
    const sellers = await db.collection('sellers').get();
    const batch = db.batch();
    sellers.docs.forEach((doc) => {
      batch.update(doc.ref, { commissionRate: rate });
    });
    await batch.commit();

    // Update global settings
    await db.collection('settings').doc('commission').set({ rate, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  }

  return { success: true };
});

// Ban/Unban User or Seller
exports.banUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

  const adminDoc = await db.collection('users').doc(context.auth.uid).get();
  if (adminDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }

  const { userId, userType, banned } = data;
  const collection = userType === 'seller' ? 'sellers' : 'users';

  await db.collection(collection).doc(userId).update({
    isBanned: banned,
    bannedAt: banned ? admin.firestore.FieldValue.serverTimestamp() : null,
  });

  // Disable Firebase Auth account
  await admin.auth().updateUser(userId, { disabled: banned });

  return { success: true };
});

// Get Admin Dashboard Stats
exports.getAdminStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

  const [usersSnap, sellersSnap, ordersSnap, productsSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('sellers').get(),
    db.collection('orders').get(),
    db.collection('products').where('isActive', '==', true).get(),
  ]);

  const orders = ordersSnap.docs.map((d) => d.data());
  const delivered = orders.filter((o) => o.status === 'delivered');
  const totalRevenue = delivered.reduce((s, o) => s + (o.commission || 0), 0);

  // Revenue by day (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toDateString(),
      label: `${d.getDate()}/${d.getMonth() + 1}`,
    };
  });

  const revenueData = last30Days.map((day) => ({
    date: day.label,
    revenue: delivered
      .filter((o) => o.createdAt?.toDate?.()?.toDateString() === day.date)
      .reduce((s, o) => s + (o.commission || 0), 0),
    orders: orders
      .filter((o) => o.createdAt?.toDate?.()?.toDateString() === day.date).length,
  }));

  return {
    totalUsers: usersSnap.size,
    totalSellers: sellersSnap.size,
    totalProducts: productsSnap.size,
    totalOrders: ordersSnap.size,
    totalRevenue: Math.round(totalRevenue),
    revenueData,
    pendingOrders: orders.filter((o) => o.status === 'pending').length,
    deliveredOrders: delivered.length,
    cancelledOrders: orders.filter((o) => o.status === 'cancelled').length,
  };
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTOMATED TASKS
// ═══════════════════════════════════════════════════════════════════════════

// Auto-cancel orders pending for more than 1 hour (seller didn't respond)
exports.autoCancelPendingOrders = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const pendingOrders = await db.collection('orders')
      .where('status', '==', 'pending')
      .where('createdAt', '<=', oneHourAgo)
      .get();

    const batch = db.batch();
    pendingOrders.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'cancelled',
        cancelReason: 'Auto-cancelled: Seller did not respond within 1 hour',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    if (!pendingOrders.empty) {
      await batch.commit();
      console.log(`Auto-cancelled ${pendingOrders.size} pending orders`);
    }
  });

// Daily analytics snapshot
exports.dailyAnalyticsSnapshot = functions.pubsub
  .schedule('every day 00:00')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const ordersSnap = await db.collection('orders')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(new Date(dateStr)))
      .get();

    const orders = ordersSnap.docs.map((d) => d.data());
    const revenue = orders
      .filter((o) => o.status === 'delivered')
      .reduce((s, o) => s + (o.commission || 0), 0);

    await db.collection('analytics').doc(dateStr).set({
      date: dateStr,
      totalOrders: orders.length,
      deliveredOrders: orders.filter((o) => o.status === 'delivered').length,
      cancelledOrders: orders.filter((o) => o.status === 'cancelled').length,
      revenue: Math.round(revenue),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
