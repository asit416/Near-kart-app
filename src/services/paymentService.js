// src/services/paymentService.js
import RazorpayCheckout from 'react-native-razorpay';
import axios from 'axios';

// ⚠️ IMPORTANT: Never expose your Razorpay Key Secret in the client app!
// The Key Secret must ONLY be used on your backend server.
// Use your backend API to create orders.
const RAZORPAY_KEY_ID = 'rzp_live_XXXXXXXXXXXXXXXX'; // Replace with your key
const BACKEND_URL = 'https://your-backend.com'; // Replace with your backend URL

// ─── Create Razorpay Order (via backend) ────────────────────────────────────
export const createRazorpayOrder = async (amount, currency = 'INR', receipt = '') => {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/payment/create-order`, {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    });

    return { success: true, order: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ─── Open Razorpay Checkout ─────────────────────────────────────────────────
export const openRazorpayCheckout = async ({
  amount,
  orderId,
  userPhone,
  userName,
  userEmail,
  description = 'NearKart Order',
}) => {
  try {
    // First create order via backend
    const orderResult = await createRazorpayOrder(amount);
    if (!orderResult.success) {
      return { success: false, error: 'Failed to create payment order' };
    }

    const options = {
      description,
      image: 'https://your-logo-url.com/logo.png', // Your logo URL
      currency: 'INR',
      key: RAZORPAY_KEY_ID,
      amount: Math.round(amount * 100).toString(), // in paise
      order_id: orderResult.order.id,
      name: 'NearKart',
      prefill: {
        email: userEmail || '',
        contact: userPhone || '',
        name: userName || '',
      },
      theme: {
        color: '#FF6B35',
      },
      retry: {
        enabled: true,
        max_count: 3,
      },
      send_sms_hash: true,
    };

    const data = await RazorpayCheckout.open(options);

    // Verify payment on backend
    const verifyResult = await verifyPayment({
      razorpay_order_id: data.razorpay_order_id,
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_signature: data.razorpay_signature,
    });

    if (verifyResult.success) {
      return {
        success: true,
        paymentId: data.razorpay_payment_id,
        orderId: data.razorpay_order_id,
        signature: data.razorpay_signature,
      };
    } else {
      return { success: false, error: 'Payment verification failed' };
    }
  } catch (error) {
    if (error.code === 'PAYMENT_CANCELLED') {
      return { success: false, error: 'Payment cancelled by user' };
    }
    return { success: false, error: error.description || 'Payment failed' };
  }
};

// ─── Verify Payment (via backend) ──────────────────────────────────────────
export const verifyPayment = async (paymentData) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/payment/verify`, paymentData);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ─── Initiate Refund (via backend) ─────────────────────────────────────────
export const initiateRefund = async (paymentId, amount) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/payment/refund`, {
      paymentId,
      amount: Math.round(amount * 100),
    });
    return { success: true, refund: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
