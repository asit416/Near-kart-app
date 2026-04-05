// src/services/productService.js
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  GeoPoint,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage, COLLECTIONS } from '../config/firebase';

const PAGE_SIZE = 20;

// ─── Upload Product Images ──────────────────────────────────────────────────
export const uploadProductImages = async (images, sellerId, onProgress) => {
  const uploadedUrls = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const filename = `products/${sellerId}/${Date.now()}_${i}.jpg`;
    const storageRef = ref(storage, filename);

    const response = await fetch(image.uri);
    const blob = await response.blob();

    await new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, blob);
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress && onProgress(Math.round(progress));
        },
        reject,
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          uploadedUrls.push(url);
          resolve();
        }
      );
    });
  }

  return uploadedUrls;
};

// ─── Add Product ───────────────────────────────────────────────────────────
export const addProduct = async (productData, sellerId) => {
  try {
    const product = {
      ...productData,
      sellerId,
      isActive: true,
      totalSold: 0,
      totalRatings: 0,
      rating: 0,
      views: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), product);
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ─── Update Product ─────────────────────────────────────────────────────────
export const updateProduct = async (productId, updates) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.PRODUCTS, productId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ─── Delete Product ─────────────────────────────────────────────────────────
export const deleteProduct = async (productId) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.PRODUCTS, productId), {
      isActive: false,
      deletedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ─── Get Products by Seller ─────────────────────────────────────────────────
export const getSellerProducts = async (sellerId, lastDoc = null) => {
  try {
    let q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where('sellerId', '==', sellerId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );

    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snapshot = await getDocs(q);
    const products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, products, lastDoc: snapshot.docs[snapshot.docs.length - 1] };
  } catch (error) {
    return { success: false, error: error.message, products: [] };
  }
};

// ─── Get Nearby Products ────────────────────────────────────────────────────
export const getNearbyProducts = async (category = 'all', lastDoc = null) => {
  try {
    let q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where('isActive', '==', true),
      orderBy('totalSold', 'desc'),
      limit(PAGE_SIZE)
    );

    if (category !== 'all') {
      q = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where('isActive', '==', true),
        where('category', '==', category),
        orderBy('totalSold', 'desc'),
        limit(PAGE_SIZE)
      );
    }

    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snapshot = await getDocs(q);
    const products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, products, lastDoc: snapshot.docs[snapshot.docs.length - 1] };
  } catch (error) {
    return { success: false, error: error.message, products: [] };
  }
};

// ─── Search Products ────────────────────────────────────────────────────────
export const searchProducts = async (searchText) => {
  try {
    // Firebase doesn't support full-text search natively
    // Use name_lower field for basic search
    const searchLower = searchText.toLowerCase();
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where('isActive', '==', true),
      where('nameLower', '>=', searchLower),
      where('nameLower', '<=', searchLower + '\uf8ff'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    const products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, products };
  } catch (error) {
    return { success: false, error: error.message, products: [] };
  }
};

// ─── Get Single Product ─────────────────────────────────────────────────────
export const getProduct = async (productId) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
    if (!docSnap.exists()) return { success: false, error: 'Product not found' };

    // Increment view count
    await updateDoc(doc(db, COLLECTIONS.PRODUCTS, productId), {
      views: increment(1),
    });

    return { success: true, product: { id: docSnap.id, ...docSnap.data() } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ─── Get Trending Products ──────────────────────────────────────────────────
export const getTrendingProducts = async () => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where('isActive', '==', true),
      orderBy('views', 'desc'),
      limit(10)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    return [];
  }
};

// ─── Get Top Selling Products ───────────────────────────────────────────────
export const getTopSellingProducts = async () => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where('isActive', '==', true),
      orderBy('totalSold', 'desc'),
      limit(10)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    return [];
  }
};

// ─── Add Review ─────────────────────────────────────────────────────────────
export const addReview = async (productId, sellerId, reviewData) => {
  try {
    await addDoc(collection(db, COLLECTIONS.REVIEWS), {
      ...reviewData,
      productId,
      sellerId,
      createdAt: serverTimestamp(),
    });

    // Update product rating
    const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    const productSnap = await getDoc(productRef);
    if (productSnap.exists()) {
      const { rating, totalRatings } = productSnap.data();
      const newTotal = totalRatings + 1;
      const newRating = (rating * totalRatings + reviewData.rating) / newTotal;
      await updateDoc(productRef, { rating: newRating, totalRatings: newTotal });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ─── Get Product Reviews ────────────────────────────────────────────────────
export const getProductReviews = async (productId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.REVIEWS),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    return [];
  }
};
