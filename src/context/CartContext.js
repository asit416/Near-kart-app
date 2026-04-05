// src/context/CartContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext({});

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

const CART_KEY = '@nearkart_cart';

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'LOAD_CART':
      return { ...state, items: action.payload, loaded: true };

    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(
        (item) => item.productId === action.payload.productId
      );
      if (existingIndex >= 0) {
        // Check stock limit
        const existing = state.items[existingIndex];
        if (existing.quantity >= action.payload.stock) {
          return { ...state, error: 'Maximum stock limit reached' };
        }
        const updatedItems = [...state.items];
        updatedItems[existingIndex] = {
          ...existing,
          quantity: existing.quantity + 1,
        };
        return { ...state, items: updatedItems, error: null };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
        error: null,
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.productId !== action.payload),
      };

    case 'UPDATE_QUANTITY': {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((item) => item.productId !== productId),
        };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        ),
      };
    }

    case 'CLEAR_CART':
      return { ...state, items: [] };

    case 'SET_COUPON':
      return { ...state, coupon: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
};

const initialState = {
  items: [],
  coupon: null,
  loaded: false,
  error: null,
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from storage on mount
  useEffect(() => {
    loadCart();
  }, []);

  // Save cart to storage whenever it changes
  useEffect(() => {
    if (state.loaded) {
      AsyncStorage.setItem(CART_KEY, JSON.stringify(state.items));
    }
  }, [state.items, state.loaded]);

  const loadCart = async () => {
    try {
      const stored = await AsyncStorage.getItem(CART_KEY);
      const items = stored ? JSON.parse(stored) : [];
      dispatch({ type: 'LOAD_CART', payload: items });
    } catch {
      dispatch({ type: 'LOAD_CART', payload: [] });
    }
  };

  const addToCart = (product) => {
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        productId: product.id,
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        name: product.name,
        image: product.images?.[0] || '',
        price: product.discountPrice || product.price,
        originalPrice: product.price,
        stock: product.stock,
      },
    });
  };

  const removeFromCart = (productId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: productId });
  };

  const updateQuantity = (productId, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  // ─── Computed Values ────────────────────────────────────────────────────
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const discount = state.coupon?.type === 'percent'
    ? (subtotal * state.coupon.value) / 100
    : state.coupon?.type === 'flat'
    ? state.coupon.value
    : 0;

  const deliveryCharge = subtotal > 500 ? 0 : 40;
  const total = subtotal - discount + deliveryCharge;

  // Group items by seller
  const itemsBySeller = state.items.reduce((acc, item) => {
    if (!acc[item.sellerId]) {
      acc[item.sellerId] = {
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        items: [],
      };
    }
    acc[item.sellerId].items.push(item);
    return acc;
  }, {});

  const isInCart = (productId) =>
    state.items.some((item) => item.productId === productId);

  const getItemQuantity = (productId) =>
    state.items.find((item) => item.productId === productId)?.quantity || 0;

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        itemCount,
        subtotal,
        discount,
        deliveryCharge,
        total,
        coupon: state.coupon,
        itemsBySeller,
        error: state.error,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isInCart,
        getItemQuantity,
        setCoupon: (coupon) => dispatch({ type: 'SET_COUPON', payload: coupon }),
        clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
