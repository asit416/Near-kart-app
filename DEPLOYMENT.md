# 🚀 NearKart — Complete Deployment Guide
## "Your City. Your Store."

---

## 📋 TABLE OF CONTENTS
1. [Project Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Firebase Setup](#firebase)
4. [App Configuration](#config)
5. [Build & Deploy Mobile App](#mobile)
6. [Deploy Admin Panel](#admin)
7. [Deploy Cloud Functions](#functions)
8. [Payment Gateway Setup (Razorpay)](#razorpay)
9. [Publish to Play Store](#playstore)
10. [Scale to Multiple Cities](#scale)
11. [Maintenance & Updates](#updates)
12. [Troubleshooting](#troubleshooting)

---

## 1. PROJECT OVERVIEW <a name="overview"></a>

```
nearkart/
├── App.js                    # React Native app entry
├── app.json                  # Expo config
├── package.json              # App dependencies
├── src/
│   ├── config/firebase.js    # Firebase config
│   ├── context/              # Global state (Auth, Cart)
│   ├── navigation/           # Screen routing
│   ├── screens/
│   │   ├── auth/             # Login, OTP, Onboard
│   │   ├── buyer/            # Home, Cart, Checkout, Orders
│   │   └── seller/           # Dashboard, Products, Earnings
│   ├── services/             # Firebase, Payment, Notification APIs
│   ├── components/           # Reusable UI components
│   └── theme/                # Colors, fonts, spacing
├── firebase/
│   ├── functions/index.js    # Cloud Functions (backend)
│   ├── firestore.rules       # Database security
│   └── storage.rules         # File storage security
└── admin-panel/              # Web admin dashboard (React)
```

**Tech Stack:**
- 📱 Mobile: React Native (Expo)
- 🔥 Backend: Firebase (Firestore, Auth, Storage, Functions)
- 💳 Payments: Razorpay
- 🌐 Admin: React (deployable to Firebase Hosting)

---

## 2. PREREQUISITES <a name="prerequisites"></a>

Install these before starting:

```bash
# Node.js (v18+)
https://nodejs.org

# Expo CLI
npm install -g expo-cli

# EAS CLI (for building APK/AAB)
npm install -g eas-cli

# Firebase CLI
npm install -g firebase-tools

# Git
https://git-scm.com
```

**Accounts Needed:**
- Google Account (for Firebase)
- Razorpay Account (for payments) → razorpay.com
- Expo Account (for building) → expo.dev
- Google Play Console (for publishing) → play.google.com/console

---

## 3. FIREBASE SETUP <a name="firebase"></a>

### Step 3.1 — Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project" → Name it "nearkart"
3. Enable Google Analytics → Click "Create project"

### Step 3.2 — Enable Authentication

1. Firebase Console → Authentication → Get Started
2. Sign-in methods → Enable:
   - ✅ **Phone** (for OTP login)
   - ✅ **Google** (for Google login)
3. For Phone auth, add your domain to authorized domains

### Step 3.3 — Create Firestore Database

1. Firebase Console → Firestore Database → Create database
2. Choose **Production mode** (rules are in `firebase/firestore.rules`)
3. Select region: **asia-south1** (Mumbai) for India

### Step 3.4 — Enable Storage

1. Firebase Console → Storage → Get started
2. Choose Production mode
3. Region: **asia-south1**

### Step 3.5 — Get Firebase Config

1. Firebase Console → Project Settings → Your Apps → Add App
2. Choose **Android** → Package name: `com.nearkart.app`
3. Download `google-services.json` → Place in `/nearkart/` (root)
4. Choose **Web** → Get the config object

Update `src/config/firebase.js`:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "nearkart-xxxx.firebaseapp.com",
  projectId: "nearkart-xxxx",
  storageBucket: "nearkart-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123",
};
```

### Step 3.6 — Deploy Security Rules

```bash
cd nearkart
firebase login
firebase init  # Choose: Firestore, Storage, Functions, Hosting
firebase deploy --only firestore:rules
firebase deploy --only storage
```

### Step 3.7 — Create Firestore Indexes

In Firebase Console → Firestore → Indexes, add:

| Collection | Fields | Query scope |
|------------|--------|-------------|
| products | isActive ASC, totalSold DESC | Collection |
| products | isActive ASC, category ASC, totalSold DESC | Collection |
| products | isActive ASC, views DESC | Collection |
| products | sellerId ASC, isActive ASC, createdAt DESC | Collection |
| orders | buyerId ASC, createdAt DESC | Collection |
| orders | sellerId ASC, createdAt DESC | Collection |
| orders | sellerId ASC, status ASC, createdAt DESC | Collection |

---

## 4. APP CONFIGURATION <a name="config"></a>

### Step 4.1 — Install Dependencies

```bash
cd nearkart
npm install

# Download Poppins fonts and place in assets/fonts/
# Download from: https://fonts.google.com/specimen/Poppins
# Files needed: Poppins-Regular.ttf, Poppins-Medium.ttf,
#               Poppins-SemiBold.ttf, Poppins-Bold.ttf, Poppins-Light.ttf
```

### Step 4.2 — Google Maps API Key

1. Go to https://console.cloud.google.com
2. Create/select project → Enable "Maps SDK for Android"
3. Create API Key → Restrict to Android app
4. Update `app.json`:
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
    }
  }
}
```

### Step 4.3 — Create EAS Project

```bash
eas login
eas build:configure
# This creates eas.json and updates app.json with projectId
```

---

## 5. BUILD & DEPLOY MOBILE APP <a name="mobile"></a>

### Step 5.1 — Test Locally

```bash
cd nearkart
npx expo start
# Press 'a' for Android emulator or scan QR code with Expo Go
```

### Step 5.2 — Build APK (for testing)

```bash
# Create eas.json first
cat > eas.json << 'EOF'
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
EOF

# Build APK for testing
eas build --platform android --profile preview
# ✅ EAS will provide a download link for the APK
```

### Step 5.3 — Build AAB (for Play Store)

```bash
eas build --platform android --profile production
# This creates a signed .aab file for Play Store submission
```

---

## 6. DEPLOY ADMIN PANEL <a name="admin"></a>

### Step 6.1 — Build Admin Panel

```bash
cd nearkart/admin-panel
npm install
npm run build
```

### Step 6.2 — Deploy to Firebase Hosting

```bash
# Initialize hosting
cd nearkart
firebase init hosting
# Public directory: admin-panel/build
# Single-page app: Yes

# Deploy
firebase deploy --only hosting
# Your admin panel will be at: https://nearkart-xxxx.web.app
```

### Step 6.3 — Create Admin User

In Firebase Console → Authentication:
1. Add user manually with email/password
2. In Firestore → users collection → create document:
```json
{
  "uid": "your-admin-uid",
  "role": "admin",
  "name": "NearKart Admin",
  "email": "admin@nearkart.com"
}
```

---

## 7. DEPLOY CLOUD FUNCTIONS <a name="functions"></a>

### Step 7.1 — Set Razorpay Secrets

```bash
firebase functions:config:set razorpay.key_id="rzp_live_XXXXXXXX"
firebase functions:config:set razorpay.key_secret="YOUR_SECRET"
```

### Step 7.2 — Deploy Functions

```bash
cd nearkart/firebase/functions
npm install
cd ../..
firebase deploy --only functions
```

### Step 7.3 — Test Functions

```bash
# Test Razorpay endpoint
curl -X POST https://YOUR_REGION-nearkart.cloudfunctions.net/createRazorpayOrder \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "currency": "INR"}'
```

Update `src/services/paymentService.js`:
```javascript
const BACKEND_URL = 'https://YOUR_REGION-nearkart.cloudfunctions.net';
```

---

## 8. RAZORPAY SETUP <a name="razorpay"></a>

### Step 8.1 — Create Razorpay Account

1. Go to https://razorpay.com → Sign Up → Complete KYC
2. Activate your account (takes 1-2 business days)
3. Dashboard → Settings → API Keys → Generate Test Key

### Step 8.2 — Configure Keys

**Test Mode:**
```
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxx
```

**Live Mode (after KYC activation):**
```
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXXXX  
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxx
```

Update in:
- `src/services/paymentService.js` → `RAZORPAY_KEY_ID`
- Firebase Functions config (Step 7.1)

### Step 8.3 — Webhook Setup (optional)

Razorpay Dashboard → Webhooks → Add:
- URL: `https://YOUR_REGION-nearkart.cloudfunctions.net/razorpayWebhook`
- Events: `payment.captured`, `refund.created`

---

## 9. PUBLISH TO PLAY STORE <a name="playstore"></a>

### Step 9.1 — Create Play Console Account

1. Go to https://play.google.com/console
2. Pay $25 one-time registration fee
3. Complete developer profile

### Step 9.2 — Create App Listing

1. Console → Create app
2. App name: **NearKart - Local Shopping**
3. Default language: **Hindi** (or English)
4. App category: **Shopping**

### Step 9.3 — Prepare Assets

Required:
- App icon: 512×512 PNG
- Feature graphic: 1024×500 PNG
- Screenshots: Min 2, max 8 (phone: 16:9 or 9:16)
- Short description: Max 80 chars
- Full description: Max 4000 chars

### Step 9.4 — Upload & Submit

```bash
# Build production AAB
eas build --platform android --profile production

# Download .aab from EAS dashboard
# Upload to Play Console → Production → Create new release
# Add release notes → Submit for review
```

⏱️ Review takes **3-7 business days** for first submission.

### Step 9.5 — App Store Optimization (ASO)

**Title:** NearKart - Local Shopping App
**Short:** Buy from nearby shops. Fast delivery.
**Keywords:** local shopping, nearby stores, online grocery, local delivery

---

## 10. SCALE TO MULTIPLE CITIES <a name="scale"></a>

### Phase 1: Single City (Current)
- Firebase handles ~100,000 reads/day free tier
- 1 Firebase project for all data
- Location filtering done client-side

### Phase 2: Multi-City (~₹0 extra cost until scale)

**Add city field to all documents:**
```javascript
// When creating seller/product, add:
{ city: "Jaipur", cityCode: "JAI" }

// Query by city:
query(collection(db, 'products'),
  where('city', '==', userCity),
  where('isActive', '==', true)
)
```

**City detection:**
```javascript
const [address] = await Location.reverseGeocodeAsync(coords);
const city = address.city || address.district;
```

### Phase 3: High Scale (>50 cities, >1M users)

1. **Algolia** for search (replaces basic Firestore search)
   ```bash
   npm install algoliasearch
   # Sync products to Algolia from Cloud Functions
   ```

2. **Firebase Regional Deploy** — Deploy to `asia-south1` for India

3. **CDN for images** — Use Cloudflare or Firebase Hosting CDN

4. **Horizontal Scaling:**
   ```
   Current: 1 Firebase project
   Scaled:  1 project per region (North India, South India, etc.)
   ```

5. **Dedicated Delivery Partners:**
   - Add `delivery_partners` collection
   - Assign orders automatically by proximity
   - Build separate Delivery Partner app

### Estimated Costs at Scale:
| Scale | Firebase Cost | Monthly |
|-------|--------------|---------|
| 0-10K users | Free tier | ₹0 |
| 10K-100K users | Blaze plan | ₹2,000-8,000 |
| 100K-1M users | Blaze plan | ₹8,000-40,000 |

---

## 11. MAINTENANCE & UPDATES <a name="updates"></a>

### Update App (New Features)

```bash
# 1. Make code changes
# 2. Increment version in app.json:
{  "version": "1.1.0" }  # User-facing version
{  "android": { "versionCode": 2 } }  # Internal version (increment by 1)

# 3. Build new version
eas build --platform android --profile production

# 4. Upload to Play Store → Create new release
```

### OTA Updates (Minor fixes, no build needed)

```bash
# For JS-only changes, push OTA update via Expo:
eas update --branch production --message "Fix cart bug"
# Users get update automatically next time they open app
```

### Update Commission Rate

**Via Admin Panel:**
1. Go to admin panel → Settings
2. Change commission % → Click "Apply to All Sellers"

**Via Firestore directly:**
```
settings/commission → { rate: 7 }
```

### Monitor App Health

- Firebase Console → Analytics → Events
- Firebase Console → Crashlytics (add `expo-firebase-crashlytics`)
- Firebase Console → Performance

---

## 12. TROUBLESHOOTING <a name="troubleshooting"></a>

### Problem: OTP not received
```
✅ Fix: Check Firebase Auth → Phone sign-in enabled
✅ Fix: Test with real device (emulator may not receive SMS)
✅ Fix: Add test phone numbers in Firebase Auth console
```

### Problem: Images not uploading
```
✅ Fix: Check Firebase Storage rules allow write
✅ Fix: Verify sellerId matches auth.uid
✅ Fix: Check file size < 5MB
```

### Problem: Razorpay payment failing
```
✅ Fix: Use test key for testing (rzp_test_...)
✅ Fix: Test card: 4111 1111 1111 1111, Exp: any future date, CVV: any 3 digits
✅ Fix: UPI test: success@razorpay
```

### Problem: Build failing
```bash
# Clear Expo cache
expo r -c

# Clear npm cache
npm cache clean --force
rm -rf node_modules
npm install

# Reset EAS
eas build --clear-cache
```

### Problem: App not finding nearby sellers
```
✅ Fix: Ensure sellers have location data in Firestore
✅ Fix: Check location permissions in device settings
✅ Fix: Populate test data using the seed script below
```

### Seed Test Data

```javascript
// Run this in Firebase Console → Functions → Shell (or Node.js script)
const testSeller = {
  uid: "test_seller_1",
  shopName: "Fresh Farms",
  ownerName: "Rajesh Kumar",
  phone: "+919876543210",
  category: "grocery",
  location: { latitude: 26.9124, longitude: 75.7873 }, // Jaipur
  totalOrders: 45,
  totalEarnings: 12500,
  commissionRate: 5,
  isVerified: true,
  isActive: true,
};

const testProduct = {
  sellerId: "test_seller_1",
  sellerName: "Fresh Farms",
  name: "Fresh Tomatoes",
  nameLower: "fresh tomatoes",
  price: 40,
  discountPrice: 35,
  stock: 100,
  category: "grocery",
  unit: "kg",
  images: ["https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400"],
  totalSold: 120,
  rating: 4.5,
  totalRatings: 23,
  isActive: true,
};
```

---

## 💡 QUICK REFERENCE

| Action | Command |
|--------|---------|
| Start dev server | `npx expo start` |
| Build test APK | `eas build --platform android --profile preview` |
| Build Play Store AAB | `eas build --platform android --profile production` |
| Deploy functions | `firebase deploy --only functions` |
| Deploy admin panel | `firebase deploy --only hosting` |
| Deploy all Firebase | `firebase deploy` |
| OTA update | `eas update --branch production --message "fix"` |

---

## 📞 SUPPORT

For issues with this codebase:
- Firebase Docs: https://firebase.google.com/docs
- Expo Docs: https://docs.expo.dev
- Razorpay Docs: https://razorpay.com/docs
- React Navigation: https://reactnavigation.org

---

*NearKart v1.0.0 | Built with ❤️ | Your City. Your Store.*
