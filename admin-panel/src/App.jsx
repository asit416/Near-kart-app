// admin-panel/src/App.jsx
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, getDocs, doc, updateDoc, query,
  where, orderBy, limit, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

// ─── Firebase Config ─────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ─── Color System ────────────────────────────────────────────────────────────
const C = {
  primary: '#FF6B35',
  secondary: '#1A1D23',
  accent: '#00C896',
  warning: '#FFB800',
  error: '#FF4B4B',
  info: '#3B82F6',
  bg: '#0F1117',
  card: '#1A1D23',
  border: '#2D3139',
  text: '#E5E7EB',
  textMuted: '#6B7280',
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const injectStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: ${C.bg}; color: ${C.text}; }
    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: ${C.card}; }
    ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
    h1,h2,h3,h4 { font-family: 'Syne', sans-serif; }
    button { cursor: pointer; font-family: 'Inter', sans-serif; }
    input, select, textarea { font-family: 'Inter', sans-serif; }
    .animate-pulse { animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
    .hover-row:hover { background: rgba(255,107,53,0.05) !important; }
  `;
  document.head.appendChild(style);
};

// ═════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${C.bg}, #1a1d23)` }}>
      <div style={{ width: 400, background: C.card, borderRadius: 24, padding: 40, border: `1px solid ${C.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🛍️</div>
          <h1 style={{ fontSize: 28, color: C.primary, fontFamily: 'Syne' }}>NearKart</h1>
          <p style={{ color: C.textMuted, marginTop: 4 }}>Admin Dashboard</p>
        </div>
        <form onSubmit={handleLogin}>
          <input
            style={{ width: '100%', padding: '12px 16px', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, marginBottom: 12, fontSize: 14 }}
            type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} required
          />
          <input
            style={{ width: '100%', padding: '12px 16px', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, marginBottom: 16, fontSize: 14 }}
            type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
          />
          {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', background: loading ? C.textMuted : `linear-gradient(135deg, ${C.primary}, #E55A28)`,
            border: 'none', borderRadius: 12, color: '#fff', fontWeight: 600, fontSize: 16,
          }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═════════════════════════════════════════════════════════════════════════════
function StatCard({ icon, label, value, color, change }) {
  return (
    <div style={{
      background: C.card, borderRadius: 20, padding: 24,
      border: `1px solid ${C.border}`, flex: 1, minWidth: 180,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
        <span style={{ color: C.textMuted, fontSize: 13 }}>{label}</span>
      </div>
      <div style={{ fontSize: 32, fontFamily: 'Syne', fontWeight: 700, color }}>
        {value}
      </div>
      {change && <div style={{ fontSize: 12, color: C.accent, marginTop: 4 }}>{change}</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
function Dashboard() {
  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [commissionRate, setCommissionRate] = useState(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ordersSnap, usersSnap, sellersSnap, productsSnap, settingsSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100))),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'sellers')),
        getDocs(query(collection(db, 'products'), where('isActive', '==', true))),
        getDocs(collection(db, 'settings')),
      ]);

      const ordersData = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sellersData = sellersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const productsData = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      setOrders(ordersData);
      setUsers(usersData);
      setSellers(sellersData);
      setProducts(productsData);

      const delivered = ordersData.filter(o => o.status === 'delivered');
      const totalRevenue = delivered.reduce((s, o) => s + (o.commission || 0), 0);
      const todayOrders = ordersData.filter(o => {
        const d = o.createdAt?.toDate?.();
        return d && new Date().toDateString() === d.toDateString();
      });

      setStats({
        totalUsers: usersData.length,
        totalSellers: sellersData.length,
        totalOrders: ordersData.length,
        totalRevenue: Math.round(totalRevenue),
        todayOrders: todayOrders.length,
        pendingOrders: ordersData.filter(o => o.status === 'pending').length,
        deliveredOrders: delivered.length,
      });

      const commissionDoc = settingsSnap.docs.find(d => d.id === 'commission');
      if (commissionDoc) setCommissionRate(commissionDoc.data().rate || 5);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateCommission = async () => {
    try {
      await updateDoc(doc(db, 'settings', 'commission'), {
        rate: commissionRate,
        updatedAt: serverTimestamp(),
      });
      // Update all sellers
      const batch_updates = sellers.map(s => updateDoc(doc(db, 'sellers', s.id), { commissionRate }));
      await Promise.all(batch_updates);
      alert(`✅ Commission updated to ${commissionRate}% for all sellers`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const banUser = async (userId, userType, currentBanned) => {
    const confirmed = window.confirm(`${currentBanned ? 'Unban' : 'Ban'} this ${userType}?`);
    if (!confirmed) return;
    const col = userType === 'seller' ? 'sellers' : 'users';
    await updateDoc(doc(db, col, userId), { isBanned: !currentBanned });
    fetchAll();
  };

  const removeProduct = async (productId) => {
    if (!window.confirm('Remove this product?')) return;
    await updateDoc(doc(db, 'products', productId), { isActive: false });
    fetchAll();
  };

  const NAV = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'sellers', label: 'Sellers', icon: '🏪' },
    { id: 'products', label: 'Products', icon: '🛍️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const STATUS_COLORS = {
    pending: C.warning,
    confirmed: C.info,
    packed: '#8B5CF6',
    out_for_delivery: C.primary,
    delivered: C.accent,
    cancelled: C.error,
    rejected: C.error,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: C.card, borderRight: `1px solid ${C.border}`, padding: 24, display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', overflow: 'auto' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>🛍️</span>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: C.primary }}>NearKart</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Admin Console</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActiveTab(n.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: activeTab === n.id ? C.primary + '20' : 'transparent',
              borderLeft: activeTab === n.id ? `3px solid ${C.primary}` : '3px solid transparent',
              border: 'none', borderRadius: 0, color: activeTab === n.id ? C.primary : C.textMuted,
              fontSize: 14, fontWeight: activeTab === n.id ? 600 : 400, marginBottom: 4,
            }}>
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <button onClick={() => auth.signOut()} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: 'none', border: `1px solid ${C.border}`, borderRadius: 12,
          color: C.textMuted, fontSize: 14, marginTop: 'auto',
        }}>🚪 Sign Out</button>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, padding: 32, minHeight: '100vh' }}>

        {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: 28, marginBottom: 8 }}>Dashboard Overview</h1>
            <p style={{ color: C.textMuted, marginBottom: 32 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
              <StatCard icon="👥" label="Total Users" value={stats.totalUsers || 0} color={C.info} />
              <StatCard icon="🏪" label="Total Sellers" value={stats.totalSellers || 0} color="#8B5CF6" />
              <StatCard icon="📦" label="Total Orders" value={stats.totalOrders || 0} color={C.primary} />
              <StatCard icon="💰" label="Total Revenue" value={`₹${(stats.totalRevenue || 0).toLocaleString()}`} color={C.accent} />
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
              <StatCard icon="🕐" label="Today's Orders" value={stats.todayOrders || 0} color={C.warning} />
              <StatCard icon="⏳" label="Pending Orders" value={stats.pendingOrders || 0} color={C.error} />
              <StatCard icon="✅" label="Delivered" value={stats.deliveredOrders || 0} color={C.accent} />
            </div>

            {/* Recent Orders */}
            <h2 style={{ fontFamily: 'Syne', fontSize: 20, marginBottom: 16 }}>Recent Orders</h2>
            <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Order ID', 'Buyer', 'Seller', 'Amount', 'Commission', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 20).map(order => (
                    <tr key={order.id} className="hover-row" style={{ borderBottom: `1px solid ${C.border}20` }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace', color: C.primary }}>
                        #{order.id?.slice(-8).toUpperCase()}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{order.deliveryAddress?.name || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{order.sellerName || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>₹{order.total?.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.accent }}>₹{order.commission?.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: (STATUS_COLORS[order.status] || C.textMuted) + '20',
                          color: STATUS_COLORS[order.status] || C.textMuted,
                        }}>
                          {order.status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: C.textMuted }}>
                        {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ORDERS ───────────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: 28, marginBottom: 24 }}>All Orders ({orders.length})</h1>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_COLORS).map(([s, c]) => (
                <div key={s} style={{ padding: '6px 14px', background: c + '20', borderRadius: 20, fontSize: 12, color: c, fontWeight: 600 }}>
                  {orders.filter(o => o.status === s).length} {s.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
            <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Order ID', 'Items', 'Seller', 'Amount', 'Commission', 'Earnings', 'Status', 'Payment', 'Date'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, color: C.textMuted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="hover-row" style={{ borderBottom: `1px solid ${C.border}20` }}>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: C.primary }}>#{order.id?.slice(-8).toUpperCase()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{order.items?.length} items</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{order.sellerName}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>₹{order.total?.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.accent }}>₹{order.commission?.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#E5E7EB' }}>₹{order.sellerEarning?.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: (STATUS_COLORS[order.status] || C.textMuted) + '20', color: STATUS_COLORS[order.status] || C.textMuted }}>
                          {order.status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 6, background: order.paymentMethod === 'cod' ? C.warning + '20' : C.info + '20', color: order.paymentMethod === 'cod' ? C.warning : C.info, fontSize: 11 }}>
                          {order.paymentMethod?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: C.textMuted }}>
                        {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USERS ────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: 28, marginBottom: 24 }}>Buyers ({users.length})</h1>
            <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Name', 'Phone', 'Email', 'Joined', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, color: C.textMuted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="hover-row" style={{ borderBottom: `1px solid ${C.border}20` }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{user.name || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.textMuted }}>{user.phone || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.textMuted }}>{user.email || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: C.textMuted }}>
                        {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: user.isBanned ? C.error + '20' : C.accent + '20', color: user.isBanned ? C.error : C.accent }}>
                          {user.isBanned ? 'BANNED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => banUser(user.id, 'buyer', user.isBanned)} style={{
                          padding: '5px 12px', borderRadius: 8, border: `1px solid ${user.isBanned ? C.accent : C.error}`,
                          background: 'transparent', color: user.isBanned ? C.accent : C.error, fontSize: 12, cursor: 'pointer',
                        }}>
                          {user.isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SELLERS ──────────────────────────────────────────────────── */}
        {activeTab === 'sellers' && (
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: 28, marginBottom: 24 }}>Sellers ({sellers.length})</h1>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {sellers.map(seller => (
                <div key={seller.id} style={{
                  background: C.card, borderRadius: 20, padding: 20, border: `1px solid ${C.border}`,
                  width: 'calc(50% - 8px)', minWidth: 280,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>{seller.shopName}</div>
                      <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{seller.ownerName} • {seller.phone}</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: seller.isBanned ? C.error + '20' : C.accent + '20', color: seller.isBanned ? C.error : C.accent }}>
                      {seller.isBanned ? 'BANNED' : seller.isVerified ? 'VERIFIED' : 'ACTIVE'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, color: C.primary }}>{seller.totalOrders || 0}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>Orders</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, color: C.accent }}>₹{(seller.totalEarnings || 0).toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>Earnings</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, color: C.warning }}>{seller.commissionRate || 5}%</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>Commission</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => banUser(seller.id, 'seller', seller.isBanned)} style={{
                      flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${seller.isBanned ? C.accent : C.error}`,
                      background: 'transparent', color: seller.isBanned ? C.accent : C.error, fontSize: 13,
                    }}>
                      {seller.isBanned ? '✅ Unban' : '🚫 Ban'}
                    </button>
                    {!seller.isVerified && (
                      <button onClick={async () => { await updateDoc(doc(db, 'sellers', seller.id), { isVerified: true }); fetchAll(); }} style={{
                        flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${C.info}`,
                        background: 'transparent', color: C.info, fontSize: 13,
                      }}>
                        ✓ Verify
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PRODUCTS ─────────────────────────────────────────────────── */}
        {activeTab === 'products' && (
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: 28, marginBottom: 24 }}>Products ({products.length})</h1>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {products.map(p => (
                <div key={p.id} style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, width: 'calc(25% - 12px)', minWidth: 200 }}>
                  {p.images?.[0] && <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />}
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>{p.sellerName}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: C.primary, fontFamily: 'Syne', fontWeight: 700 }}>₹{p.price?.toLocaleString()}</span>
                    <button onClick={() => removeProduct(p.id)} style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.error}`, background: 'transparent', color: C.error, fontSize: 12 }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS ─────────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: 28, marginBottom: 24 }}>App Settings</h1>
            <div style={{ maxWidth: 500, background: C.card, borderRadius: 20, padding: 28, border: `1px solid ${C.border}` }}>
              <h2 style={{ fontFamily: 'Syne', marginBottom: 20, color: C.accent }}>💰 Commission Control</h2>
              <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>
                Set the commission percentage charged per order. This applies to all sellers.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <input
                  type="number" min="1" max="30" value={commissionRate}
                  onChange={e => setCommissionRate(Number(e.target.value))}
                  style={{ flex: 1, padding: '12px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 18, fontFamily: 'Syne', textAlign: 'center' }}
                />
                <span style={{ color: C.textMuted, fontSize: 18 }}>%</span>
              </div>
              <div style={{ background: C.bg, borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 13, color: C.textMuted }}>
                Example: On ₹1,000 order → Commission = ₹{Math.round(commissionRate / 100 * 1000)} → Seller earns ₹{Math.round((1 - commissionRate / 100) * 1000)}
              </div>
              <button onClick={updateCommission} style={{
                width: '100%', padding: 14, background: `linear-gradient(135deg, ${C.primary}, #E55A28)`,
                border: 'none', borderRadius: 12, color: '#fff', fontWeight: 600, fontSize: 16,
              }}>
                Apply to All Sellers
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    injectStyles();
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return unsub;
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, animation: 'spin 1s linear infinite' }}>⚙️</div>
        <p style={{ color: C.textMuted, marginTop: 12 }}>Loading NearKart Admin...</p>
      </div>
    </div>
  );

  return user ? <Dashboard /> : <LoginScreen />;
}
