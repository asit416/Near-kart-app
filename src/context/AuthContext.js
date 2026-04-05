// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  PhoneAuthProvider,
  signInWithCredential,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, COLLECTIONS } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null); // 'buyer' | 'seller' | 'admin'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchUserProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setUserProfile(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const fetchUserProfile = async (uid) => {
    try {
      // Check buyers collection first
      const buyerDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
      if (buyerDoc.exists()) {
        const data = buyerDoc.data();
        setUserProfile(data);
        setRole(data.role || 'buyer');
        return;
      }

      // Then check sellers collection
      const sellerDoc = await getDoc(doc(db, COLLECTIONS.SELLERS, uid));
      if (sellerDoc.exists()) {
        const data = sellerDoc.data();
        setUserProfile(data);
        setRole('seller');
        return;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // ─── Phone OTP Login ────────────────────────────────────────────────────
  const sendOTP = async (phoneNumber, recaptchaVerifier) => {
    try {
      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(
        phoneNumber,
        recaptchaVerifier
      );
      return { success: true, verificationId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const verifyOTP = async (verificationId, otp) => {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const result = await signInWithCredential(auth, credential);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // ─── Create User Profile ────────────────────────────────────────────────
  const createBuyerProfile = async (uid, data) => {
    try {
      const profile = {
        uid,
        role: 'buyer',
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        avatar: data.avatar || '',
        address: data.address || {},
        location: data.location || null,
        fcmToken: data.fcmToken || '',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, COLLECTIONS.USERS, uid), profile);
      setUserProfile(profile);
      setRole('buyer');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const createSellerProfile = async (uid, data) => {
    try {
      const profile = {
        uid,
        role: 'seller',
        shopName: data.shopName || '',
        ownerName: data.ownerName || '',
        phone: data.phone || '',
        email: data.email || '',
        avatar: data.avatar || '',
        shopImage: data.shopImage || '',
        category: data.category || 'other',
        address: data.address || '',
        location: data.location || null,
        description: data.description || '',
        gstNumber: data.gstNumber || '',
        bankDetails: data.bankDetails || {},
        fcmToken: data.fcmToken || '',
        isVerified: false,
        isActive: true,
        rating: 0,
        totalRatings: 0,
        totalOrders: 0,
        totalEarnings: 0,
        commissionRate: 5, // Default 5%
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, COLLECTIONS.SELLERS, uid), profile);
      setUserProfile(profile);
      setRole('seller');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // ─── Update Profile ──────────────────────────────────────────────────────
  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    try {
      const collection = role === 'seller' ? COLLECTIONS.SELLERS : COLLECTIONS.USERS;
      await updateDoc(doc(db, collection, user.uid), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      setUserProfile((prev) => ({ ...prev, ...updates }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // ─── Sign Out ────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.clear();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    userProfile,
    role,
    loading,
    sendOTP,
    verifyOTP,
    createBuyerProfile,
    createSellerProfile,
    updateProfile,
    logout,
    refreshProfile: () => user && fetchUserProfile(user.uid),
    isAdmin: userProfile?.role === 'admin',
    isSeller: role === 'seller',
    isBuyer: role === 'buyer',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
