// src/services/orderService.js
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { sendOrderNotification } from './notificationService';

// ─── Commission Calculator ──────────────────────────────────────────────────
export const calculateCommission = (amount, commissionRate = 5) => {
  // Commission is percentage-based; minimum ₹10, maximum ₹50 per item
  const percentCommission = (amount * commissionRate) / 100;
  const commission = Math.max(10, Math.min(percentCommission, 50));
  return Math.round(commission * 100) / 100;
};

// ─── Place Order ────────────────────────────────────────────────────────────
export const placeOrder = async (orderData, cartItems, userId) => {
  try {
    const batch = writeBatch(db);
    const orderIds = [];

    // Group items by seller - one order per seller
    const itemsBySeller = cartItems.reduce((acc, item) => {
      if (!acc[item.sellerId]) acc[item.sellerId] = [];
      acc[item.sellerId].push(item);
      return acc;
    }, {});

    for (const [sellerId, items] of Object.entries(itemsBySeller)) {
      // Fetch seller's commission rate
      const sellerSnap = await getDoc(doc(db, COLLECTIONS.SELLERS, sellerId));
      const sellerData = sellerSnap.data();
      const commissionRate = sellerData?.commissionRate || 5;

      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      const commission = calculateCommission(subtotal, commissionRate);
      const sellerEarning = subtotal - commission;

      const orderRef = doc(collection(db, COLLECTIONS.ORDERS));
      const order = {
        orderId: orderRef.id,
        buyerId: userId,
        sellerId,
        sellerName: items[0].sellerName,
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          image: item.image,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
        })),
        subtotal,
        commission,
        commissionRate,
        sellerEarning,
        deliveryCharge: orderData.deliveryCharge || 0,
        discount: orderData.discount || 0,
        total: subtotal + (orderData.deliveryCharge || 0) - (orderData.discount || 0),
        paymentMethod: orderData.paymentMethod, // 'cod' | 'online'
        paymentStatus: orderData.paymentMethod === 'cod' ? 'pending' : 'paid',
        paymentId: orderData.paymentId || null,
        status: 'pending',
        statusHistory: [
          {
            status: 'pending',
            timestamp: new Date().toISOString(),
            message: 'Order placed successfully',
          },
        ],
        deliveryAddress: orderData.deliveryAddress,
        estimatedDelivery: orderData.estimatedDelivery || null,
        notes: orderData.notes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      batch.set(orderRef, order);
      orderIds.push(orderRef.id);

      // Update product stock and sold count
      for (const item of items) {
        const productRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
        batch.update(productRef, {
          stock: increment(-item.quantity),
          totalSold: increment(item.quantity),
        });
      }

      // Update seller stats
      const sellerRef = doc(db, COLLECTIONS.SELLERS, sellerId);
      batch.update(sellerRef, {
        totalOrders: increment(1),
      });
    }

    await batch.commit();

    // Send notifications to sellers
    for (const orderId of orderIds) {
      const orderSnap = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));
      if (orderSnap.exists()) {
        await sendOrderNotification(orderSnap.data());
      }
    }

    return { success: true, orderIds };
  } catch (error) {
    console.error('Place order error:', error);
    return { success: false, error: error.message };
  }
};

