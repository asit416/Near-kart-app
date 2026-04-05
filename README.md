# 🛍️ NearKart
## *Your City. Your Store.*

A **production-ready local e-commerce marketplace** connecting buyers with nearby sellers — complete with commission monetization, real-time order tracking, and a full admin panel.

---

## ✨ Features at a Glance

### 🛒 Buyer App
| Feature | Status |
|---------|--------|
| Phone OTP + Google Login | ✅ |
| GPS-based location detection | ✅ |
| Browse nearby products by category | ✅ |
| Search products | ✅ |
| Add to cart with quantity control | ✅ |
| Wishlist | ✅ |
| Cash on Delivery | ✅ |
| UPI / Online Payment (Razorpay) | ✅ |
| Real-time order tracking (5 stages) | ✅ |
| Order history | ✅ |
| Ratings & reviews | ✅ |
| Push notifications | ✅ |

### 🏪 Seller App
| Feature | Status |
|---------|--------|
| Shop registration & onboarding | ✅ |
| Add/Edit/Delete products with images | ✅ |
| Live dashboard (orders, earnings) | ✅ |
| Accept/Reject orders | ✅ |
| Update order status | ✅ |
| Earnings after commission deduction | ✅ |
| Real-time new order alerts | ✅ |
| Sales chart (7-day view) | ✅ |

### 💰 Monetization
| Feature | Status |
|---------|--------|
| Auto-deduct commission per order | ✅ |
| Configurable rate (% or fixed) | ✅ |
| Admin can change commission anytime | ✅ |
| Commission shown to sellers | ✅ |
| Full transaction ledger | ✅ |

### 🛠️ Admin Panel
| Feature | Status |
|---------|--------|
| Total users, sellers, orders, revenue | ✅ |
| Manage & ban/unban users + sellers | ✅ |
| Remove products | ✅ |
| Control commission rate | ✅ |
| All transactions view | ✅ |
| Dark mode UI | ✅ |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           NearKart System                │
├─────────────┬──────────────┬────────────┤
│  Buyer App  │  Seller App  │ Admin Web  │
│ (React Native/Expo)        │  (React)   │
└──────┬──────┴──────┬───────┴─────┬──────┘
       │             │             │
       └──────┬──────┘             │
              ▼                    ▼
     ┌─────────────────┐  ┌──────────────┐
     │    Firebase      │  │  Firebase    │
     │   Firestore     │  │  Hosting     │
     │   Auth          │  └──────────────┘
     │   Storage       │
     │   Functions     │──▶ Razorpay API
     │   Messaging     │──▶ SMS OTP
     └─────────────────┘
```

---

## 🚀 Quick Start

```bash
# Clone & install
git clone your-repo
cd nearkart
npm install

# Configure (see DEPLOYMENT.md)
# 1. Add Firebase config to src/config/firebase.js
# 2. Add google-services.json to root
# 3. Add Razorpay key to paymentService.js

# Run dev server
npx expo start

# Build APK for testing
eas build --platform android --profile preview
```

---

## 📁 File Structure

```
nearkart/
├── App.js                         # Entry point
├── app.json                       # Expo config
├── src/
│   ├── config/firebase.js         # Firebase setup
│   ├── context/
│   │   ├── AuthContext.js         # Auth state
│   │   └── CartContext.js         # Cart state
│   ├── navigation/
│   │   ├── index.js               # Root navigator
│   │   ├── BuyerNavigator.js      # Buyer tabs
│   │   └── SellerNavigator.js     # Seller tabs
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.js     # Phone + Google login
│   │   │   └── OTPScreen.js       # OTP verification
│   │   ├── buyer/
│   │   │   ├── HomeScreen.js      # Main feed
│   │   │   ├── CartScreen.js      # Shopping cart
│   │   │   ├── CheckoutScreen.js  # Payment & address
│   │   │   └── OrderTrackingScreen.js  # Live tracking
│   │   └── seller/
│   │       ├── SellerDashboard.js # Analytics + orders
│   │       ├── AddProductScreen.js # Product management
│   │       └── SellerEarningsScreen.js # Commission & earnings
│   ├── services/
│   │   ├── productService.js      # Product CRUD
│   │   ├── orderService.js        # Orders + commission
│   │   ├── paymentService.js      # Razorpay integration
│   │   └── notificationService.js # Push notifications
│   ├── components/
│   │   └── ProductCard.js         # Reusable product UI
│   └── theme/index.js             # Design system
├── firebase/
│   ├── functions/index.js         # Cloud Functions backend
│   ├── firestore.rules            # Database security
│   └── storage.rules              # Storage security
├── admin-panel/                   # Web admin dashboard
│   └── src/App.jsx
└── DEPLOYMENT.md                  # 📖 Step-by-step deploy guide
```

---

## 💡 Commission System

```
Order Value: ₹1,000
     │
     ├── Commission (5%): ₹50   → NearKart (App Owner) 💰
     │
     └── Seller Earning: ₹950  → Seller 🏪

Auto-credited when order marked as "Delivered"
Admin can change commission rate anytime from panel
```

---

*NearKart v1.0.0 — Ready for Play Store*
