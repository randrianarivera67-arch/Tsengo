// src/pages/AdminPanel.jsx
// Panel Admin complet : Utilisateurs (ID, VIP, blocage, désactivation),
// Boost, Boutiques, Artistes, installation PWA + statistiques détaillées.
import { useState, useEffect } from 'react';
import {
  collection, query, getDocs, doc, updateDoc, deleteDoc,
  orderBy, getDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  HiShieldCheck, HiStar, HiSearch, HiLightningBolt, HiX, HiClock,
  HiChevronDown, HiChevronUp, HiBan, HiCheckCircle, HiTrash,
  HiDownload, HiDuplicate, HiShoppingBag, HiMusicNote, HiUserGroup
} from 'react-icons/hi';
import { isStandalone, canInstall, onInstallChange, promptInstall } from '../utils/pwaInstall';
import PushDiagnostic from '../components/PushDiagnostic';

export default function AdminPanel() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState('users');

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [posts, setPosts] = useState([]);
  const [boostSearch, setBoostSearch] = useState('');
  const [boostDays, setBoostDays] = useState({});
  const [boostLoading, setBoostLoading] = useState({});
  const [expandedPost, setExpandedPost] = useState(null);

  const [shops, setShops] = useState([]);
  const [artists, setArtists] = useState([]);
  const [bizSearch, setBizSearch] = useState('');
  const [boostOrders, setBoostOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // ── Installation PWA ─────────────────────────────────────────────
  const [installState, setInstallState] = useState('unavailable'); // installed | ready | unavailable
  useEffect(() => {
    setInstallState(isStandalone() ? 'installed' : (canInstall() ? 'ready' : 'unavailable'));
    return onInstallChange((available) => {
      setInstallState(isStandalone() ? 'installed' : (available ? 'ready' : 'unavailable'));
    });
  }, []);
  async function doInstall() {
    const r = await promptInstall();
    if (r.outcome === 'accepted') { setInstallState('installed'); showMsg('✅ Application installée !'); }
    else if (r.outcome === 'unavailable') showMsg("❌ Installation indisponible (ouvrez dans Chrome, hors mode installé)");
    else showMsg('Installation annulée');
  }

  // ── Vérif admin ──────────────────────────────────────────────────
  useEffect(() => {
    async function checkAdmin() {
      if (!currentUser) { setIsAdmin(false); return; }
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists() && snap.data().isAdmin === true) {
          setIsAdmin(true);
          loadUsers(); loadPosts(); loadShops(); loadArtists(); loadBoostOrders();
        } else setIsAdmin(false);
      } catch { setIsAdmin(false); }
    }
    checkAdmin();
  }, [currentUser]);

  async function loadUsers() {
    setLoading(true);
    const snap = await getDocs(query(collection(db, 'users'), orderBy('fullName')));
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }
  async function loadPosts() {
    const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')));
    setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }
  async function loadShops() {
    try {
      const snap = await getDocs(query(collection(db, 'shops'), orderBy('createdAt', 'desc')));
      setShops(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { setShops([]); }
  }
  async function loadArtists() {
    try {
      const snap = await getDocs(collection(db, 'artists'));
      setArtists(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { setArtists([]); }
  }

  async function loadBoostOrders() {
    setOrdersLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'boostOrders'), orderBy('createdAt', 'desc')));
      setBoostOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { setBoostOrders([]); }
    setOrdersLoading(false);
  }

  const BOOST_COLLECTION = { post: 'posts', profile: 'users', shop: 'shops', artist: 'artists' };

  async function approveOrder(order) {
    try {
      const col = BOOST_COLLECTION[order.targetType] || 'posts';
      const boostUntil = new Date();
      boostUntil.setDate(boostUntil.getDate() + (order.days || 1));
      await updateDoc(doc(db, col, order.targetId), {
        isBoosted: true, boostDays: order.days || 1,
        boostUntil: boostUntil.toISOString(), boostedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'boostOrders', order.id), { status: 'approved', processedAt: new Date().toISOString() });
      try {
        await addDoc(collection(db, 'notifications'), {
          toUid: order.requesterUid, fromUid: currentUser.uid, fromName: 'Trengo Admin', fromPhoto: '',
          type: 'boost', message: `Votre commande de boost (${order.days} jour${order.days > 1 ? 's' : ''}) a été validée 🚀`,
          read: false, createdAt: serverTimestamp(),
        });
      } catch (e) { /* notif optionnelle */ }
      setBoostOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'approved' } : o));
      showMsg(`✅ Commande de ${order.requesterName} validée (${order.days}j)`);
    } catch (err) {
      showMsg('❌ Erreur : ' + (err?.message || err));
    }
  }

  async function refuseOrder(order) {
    try {
      await updateDoc(doc(db, 'boostOrders', order.id), { status: 'refused', processedAt: new Date().toISOString() });
      try {
        await addDoc(collection(db, 'notifications'), {
          toUid: order.requesterUid, fromUid: currentUser.uid, fromName: 'Trengo Admin', fromPhoto: '',
          type: 'general', message: `Votre commande de boost a été refusée.`,
          read: false, createdAt: serverTimestamp(),
        });
      } catch (e) { /* notif optionnelle */ }
      setBoostOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'refused' } : o));
      showMsg(`⛔ Commande de ${order.requesterName} refusée`);
    } catch (err) {
      showMsg('❌ Erreur : ' + (err?.message || err));
    }
  }

  // ── Actions Utilisateurs ─────────────────────────────────────────
  async function toggleVip(user) {
    const v = !user.isVip;
    await updateDoc(doc(db, 'users', user.id), { isVip: v });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isVip: v } : u));
    showMsg(`${user.fullName} → VIP ${v ? 'activé ✅' : 'retiré ❌'}`);
  }
  async function toggleBan(user) {
    const v = !user.isBanned;
    try {
      await updateDoc(doc(db, 'users', user.id), { isBanned: v });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isBanned: v } : u));
      showMsg(`${user.fullName} → ${v ? '🚫 Bloqué' : '✅ Débloqué'}`);
    } catch { showMsg('❌ Erreur (vérifiez les règles Firestore)'); }
  }
  async function toggleDisable(user) {
    const v = !user.disabled;
    try {
      await updateDoc(doc(db, 'users', user.id), { disabled: v });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, disabled: v } : u));
      showMsg(`${user.fullName} → ${v ? '💤 Désactivé' : '✅ Réactivé'}`);
    } catch { showMsg('❌ Erreur (vérifiez les règles Firestore)'); }
  }
  function copyId(id) {
    try { navigator.clipboard.writeText(id); showMsg('ID copié : ' + id); }
    catch { showMsg(id); }
  }

  // ── Boost ────────────────────────────────────────────────────────
  async function activateBoost(post) {
    const days = parseInt(boostDays[post.id]);
    if (!days || days < 1 || days > 365) { showMsg('❌ Nombre de jours invalide (1–365)'); return; }
    setBoostLoading(p => ({ ...p, [post.id]: true }));
    try {
      const boostUntil = new Date();
      boostUntil.setDate(boostUntil.getDate() + days);
      await updateDoc(doc(db, 'posts', post.id), {
        isBoosted: true, boostDays: days,
        boostUntil: boostUntil.toISOString(), boostedAt: new Date().toISOString(),
      });
      try {
        await addDoc(collection(db, 'notifications'), {
          toUid: post.uid, fromUid: currentUser.uid, fromName: 'Trengo Admin', fromPhoto: '',
          type: 'boost', postId: post.id,
          message: `Votre publication a été boostée pendant ${days} jour${days > 1 ? 's' : ''} 🚀`,
          read: false, createdAt: serverTimestamp(),
        });
      } catch (e) { /* notif optionnelle */ }
      setPosts(prev => prev.map(p => p.id === post.id
        ? { ...p, isBoosted: true, boostDays: days, boostUntil: boostUntil.toISOString() } : p));
      showMsg(`🚀 Post de @${post.authorUsername || post.authorName} boosté ${days}j !`);
      setBoostDays(p => ({ ...p, [post.id]: '' }));
    } catch (err) {
      showMsg('❌ Boost refusé — mettez à jour les règles Firestore (isAdmin)');
    }
    setBoostLoading(p => ({ ...p, [post.id]: false }));
  }
  async function deactivateBoost(post) {
    setBoostLoading(p => ({ ...p, [post.id]: true }));
    try {
      await updateDoc(doc(db, 'posts', post.id), { isBoosted: false, boostDays: 0, boostUntil: null });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isBoosted: false, boostDays: 0, boostUntil: null } : p));
      showMsg(`⛔ Boost retiré du post de @${post.authorUsername || post.authorName}`);
    } catch { showMsg('❌ Erreur (règles Firestore)'); }
    setBoostLoading(p => ({ ...p, [post.id]: false }));
  }
  function boostTimeLeft(post) {
    if (!post.boostUntil) return null;
    const diff = new Date(post.boostUntil) - new Date();
    if (diff <= 0) return 'Expiré';
    const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000);
    return d > 0 ? `${d}j ${h}h restants` : `${h}h restants`;
  }

  // ── Actions Boutiques / Artistes ─────────────────────────────────
  async function verifyBiz(kind, item) {
    const col = kind === 'shop' ? 'shops' : 'artists';
    const setter = kind === 'shop' ? setShops : setArtists;
    const v = !item.verified;
    try {
      await updateDoc(doc(db, col, item.id), { verified: v });
      setter(prev => prev.map(x => x.id === item.id ? { ...x, verified: v } : x));
      showMsg(`${item.name} → ${v ? '✅ Vérifié' : 'Vérif. retirée'}`);
    } catch { showMsg('❌ Erreur (règles Firestore)'); }
  }
  async function deleteBiz(kind, item) {
    const label = kind === 'shop' ? 'boutique' : 'canal artiste';
    if (!window.confirm(`Supprimer définitivement ${label} "${item.name}" ?`)) return;
    const col = kind === 'shop' ? 'shops' : 'artists';
    const setter = kind === 'shop' ? setShops : setArtists;
    try {
      await deleteDoc(doc(db, col, item.id));
      setter(prev => prev.filter(x => x.id !== item.id));
      showMsg(`🗑️ ${item.name} supprimé`);
    } catch { showMsg('❌ Erreur (règles Firestore)'); }
  }

  function showMsg(txt) { setMessage(txt); setTimeout(() => setMessage(''), 4000); }

  // ── Filtres ──────────────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.id?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPosts = posts.filter(p =>
    p.authorName?.toLowerCase().includes(boostSearch.toLowerCase()) ||
    p.authorUsername?.toLowerCase().includes(boostSearch.toLowerCase()) ||
    p.content?.toLowerCase().includes(boostSearch.toLowerCase())
  );
  const blow = bizSearch.toLowerCase();
  const filteredShops = shops.filter(s => (s.name || '').toLowerCase().includes(blow));
  const filteredArtists = artists.filter(a => (a.name || '').toLowerCase().includes(blow));

  const nBanned = users.filter(u => u.isBanned).length;
  const nDisabled = users.filter(u => u.disabled).length;

  // ── États bloquants ──────────────────────────────────────────────
  if (isAdmin === null) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0D12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#65676B', fontFamily: 'Poppins' }}>Vérification des droits...</p>
      </div>
    );
  }
  if (isAdmin === false) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0D12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#050505', borderRadius: 20, padding: 32, maxWidth: 340, textAlign: 'center', border: '1px solid #232733', fontFamily: 'Poppins' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <h2 style={{ color: '#E4E6EB', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Accès refusé</h2>
          <p style={{ color: '#65676B', fontSize: 14, marginBottom: 24 }}>Vous n'avez pas les droits administrateur.</p>
          <button onClick={() => navigate('/')} style={{ background: 'linear-gradient(135deg,#FF2D8D,#FF7AB8)', color: 'white', border: 'none', borderRadius: 25, padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins' }}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setActiveTab(key)}
      style={{
        flex: 1, padding: '10px 6px', borderRadius: 14, border: activeTab === key ? 'none' : '1px solid #232733',
        cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap',
        background: activeTab === key ? 'linear-gradient(135deg,#FF2D8D,#FF7AB8)' : '#050505',
        color: activeTab === key ? 'white' : '#65676B',
      }}>{label}</button>
  );

  const pill = (txt, bg, color, border) => (
    <span style={{ background: bg, color, fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6, border: border || 'none' }}>{txt}</span>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0B0D12', padding: '20px 16px', fontFamily: 'Poppins, sans-serif', color: '#E4E6EB' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#FF2D8D,#FF7AB8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HiShieldCheck size={24} color="white" />
          </div>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 20, color: '#E4E6EB' }}>Panel Admin</h2>
            <p style={{ fontSize: 12, color: '#65676B' }}>Connecté : {userProfile?.fullName}</p>
          </div>
          <button onClick={() => navigate('/')} style={{ marginLeft: 'auto', background: '#232733', border: 'none', borderRadius: 20, padding: '6px 14px', color: '#65676B', cursor: 'pointer', fontSize: 13 }}>
            ← Retour
          </button>
        </div>

        {/* Installation PWA */}
        <div style={{ background: 'linear-gradient(135deg,#1877F218,#00C85311)', border: '1px solid #1877F244', borderRadius: 14, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <HiDownload size={22} color="#3b82f6" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#E4E6EB' }}>Installer l'application Trengo</p>
            <p style={{ fontSize: 11, color: '#65676B' }}>
              {installState === 'installed' ? '✅ Déjà installée sur cet appareil'
                : installState === 'ready' ? "Prête à installer sur l'écran d'accueil"
                : 'Ouvrez dans Chrome (hors mode installé) pour activer'}
            </p>
          </div>
          <button onClick={doInstall} disabled={installState !== 'ready'}
            style={{
              flexShrink: 0, border: 'none', borderRadius: 20, padding: '9px 16px', fontWeight: 700, fontSize: 13, fontFamily: 'Poppins',
              cursor: installState === 'ready' ? 'pointer' : 'not-allowed',
              background: installState === 'ready' ? 'linear-gradient(135deg,#1877F2,#42A5F5)' : '#232733',
              color: installState === 'ready' ? '#fff' : '#65676B',
            }}>
            {installState === 'installed' ? 'Installée' : 'Installer'}
          </button>
        </div>

        {/* Diagnostic Push */}
        <PushDiagnostic uid={currentUser?.uid} />

        {/* Flash message */}
        {message && (
          <div style={{ background: message.startsWith('❌') ? '#3b0000' : '#14532d', border: `1px solid ${message.startsWith('❌') ? '#ef4444' : '#16a34a'}`, borderRadius: 12, padding: '10px 16px', marginBottom: 14, fontSize: 14, color: message.startsWith('❌') ? '#fca5a5' : '#86efac', wordBreak: 'break-all' }}>
            {message}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
          {[
            { label: 'Utilisateurs', value: users.length, color: '#3b82f6' },
            { label: 'VIP', value: users.filter(u => u.isVip).length, color: '#1877F2' },
            { label: 'Bloqués', value: nBanned, color: '#ef4444' },
            { label: 'Désactivés', value: nDisabled, color: '#f59e0b' },
            { label: 'Publications', value: posts.length, color: '#22c55e' },
            { label: 'Boostés', value: posts.filter(p => p.isBoosted).length, color: '#a855f7' },
            { label: 'Boutiques', value: shops.length, color: '#06b6d4' },
            { label: 'Artistes', value: artists.length, color: '#ec4899' },
          ].map(s => (
            <div key={s.label} style={{ background: '#050505', borderRadius: 14, padding: '12px 6px', textAlign: 'center', border: '1px solid #232733' }}>
              <p style={{ fontWeight: 800, fontSize: 19, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: 9.5, color: '#65676B' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, overflowX: 'auto' }}>
          {tabBtn('users', '👥 Utilisateurs')}
          {tabBtn('boost', '🚀 Boost')}
          {tabBtn('shops', '🛍️ Boutiques')}
          {tabBtn('artists', '🎵 Artistes')}
          {tabBtn('orders', `📢 Commandes${boostOrders.filter(o=>o.status==='pending').length ? ' ('+boostOrders.filter(o=>o.status==='pending').length+')' : ''}`)}
        </div>

        {/* ── TAB USERS ── */}
        {activeTab === 'users' && (
          <>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#65676B' }} size={17} />
              <input placeholder="Rechercher (nom, @, email, ID)..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', background: '#050505', border: '1px solid #232733', borderRadius: 12, padding: '10px 10px 10px 36px', color: '#E4E6EB', fontFamily: 'Poppins', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            {loading ? <p style={{ textAlign: 'center', color: '#65676B', padding: 30 }}>Chargement...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredUsers.map(user => (
                  <div key={user.id} style={{ background: '#050505', borderRadius: 14, padding: '12px 14px', border: user.isBanned ? '1px solid #ef4444' : user.disabled ? '1px solid #f59e0b' : user.isVip ? '1px solid #1877F2' : '1px solid #232733' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'U')}&background=1877F2&color=fff`} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, opacity: user.disabled ? 0.5 : 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: '#E4E6EB' }}>{user.fullName}</p>
                          {user.isVip && <img src='/vip-badge.png' style={{ width: 22, height: 22, flexShrink: 0, objectFit: 'contain' }} alt='VIP' />}
                          {user.isAdmin && pill('ADMIN', '#1d4ed8', 'white')}
                          {user.isBanned && pill('BLOQUÉ', '#7f1d1d', '#fca5a5')}
                          {user.disabled && pill('DÉSACTIVÉ', '#78350f', '#fcd34d')}
                        </div>
                        <p style={{ fontSize: 12, color: '#65676B' }}>@{user.username} · {user.email}</p>
                        <p onClick={() => copyId(user.id)} style={{ fontSize: 10.5, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginTop: 2 }}>
                          <HiDuplicate size={11} /> ID : {user.id}
                        </p>
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <button onClick={() => toggleVip(user)} style={{ flex: 1, minWidth: 90, background: user.isVip ? '#232733' : 'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border: 'none', borderRadius: 18, padding: '7px 10px', color: user.isVip ? '#1877F2' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Poppins' }}>
                        <HiStar size={13} /> {user.isVip ? 'Retirer VIP' : 'VIP'}
                      </button>
                      <button onClick={() => toggleBan(user)} style={{ flex: 1, minWidth: 90, background: user.isBanned ? '#232733' : '#3b0000', border: '1px solid #ef4444', borderRadius: 18, padding: '7px 10px', color: '#fca5a5', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Poppins' }}>
                        <HiBan size={13} /> {user.isBanned ? 'Débloquer' : 'Bloquer'}
                      </button>
                      <button onClick={() => toggleDisable(user)} style={{ flex: 1, minWidth: 90, background: user.disabled ? '#232733' : '#3a2a00', border: '1px solid #f59e0b', borderRadius: 18, padding: '7px 10px', color: '#fcd34d', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Poppins' }}>
                        <HiClock size={13} /> {user.disabled ? 'Réactiver' : 'Désactiver'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB BOOST ── */}
        {activeTab === 'boost' && (
          <>
            <div style={{ background: 'linear-gradient(135deg,#7c3aed22,#1877F211)', border: '1px solid #7c3aed44', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <HiLightningBolt size={22} color="#a855f7" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#d8b4fe', marginBottom: 4 }}>Boost de publication</p>
                <p style={{ fontSize: 12, color: '#65676B', lineHeight: 1.7 }}>
                  Saisissez le nombre de jours. Le post remonte en tête du fil avec le badge <strong style={{ color: '#a855f7' }}>Sponsorisé</strong>. ⚠️ Nécessite les règles Firestore <strong style={{ color: '#E4E6EB' }}>isAdmin</strong> à jour.
                </p>
              </div>
            </div>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#65676B' }} size={17} />
              <input placeholder="Rechercher une publication..." value={boostSearch} onChange={e => setBoostSearch(e.target.value)}
                style={{ width: '100%', background: '#050505', border: '1px solid #232733', borderRadius: 12, padding: '10px 10px 10px 36px', color: '#E4E6EB', fontFamily: 'Poppins', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredPosts.map(post => {
                const timeLeft = boostTimeLeft(post);
                const isExpanded = expandedPost === post.id;
                return (
                  <div key={post.id} style={{ background: '#050505', borderRadius: 16, border: post.isBoosted ? '1px solid #a855f7' : '1px solid #232733', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setExpandedPost(isExpanded ? null : post.id)}>
                      <img src={post.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'U')}&background=1877F2&color=fff`} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ fontWeight: 600, fontSize: 13, color: '#E4E6EB' }}>{post.authorName}</p>
                          {post.isBoosted && <span style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 2 }}><HiLightningBolt size={9} /> Boosté</span>}
                        </div>
                        <p style={{ fontSize: 11, color: '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{post.content || (post.mediaURL ? '📎 Media' : '—')}</p>
                        {post.isBoosted && timeLeft && <p style={{ fontSize: 10, color: '#a855f7', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}><HiClock size={10} /> {timeLeft} · {post.boostDays}j total</p>}
                      </div>
                      <span style={{ color: '#65676B', flexShrink: 0 }}>{isExpanded ? <HiChevronUp size={18} /> : <HiChevronDown size={18} />}</span>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #232733', padding: '14px' }}>
                        {post.content && <p style={{ fontSize: 13, color: '#E4E6EB', marginBottom: 10, lineHeight: 1.5, background: '#0B0D12', borderRadius: 10, padding: '10px 12px' }}>{post.content.slice(0, 150)}{post.content.length > 150 ? '...' : ''}</p>}
                        {post.mediaURL && post.mediaType === 'image' && <img src={post.mediaURL} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />}
                        {post.isBoosted && (
                          <div style={{ background: '#2e1065', borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <p style={{ color: '#d8b4fe', fontWeight: 600, fontSize: 13 }}>✅ Boost actif — {post.boostDays}j</p>
                              <p style={{ color: '#a855f7', fontSize: 12 }}>{timeLeft}</p>
                            </div>
                            <button onClick={() => deactivateBoost(post)} disabled={boostLoading[post.id]} style={{ background: '#232733', border: '1px solid #1877F2', borderRadius: 20, padding: '6px 14px', color: '#1877F2', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: 4 }}><HiX size={13} /> Retirer boost</button>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <HiClock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#65676B' }} size={16} />
                            <input type="number" min="1" max="365" placeholder="Nb. jours (ex: 7)" value={boostDays[post.id] || ''} onChange={e => setBoostDays(p => ({ ...p, [post.id]: e.target.value }))}
                              style={{ width: '100%', background: '#0B0D12', border: '1px solid #232733', borderRadius: 12, padding: '10px 14px 10px 40px', color: '#E4E6EB', fontFamily: 'Poppins', fontSize: 14, boxSizing: 'border-box' }} />
                          </div>
                          <span style={{ color: '#65676B', fontSize: 13, fontWeight: 600 }}>j</span>
                          <button onClick={() => activateBoost(post)} disabled={boostLoading[post.id] || !boostDays[post.id]}
                            style={{ background: (!boostDays[post.id] || boostLoading[post.id]) ? '#232733' : 'linear-gradient(135deg,#7c3aed,#a855f7)', border: 'none', borderRadius: 20, padding: '10px 18px', color: 'white', cursor: boostDays[post.id] ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, opacity: boostLoading[post.id] ? 0.6 : 1 }}>
                            <HiLightningBolt size={14} /> {boostLoading[post.id] ? '...' : post.isBoosted ? 'Prolonger' : 'Booster'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── TAB SHOPS / ARTISTS ── */}
        {activeTab === 'orders' && (
          <div>
            {ordersLoading ? (
              <p style={{ textAlign:'center', color:'#65676B', padding:30 }}>Chargement…</p>
            ) : boostOrders.length === 0 ? (
              <p style={{ textAlign:'center', color:'#65676B', padding:30, fontSize:13 }}>Aucune commande de boost</p>
            ) : boostOrders.map(order => (
              <div key={order.id} style={{ background:'#050505', borderRadius:14, padding:'12px 14px', marginBottom:10, border: order.status==='pending' ? '1px solid #a855f7' : '1px solid #232733' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <img src={order.requesterPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(order.requesterName||'U')}&background=1877F2&color=fff`} alt="" style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:13, color:'#E4E6EB' }}>{order.requesterName}</p>
                    <p style={{ fontSize:11, color:'#65676B' }}>
                      {order.targetType==='post' ? '📝 Publication' : order.targetType==='profile' ? '👤 Profil' : order.targetType==='shop' ? '🛍️ Boutique' : '🎵 Artiste'}
                      {order.targetTitle ? ` · ${order.targetTitle}` : ''}
                    </p>
                  </div>
                  {order.targetThumb && <img src={order.targetThumb} alt="" style={{ width:38, height:38, borderRadius:8, objectFit:'cover', flexShrink:0 }}/>}
                </div>
                <div style={{ display:'flex', gap:14, marginTop:10, fontSize:12, color:'#B0B3B8', flexWrap:'wrap' }}>
                  <span>⏱️ {order.days} jour{order.days>1?'s':''}</span>
                  <span>💰 {(order.price||0).toLocaleString()} Ar</span>
                  <span>🎯 {order.objective==='messages'?'Messages':order.objective==='followers'?'Abonnés':'Vues'}</span>
                  {order.zone?.label && <span>📍 {order.zone.label}</span>}
                  {!order.zone?.label && order.zone?.radiusKm && <span>📍 rayon {order.zone.radiusKm} km</span>}
                </div>
                <div style={{ marginTop:10 }}>
                  {order.status === 'pending' ? (
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => approveOrder(order)} style={{ flex:1, background:'linear-gradient(135deg,#1877F2,#42A5F5)', border:'none', borderRadius:16, padding:'9px 0', color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins' }}>✅ Valider</button>
                      <button onClick={() => refuseOrder(order)} style={{ flex:1, background:'#3b0000', border:'1px solid #ef4444', borderRadius:16, padding:'9px 0', color:'#fca5a5', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins' }}>❌ Refuser</button>
                    </div>
                  ) : (
                    <span style={{ fontSize:12, fontWeight:700, color: order.status==='approved' ? '#22c55e' : '#ef4444' }}>
                      {order.status==='approved' ? '✅ Validée' : '❌ Refusée'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {(activeTab === 'shops' || activeTab === 'artists') && (
          <>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#65676B' }} size={17} />
              <input placeholder={activeTab === 'shops' ? 'Rechercher une boutique...' : 'Rechercher un artiste...'} value={bizSearch} onChange={e => setBizSearch(e.target.value)}
                style={{ width: '100%', background: '#050505', border: '1px solid #232733', borderRadius: 12, padding: '10px 10px 10px 36px', color: '#E4E6EB', fontFamily: 'Poppins', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(activeTab === 'shops' ? filteredShops : filteredArtists).map(item => {
                const kind = activeTab === 'shops' ? 'shop' : 'artist';
                return (
                  <div key={item.id} style={{ background: '#050505', borderRadius: 14, padding: '12px 14px', border: item.verified ? '1px solid #1877F2' : '1px solid #232733' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#0B0D12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {item.photoURL ? <img src={item.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (kind === 'shop' ? <HiShoppingBag size={22} color="#06b6d4" /> : <HiMusicNote size={22} color="#ec4899" />)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: '#E4E6EB' }}>{item.name}</p>
                          {item.verified && <HiCheckCircle size={15} color="#1877F2" />}
                          {item.category && pill(item.category, '#0B0D12', '#65676B', '1px solid #232733')}
                        </div>
                        <p style={{ fontSize: 11, color: '#65676B', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <HiUserGroup size={11} /> {(item.followers || []).length} abonnés
                        </p>
                        <p onClick={() => copyId(item.id)} style={{ fontSize: 10.5, color: '#4b5563', cursor: 'pointer', marginTop: 1 }}>ID : {item.id}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button onClick={() => verifyBiz(kind, item)} style={{ flex: 1, background: item.verified ? '#232733' : 'linear-gradient(135deg,#1877F2,#42A5F5)', border: 'none', borderRadius: 18, padding: '7px 10px', color: item.verified ? '#1877F2' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Poppins' }}>
                        <HiCheckCircle size={13} /> {item.verified ? 'Retirer vérif.' : 'Vérifier'}
                      </button>
                      <button onClick={() => deleteBiz(kind, item)} style={{ flex: 1, background: '#3b0000', border: '1px solid #ef4444', borderRadius: 18, padding: '7px 10px', color: '#fca5a5', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Poppins' }}>
                        <HiTrash size={13} /> Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
              {(activeTab === 'shops' ? filteredShops : filteredArtists).length === 0 && (
                <p style={{ textAlign: 'center', color: '#65676B', padding: 30, fontSize: 13 }}>Aucun résultat</p>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