// ─── Update Order Status ────────────────────────────────────────────────────
export const updateOrderStatus = async (orderId, newStatus, message = '') => {
  try {
    const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return { success: false, error: 'Order not found' };

    const order = orderSnap.data();
    const statusMessage = message || getDefaultStatusMessage(newStatus);

    const updatedHistory = [
      ...(order.statusHistory || []),
      {
        status: newStatus,
        timestamp: new Date().toISOString(),
        message: statusMessage,
      },
    ];

    const updates = {
      status: newStatus,
      statusHistory: updatedHistory,
      updatedAt: serverTimestamp(),
    };

    // If delivered, update seller earnings
    if (newStatus === 'delivered') {
      await runTransaction(db, async (transaction) => {
        const sellerRef = doc(db, COLLECTIONS.SELLERS, order.sellerId);
        transaction.update(orderRef, updates);
        transaction.update(sellerRef, {
          totalEarnings: increment(order.sellerEarning),
        });

        // Record transaction
        const txRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
        transaction.set(txRef, {
          orderId,
          sellerId: order.sellerId,
          buyerId: order.buyerId,
          amount: order.subtotal,
          commission: order.commission,
          sellerEarning: order.sellerEarning,
          type: 'order_complete',
          createdAt: serverTimestamp(),
        });
      });
    } else {
      await updateDoc(orderRef, updates);
    }

    // Notify buyer of status change
    await sendStatusUpdateNotification(order.buyerId, orderId, newStatus, statusMessage);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ─── Get Buyer Orders ───────────────────────────────────────────────────────
export const getBuyerOrders = async (buyerId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where('buyerId', '==', buyerId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    return [];
  }
};

// ─── Get Seller Orders ──────────────────────────────────────────────────────
export const getSellerOrders = async (sellerId, statusFilter = null) => {
  try {
    let q = query(
      collection(db, COLLECTIONS.ORDERS),
      where('sellerId', '==', sellerId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    if (statusFilter) {
      q = query(
        collection(db, COLLECTIONS.ORDERS),
        where('sellerId', '==', sellerId),
        where('status', '==', statusFilter),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    return [];
  }
};

// ─── Real-time Order Listener ───────────────────────────────────────────────
export const subscribeToOrder = (orderId, callback) => {
  return onSnapshot(doc(db, COLLECTIONS.ORDERS, orderId), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    }
  });
};

// ─── Subscribe to Seller's New Orders ──────────────────────────────────────
export const subscribeToSellerOrders = (sellerId, callback) => {
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    where('sellerId', '==', sellerId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(orders);
  });
};

// ─── Cancel Order ───────────────────────────────────────────────────────────
export const cancelOrder = async (orderId, reason = '') => {
  try {
    const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return { success: false, error: 'Order not found' };

    const order = orderSnap.data();
    if (!['pending', 'confirmed'].includes(order.status)) {
      return { success: false, error: 'Order cannot be cancelled at this stage' };
    }

    await runTransaction(db, async (transaction) => {
      // Restore product stock
      for (const item of order.items) {
        const productRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
        transaction.update(productRef, {
          stock: increment(item.quantity),
          totalSold: increment(-item.quantity),
        });
      }

      // Update order
      transaction.update(orderRef, {
        status: 'cancelled',
        cancelReason: reason,
        statusHistory: [
          ...(order.statusHistory || []),
          {
            status: 'cancelled',
            timestamp: new Date().toISOString(),
            message: reason || 'Order cancelled by buyer',
          },
        ],
        updatedAt: serverTimestamp(),
      });
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ─── Get Admin Stats ────────────────────────────────────────────────────────
export const getAdminStats = async () => {
  try {
    const ordersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
    const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
    const sellersSnap = await getDocs(collection(db, COLLECTIONS.SELLERS));
    const productsSnap = await getDocs(
      query(collection(db, COLLECTIONS.PRODUCTS), where('isActive', '==', true))
    );

    const orders = ordersSnap.docs.map((d) => d.data());
    const totalRevenue = orders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.commission || 0), 0);

    const todayOrders = orders.filter((o) => {
      const created = o.createdAt?.toDate?.();
      if (!created) return false;
      const today = new Date();
      return (
        created.getDate() === today.getDate() &&
        created.getMonth() === today.getMonth() &&
        created.getFullYear() === today.getFullYear()
      );
    });

    return {
      totalUsers: usersSnap.size,
      totalSellers: sellersSnap.size,
      totalProducts: productsSnap.size,
      totalOrders: ordersSnap.size,
      totalRevenue: Math.round(totalRevenue),
      todayOrders: todayOrders.length,
      pendingOrders: orders.filter((o) => o.status === 'pending').length,
      deliveredOrders: orders.filter((o) => o.status === 'delivered').length,
    };
  } catch (error) {
    console.error('Admin stats error:', error);
    return {};
  }
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const getDefaultStatusMessage = (status) => {
  const messages = {
    confirmed: 'Your order has been confirmed by the seller',
    packed: 'Your order is packed and ready for delivery',
    out_for_delivery: 'Your order is out for delivery',
    delivered: 'Your order has been delivered successfully',
    cancelled: 'Your order has been cancelled',
    rejected: 'Your order has been rejected by the seller',
  };
  return messages[status] || 'Order status updated';
};

const sendStatusUpdateNotification = async (buyerId, orderId, status, message) => {
  // This would be handled via FCM through Cloud Functions
  console.log(`Notifying buyer ${buyerId} about order ${orderId}: ${status}`);
};
