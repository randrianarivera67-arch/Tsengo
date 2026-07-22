// src/pages/AdminPanel.jsx
// Panel Admin complet : Utilisateurs (ID, VIP, blocage, désactivation),
// Boost, Boutiques, Artistes, installation PWA + statistiques détaillées.
import { useState, useEffect } from 'react';
import {
  collection, query, getDocs, doc, updateDoc, deleteDoc,
  orderBy, getDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  HiShieldCheck, HiStar, HiSearch, HiLightningBolt, HiX, HiClock,
  HiChevronDown, HiChevronUp, HiBan, HiCheckCircle, HiTrash,
  HiDownload, HiDuplicate, HiShoppingBag, HiMusicNote, HiUserGroup, HiMenu,
  HiUsers, HiSpeakerphone
} from 'react-icons/hi';
import { isStandalone, canInstall, onInstallChange, promptInstall } from '../utils/pwaInstall';
import PushDiagnostic from '../components/PushDiagnostic';
import { HiMail, HiKey } from 'react-icons/hi';
import { SkeletonList } from '../components/Skeleton';
import AdminDashboard from './AdminDashboard';
import { NavIcon } from '../components/AdminIcons';
import { useOnline } from '../hooks/useOnline';

export default function AdminPanel() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const onlineMap = useOnline();          // { uid: true|false } → isa MARINA

  const [isAdmin, setIsAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedUser, setExpandedUser] = useState(null);
  const [resetSentFor, setResetSentFor] = useState(null);

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
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [reports, setReports] = useState([]);
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
          loadUsers(); loadPosts(); loadShops(); loadArtists(); loadBoostOrders(); loadReports();
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

  async function loadReports() {
    try {
      const snap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc')));
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { setReports([]); }
  }
  async function resolveReport(r) {
    try {
      await updateDoc(doc(db, 'reports', r.id), { status: 'resolved', processedAt: new Date().toISOString() });
      setReports(prev => prev.map(x => x.id === r.id ? { ...x, status: 'resolved' } : x));
      showMsg('✅ Signalement traité');
    } catch (e) { showMsg('❌ Erreur : ' + (e?.message || e)); }
  }
  async function dismissReport(r) {
    try {
      await updateDoc(doc(db, 'reports', r.id), { status: 'dismissed', processedAt: new Date().toISOString() });
      setReports(prev => prev.map(x => x.id === r.id ? { ...x, status: 'dismissed' } : x));
      showMsg('Signalement ignoré');
    } catch (e) { showMsg('❌ Erreur : ' + (e?.message || e)); }
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
        boostZones: order.zones || null, boostObjective: order.objective || null,
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
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#65676B', fontFamily: 'Poppins' }}>Vérification des droits...</p>
      </div>
    );
  }
  if (isAdmin === false) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 32, maxWidth: 340, textAlign: 'center', border: '1px solid #E4E6EB', fontFamily: 'Poppins' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <h2 style={{ color: '#050505', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Accès refusé</h2>
          <p style={{ color: '#65676B', fontSize: 14, marginBottom: 24 }}>Vous n'avez pas les droits administrateur.</p>
          <button onClick={() => navigate('/')} style={{ background: 'linear-gradient(135deg,#FF2D8D,#FF7AB8)', color: 'white', border: 'none', borderRadius: 25, padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins' }}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const nPendingOrders = boostOrders.filter(o => o.status === 'pending').length;
  const nPendingReports = reports.filter(r => r.status === 'pending' || !r.status).length;
  const NAV_ITEMS = [
    { key: 'dashboard', label: 'Tableau de bord', group: '', ic: 'dashboard' },
    { key: 'users',   label: 'Utilisateurs',    group: 'GESTION', ic: 'users' },
    { key: 'shops',   label: 'Boutiques',       group: 'GESTION', ic: 'shop' },
    { key: 'artists', label: 'Artistes',        group: 'GESTION', ic: 'artist' },
    { key: 'boost',   label: 'Boost (manuel)',  group: 'GESTION', ic: 'boost' },
    { key: 'orders',  label: 'Commandes Boost', group: 'GESTION', ic: 'orders', badge: nPendingOrders },
    { key: 'reports', label: 'Signalements',    group: 'GESTION', ic: 'report', badge: nPendingReports },
  ].map(it => ({ ...it, icon: <NavIcon name={it.ic} size={19} color={activeTab === it.key ? '#FF2D8D' : '#65676B'} glow={activeTab === it.key} /> }));

  async function resetUserPassword(user) {
    if (!user.email) { showMsg('❌ Ce compte n\'a pas d\'email associé'); return; }
    if (!window.confirm(`Envoyer un email de réinitialisation de mot de passe à ${user.email} ?`)) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSentFor(user.id);
      showMsg('✅ Email de réinitialisation envoyé à ' + user.email);
      setTimeout(() => setResetSentFor(null), 4000);
    } catch (err) {
      showMsg('❌ Erreur : ' + (err?.message || err));
    }
  }

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setActiveTab(key)}
      style={{
        flex: 1, padding: '10px 6px', borderRadius: 14, border: activeTab === key ? 'none' : '1px solid #E4E6EB',
        cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap',
        background: activeTab === key ? 'linear-gradient(135deg,#FF2D8D,#FF7AB8)' : '#FFFFFF',
        color: activeTab === key ? 'white' : '#65676B',
      }}>{label}</button>
  );

  const pill = (txt, bg, color, border) => (
    <span style={{ background: bg, color, fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6, border: border || 'none' }}>{txt}</span>
  );

  const isDash = activeTab === 'dashboard';
  const SIDE_GROUPS = ['', 'GESTION'];

  return (
    <div className="adm-shell" style={{ minHeight: '100vh', background: '#F0F2F5', fontFamily: 'Poppins, sans-serif', color: '#050505' }}>
      <style>{`
        .adm-shell{display:flex}
        .adm-side{display:none}
        .adm-main{flex:1;min-width:0;padding:16px}
        .adm-hide-sm{display:none}
        @media(min-width:560px){.adm-hide-sm{display:inline}}
        @media(min-width:1024px){
          .adm-side{display:block;width:238px;flex-shrink:0;background:#fff;border-right:1px solid #EAECF0;height:100vh;position:sticky;top:0;overflow-y:auto;padding:16px 12px}
          .adm-main{padding:20px 24px}
          .adm-burger{display:none !important}
        }
        .adm-side .it{width:100%;display:flex;align-items:center;gap:11px;padding:10px 12px;border:none;background:none;border-radius:11px;cursor:pointer;text-align:left;font-family:Poppins;font-size:13.5px;color:#344054;margin-bottom:2px}
        .adm-side .it.on{background:#FFF0F7;color:#FF2D8D;font-weight:700}
        .adm-side .gr{font-size:10.5px;font-weight:700;color:#98A2B3;letter-spacing:.6px;padding:12px 12px 6px}
        .adm-top{display:flex;align-items:center;gap:10px;margin-bottom:16px}
        .adm-search{flex:1;min-width:0;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #EAECF0;border-radius:12px;padding:9px 12px}
        .adm-search input{border:none;outline:none;background:none;font-family:Poppins;font-size:13px;width:100%;color:#101828}
        .dark .adm-shell{background:#18191A;color:#E4E6EB}
        .dark .adm-side{background:#242526;border-color:#3A3B3C}
        .dark .adm-side .it{color:#E4E6EB}
        .dark .adm-search{background:#242526;border-color:#3A3B3C}
        .dark .adm-search input{color:#E4E6EB}
      `}</style>

      {/* ── Sidebar (ordinateur) ── */}
      <aside className="adm-side">
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 10px 14px' }}>
          <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,#C026D3,#FF2D8D)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <HiShieldCheck size={21} color="#fff" />
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ fontWeight:800, fontSize:16, lineHeight:1.1 }}>Trengo</p>
            <p style={{ fontSize:10.5, color:'#98A2B3' }}>Panel Admin</p>
          </div>
        </div>
        {SIDE_GROUPS.map(g => (
          <div key={g || 'main'}>
            {g ? <p className="gr">{g}</p> : null}
            {NAV_ITEMS.filter(n => (n.group || '') === g).map(item => (
              <button key={item.key} className={'it' + (activeTab === item.key ? ' on' : '')} onClick={() => setActiveTab(item.key)}>
                <span style={{ display:'flex' }}>{item.icon}</span>
                <span style={{ flex:1 }}>{item.label}</span>
                {item.badge > 0 && <span style={{ background:'#FF2D8D', color:'#fff', fontSize:10.5, fontWeight:700, borderRadius:9, padding:'1px 7px' }}>{item.badge}</span>}
              </button>
            ))}
          </div>
        ))}
        <div style={{ borderTop:'1px solid #EAECF0', marginTop:10, display:'flex', alignItems:'center', gap:10, padding:'12px 10px 0' }}>
          {userProfile?.photoURL
            ? <img src={userProfile.photoURL} alt="" style={{ width:34, height:34, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
            : <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#7B3FE4,#C026D3)', flexShrink:0 }} />}
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:12.5, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{userProfile?.fullName || 'Admin'}</p>
            <p style={{ fontSize:10.5, color:'#98A2B3' }}>Super Administrateur</p>
          </div>
        </div>
      </aside>

      <div className="adm-main">
        {/* ── Barre du haut ── */}
        <div className="adm-top">
          <button className="adm-burger" onClick={() => setNavMenuOpen(true)}
            style={{ width:38, height:38, borderRadius:11, background:'#fff', border:'1px solid #EAECF0', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <NavIcon name="menu" size={19} color="#344054" />
          </button>
          <div className="adm-search">
            <NavIcon name="search" size={17} color="#98A2B3" />
            <input value={search} onChange={e => { setSearch(e.target.value); if (activeTab === 'dashboard' && e.target.value) setActiveTab('users'); }}
              placeholder="Rechercher (utilisateur, email, ID...)" />
          </div>
          <button onClick={() => navigate('/')}
            style={{ display:'flex', alignItems:'center', gap:7, background:'#fff', border:'1px solid #EAECF0', borderRadius:11, padding:'9px 13px', cursor:'pointer', fontFamily:'Poppins', fontSize:12.5, fontWeight:600, color:'#344054', flexShrink:0 }}>
            <NavIcon name="eye" size={17} color="#667085" /><span className="adm-hide-sm">Voir le site</span>
          </button>
          <div style={{ position:'relative', flexShrink:0, display:'flex' }}>
            <NavIcon name="bell" size={21} color="#667085" />
            {(nPendingOrders + nPendingReports) > 0 && (
              <span style={{ position:'absolute', top:-5, right:-7, background:'#FF2D8D', color:'#fff', fontSize:9.5, fontWeight:700, borderRadius:9, padding:'1px 5px' }}>{nPendingOrders + nPendingReports}</span>
            )}
          </div>
        </div>

      <div style={{ maxWidth: isDash ? 1180 : 700, margin: '0 auto' }}>

        {!isDash && (<>
        {/* Installation PWA */}
        <div style={{ background: 'linear-gradient(135deg,#1877F218,#00C85311)', border: '1px solid #1877F244', borderRadius: 14, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <HiDownload size={22} color="#3b82f6" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#050505' }}>Installer l'application Trengo</p>
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
              background: installState === 'ready' ? 'linear-gradient(135deg,#1877F2,#42A5F5)' : '#E4E6EB',
              color: installState === 'ready' ? '#fff' : '#65676B',
            }}>
            {installState === 'installed' ? 'Installée' : 'Installer'}
          </button>
        </div>

        {/* Diagnostic Push */}
        <PushDiagnostic uid={currentUser?.uid} />
        </>)}


        {navMenuOpen && (
          <div onClick={() => setNavMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '10px 0 24px', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ width: 40, height: 4, background: '#E4E6EB', borderRadius: 2, margin: '6px auto 14px' }} />
              <p style={{ fontWeight: 800, fontSize: 15, color: '#050505', padding: '0 20px 10px' }}>Menu Admin</p>
              {NAV_ITEMS.map(item => (
                <button key={item.key} onClick={() => { setActiveTab(item.key); setNavMenuOpen(false); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: activeTab === item.key ? '#FFF0F7' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                  <span style={{ flex: 1, fontWeight: activeTab === item.key ? 700 : 500, fontSize: 15, color: activeTab === item.key ? '#FF2D8D' : '#050505' }}>{item.label}</span>
                  {item.badge > 0 && <span style={{ background: '#FF2D8D', color: 'white', fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '2px 8px' }}>{item.badge}</span>}
                </button>
              ))}
              <div style={{ borderTop: '1px solid #F0F2F5', marginTop: 6, paddingTop: 6 }}>
                <button onClick={() => { setNavMenuOpen(false); navigate('/'); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#65676B', fontSize: 15 }}>
                  ← Retour à l'accueil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Flash message */}
        {message && (
          <div style={{ background: message.startsWith('❌') ? '#3b0000' : '#14532d', border: `1px solid ${message.startsWith('❌') ? '#ef4444' : '#16a34a'}`, borderRadius: 12, padding: '10px 16px', marginBottom: 14, fontSize: 14, color: message.startsWith('❌') ? '#fca5a5' : '#86efac', wordBreak: 'break-all' }}>
            {message}
          </div>
        )}

        {/* ── TABLEAU DE BORD ── */}
        {isDash && (
          <AdminDashboard
            users={users} posts={posts} shops={shops} artists={artists}
            onlineMap={onlineMap}
            adminName={(userProfile?.fullName || 'Admin').split(' ')[0]}
          />
        )}

        {!isDash && (<>
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
            <div key={s.label} style={{ background: '#FFFFFF', borderRadius: 14, padding: '12px 6px', textAlign: 'center', border: '1px solid #E4E6EB', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <p style={{ fontWeight: 800, fontSize: 19, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: 9.5, color: '#65676B' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Section active + accès au menu */}
        <button onClick={() => setNavMenuOpen(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', border: '1px solid #E4E6EB', borderRadius: 14, padding: '12px 16px', marginBottom: 18, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: '#050505' }}>
            {NAV_ITEMS.find(n => n.key === activeTab)?.icon} {NAV_ITEMS.find(n => n.key === activeTab)?.label}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {boostOrders.filter(o=>o.status==='pending').length > 0 && activeTab !== 'orders' && (
              <span style={{ background: '#FF2D8D', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '2px 7px' }}>{boostOrders.filter(o=>o.status==='pending').length}</span>
            )}
            {reports.filter(r=>r.status==='pending'||!r.status).length > 0 && activeTab !== 'reports' && (
              <span style={{ background: '#F2B300', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '2px 7px' }}>{reports.filter(r=>r.status==='pending'||!r.status).length}</span>
            )}
            <HiChevronDown size={18} color="#65676B" />
          </span>
        </button>
        </>)}

        {/* ── TAB USERS ── */}
        {activeTab === 'users' && (
          <>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#65676B' }} size={17} />
              <input placeholder="Rechercher (nom, @, email, ID)..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #E4E6EB', borderRadius: 12, padding: '10px 10px 10px 36px', color: '#050505', fontFamily: 'Poppins', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            {loading ? <SkeletonList rows={5} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredUsers.map(user => (
                  <div key={user.id} style={{ background: '#FFFFFF', borderRadius: 14, padding: '12px 14px', border: user.isBanned ? '1px solid #ef4444' : user.disabled ? '1px solid #f59e0b' : user.isVip ? '1px solid #1877F2' : '1px solid #E4E6EB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}>
                      <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'U')}&background=1877F2&color=fff`} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, opacity: user.disabled ? 0.5 : 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: '#050505' }}>{user.fullName}</p>
                          {user.isVip && <img src='/vip-badge.png' style={{ width: 22, height: 22, flexShrink: 0, objectFit: 'contain' }} alt='VIP' />}
                          {user.isAdmin && pill('ADMIN', '#1d4ed8', 'white')}
                          {user.isBanned && pill('BLOQUÉ', '#7f1d1d', '#fca5a5')}
                          {user.disabled && pill('DÉSACTIVÉ', '#78350f', '#fcd34d')}
                        </div>
                        <p style={{ fontSize: 12, color: '#65676B' }}>@{user.username}</p>
                      </div>
                      {expandedUser === user.id ? <HiChevronUp size={18} color="#65676B" style={{ flexShrink: 0 }} /> : <HiChevronDown size={18} color="#65676B" style={{ flexShrink: 0 }} />}
                    </div>
                    {expandedUser === user.id && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0F2F5' }}>
                        <p onClick={() => copyId(user.email)} style={{ fontSize: 12.5, color: '#050505', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 6 }}>
                          <HiMail size={14} color="#1877F2" /> {user.email || '— aucun email —'}
                        </p>
                        <p onClick={() => copyId(user.id)} style={{ fontSize: 11, color: '#65676B', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 10 }}>
                          <HiDuplicate size={12} /> ID : {user.id}
                        </p>
                        <button onClick={() => resetUserPassword(user)} disabled={resetSentFor === user.id}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: resetSentFor === user.id ? '#dcfce7' : '#F0F2F5', border: 'none', borderRadius: 12, padding: '9px 0', color: resetSentFor === user.id ? '#16a34a' : '#050505', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'Poppins', marginBottom: 10 }}>
                          <HiKey size={14} /> {resetSentFor === user.id ? 'Email envoyé ✓' : 'Réinitialiser le mot de passe'}
                        </button>
                      </div>
                    )}
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <button onClick={() => toggleVip(user)} style={{ flex: 1, minWidth: 90, background: user.isVip ? '#E4E6EB' : 'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border: 'none', borderRadius: 18, padding: '7px 10px', color: user.isVip ? '#1877F2' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Poppins' }}>
                        <HiStar size={13} /> {user.isVip ? 'Retirer VIP' : 'VIP'}
                      </button>
                      <button onClick={() => toggleBan(user)} style={{ flex: 1, minWidth: 90, background: user.isBanned ? '#E4E6EB' : '#3b0000', border: '1px solid #ef4444', borderRadius: 18, padding: '7px 10px', color: '#fca5a5', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Poppins' }}>
                        <HiBan size={13} /> {user.isBanned ? 'Débloquer' : 'Bloquer'}
                      </button>
                      <button onClick={() => toggleDisable(user)} style={{ flex: 1, minWidth: 90, background: user.disabled ? '#E4E6EB' : '#3a2a00', border: '1px solid #f59e0b', borderRadius: 18, padding: '7px 10px', color: '#fcd34d', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Poppins' }}>
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
                  Saisissez le nombre de jours. Le post remonte en tête du fil avec le badge <strong style={{ color: '#a855f7' }}>Sponsorisé</strong>. ⚠️ Nécessite les règles Firestore <strong style={{ color: '#050505' }}>isAdmin</strong> à jour.
                </p>
              </div>
            </div>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#65676B' }} size={17} />
              <input placeholder="Rechercher une publication..." value={boostSearch} onChange={e => setBoostSearch(e.target.value)}
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #E4E6EB', borderRadius: 12, padding: '10px 10px 10px 36px', color: '#050505', fontFamily: 'Poppins', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredPosts.map(post => {
                const timeLeft = boostTimeLeft(post);
                const isExpanded = expandedPost === post.id;
                return (
                  <div key={post.id} style={{ background: '#FFFFFF', borderRadius: 16, border: post.isBoosted ? '1px solid #a855f7' : '1px solid #E4E6EB', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setExpandedPost(isExpanded ? null : post.id)}>
                      <img src={post.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'U')}&background=1877F2&color=fff`} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ fontWeight: 600, fontSize: 13, color: '#050505' }}>{post.authorName}</p>
                          {post.isBoosted && <span style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 2 }}><HiLightningBolt size={9} /> Boosté</span>}
                        </div>
                        <p style={{ fontSize: 11, color: '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{post.content || (post.mediaURL ? '📎 Media' : '—')}</p>
                        {post.isBoosted && timeLeft && <p style={{ fontSize: 10, color: '#a855f7', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}><HiClock size={10} /> {timeLeft} · {post.boostDays}j total</p>}
                      </div>
                      <span style={{ color: '#65676B', flexShrink: 0 }}>{isExpanded ? <HiChevronUp size={18} /> : <HiChevronDown size={18} />}</span>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #E4E6EB', padding: '14px' }}>
                        {post.content && <p style={{ fontSize: 13, color: '#050505', marginBottom: 10, lineHeight: 1.5, background: '#F0F2F5', borderRadius: 10, padding: '10px 12px' }}>{post.content.slice(0, 150)}{post.content.length > 150 ? '...' : ''}</p>}
                        {post.mediaURL && post.mediaType === 'image' && <img src={post.mediaURL} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />}
                        {post.isBoosted && (
                          <div style={{ background: '#2e1065', borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <p style={{ color: '#d8b4fe', fontWeight: 600, fontSize: 13 }}>✅ Boost actif — {post.boostDays}j</p>
                              <p style={{ color: '#a855f7', fontSize: 12 }}>{timeLeft}</p>
                            </div>
                            <button onClick={() => deactivateBoost(post)} disabled={boostLoading[post.id]} style={{ background: '#E4E6EB', border: '1px solid #1877F2', borderRadius: 20, padding: '6px 14px', color: '#1877F2', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: 4 }}><HiX size={13} /> Retirer boost</button>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <HiClock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#65676B' }} size={16} />
                            <input type="number" min="1" max="365" placeholder="Nb. jours (ex: 7)" value={boostDays[post.id] || ''} onChange={e => setBoostDays(p => ({ ...p, [post.id]: e.target.value }))}
                              style={{ width: '100%', background: '#F0F2F5', border: '1px solid #E4E6EB', borderRadius: 12, padding: '10px 14px 10px 40px', color: '#050505', fontFamily: 'Poppins', fontSize: 14, boxSizing: 'border-box' }} />
                          </div>
                          <span style={{ color: '#65676B', fontSize: 13, fontWeight: 600 }}>j</span>
                          <button onClick={() => activateBoost(post)} disabled={boostLoading[post.id] || !boostDays[post.id]}
                            style={{ background: (!boostDays[post.id] || boostLoading[post.id]) ? '#E4E6EB' : 'linear-gradient(135deg,#7c3aed,#a855f7)', border: 'none', borderRadius: 20, padding: '10px 18px', color: 'white', cursor: boostDays[post.id] ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, opacity: boostLoading[post.id] ? 0.6 : 1 }}>
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
        {activeTab === 'reports' && (
          <div>
            {reports.length === 0 ? (
              <p style={{ textAlign:'center', color:'#65676B', padding:30, fontSize:13 }}>Aucun signalement</p>
            ) : reports.map(r => (
              <div key={r.id} style={{ background:'#FFFFFF', borderRadius:14, padding:'12px 14px', marginBottom:10, border: (r.status==='pending'||!r.status) ? '1px solid #F2B300' : '1px solid #E4E6EB', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#65676B', textTransform:'uppercase' }}>
                    {r.type === 'post' ? '📝 Publication' : r.type === 'shop' ? '🛍️ Boutique' : r.type === 'artist' ? '🎵 Artiste' : '👤 Compte'}
                  </span>
                  {(r.status==='pending'||!r.status)
                    ? <span style={{ fontSize:10, fontWeight:700, color:'#F2B300' }}>EN ATTENTE</span>
                    : <span style={{ fontSize:10, fontWeight:700, color: r.status==='resolved' ? '#22c55e' : '#65676B' }}>{r.status==='resolved' ? 'TRAITÉ' : 'IGNORÉ'}</span>}
                </div>
                <p style={{ fontWeight:800, fontSize:14, marginTop:6, color:'#050505' }}>{r.motif || 'Motif non précisé'}</p>
                {r.detail && <p style={{ fontSize:12.5, color:'#65676B', marginTop:2 }}>{r.detail}</p>}
                <p style={{ fontSize:12, color:'#65676B', marginTop:6 }}>
                  Cible : <b>{r.targetAuthor || r.targetId}</b> · Signalé par <b>{r.reportedByName || r.reportedBy}</b>
                </p>
                {(r.status==='pending'||!r.status) && (
                  <div style={{ display:'flex', gap:8, marginTop:10 }}>
                    <button onClick={() => resolveReport(r)} style={{ flex:1, background:'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border:'none', borderRadius:16, padding:'9px 0', color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins' }}>✅ Traité</button>
                    <button onClick={() => dismissReport(r)} style={{ flex:1, background:'#F0F2F5', border:'none', borderRadius:16, padding:'9px 0', color:'#65676B', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins' }}>Ignorer</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            {ordersLoading ? (
              <SkeletonList rows={3} />
            ) : boostOrders.length === 0 ? (
              <p style={{ textAlign:'center', color:'#65676B', padding:30, fontSize:13 }}>Aucune commande de boost</p>
            ) : boostOrders.map(order => (
              <div key={order.id} style={{ background:'#FFFFFF', borderRadius:14, padding:'12px 14px', marginBottom:10, border: order.status==='pending' ? '1px solid #a855f7' : '1px solid #E4E6EB' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <img src={order.requesterPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(order.requesterName||'U')}&background=1877F2&color=fff`} alt="" style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:13, color:'#050505' }}>{order.requesterName}</p>
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
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #E4E6EB', borderRadius: 12, padding: '10px 10px 10px 36px', color: '#050505', fontFamily: 'Poppins', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(activeTab === 'shops' ? filteredShops : filteredArtists).map(item => {
                const kind = activeTab === 'shops' ? 'shop' : 'artist';
                return (
                  <div key={item.id} style={{ background: '#FFFFFF', borderRadius: 14, padding: '12px 14px', border: item.verified ? '1px solid #1877F2' : '1px solid #E4E6EB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {item.photoURL ? <img src={item.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (kind === 'shop' ? <HiShoppingBag size={22} color="#06b6d4" /> : <HiMusicNote size={22} color="#ec4899" />)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: '#050505' }}>{item.name}</p>
                          {item.verified && <HiCheckCircle size={15} color="#1877F2" />}
                          {item.category && pill(item.category, '#F0F2F5', '#65676B', '1px solid #E4E6EB')}
                        </div>
                        <p style={{ fontSize: 11, color: '#65676B', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <HiUserGroup size={11} /> {(item.followers || []).length} abonnés
                        </p>
                        <p onClick={() => copyId(item.id)} style={{ fontSize: 10.5, color: '#4b5563', cursor: 'pointer', marginTop: 1 }}>ID : {item.id}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button onClick={() => verifyBiz(kind, item)} style={{ flex: 1, background: item.verified ? '#E4E6EB' : 'linear-gradient(135deg,#1877F2,#42A5F5)', border: 'none', borderRadius: 18, padding: '7px 10px', color: item.verified ? '#1877F2' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Poppins' }}>
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
    </div>
  );
}
