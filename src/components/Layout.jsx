// src/components/Layout.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang }  from '../context/LanguageContext';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import { useMessages }       from '../hooks/useMessages';
import { collection, getDocs, query, orderBy, limit, where, onSnapshot } from 'firebase/firestore';
import { ref, set, onDisconnect, onValue } from 'firebase/database';
import { db, rtdb } from '../firebase';
import { subscribeUpload } from '../utils/uploadManager';
import {
  HiHome, HiOutlineHome, HiUser, HiOutlineUser,
  HiUserGroup, HiOutlineUserGroup, HiChat, HiOutlineChat,
  HiBell, HiOutlineBell, HiMenu, HiX, HiSearch, HiLogout, HiCog,
  HiOutlineCog, HiTag, HiFilm, HiPhotograph,
  HiBookmark, HiOutlineBookmark
} from 'react-icons/hi';

export default function Layout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { t }     = useLang();
  const { currentUser, userProfile, logout } = useAuth();
  const { theme } = useTheme();
  const { unreadCount: notifCount } = useNotifications();
  const { unreadCount: msgCount }   = useMessages();

  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [search,        setSearch]        = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], posts: [] });
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const [uploadState,   setUploadState]   = useState(null);
  useEffect(() => subscribeUpload(setUploadState), []);

  const searchRef   = useRef();
  const searchTimer = useRef();
  const prevNotif   = useRef(notifCount);
  const isDark = theme === 'dark';

  // ── Global online presence ────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const onlineRef = ref(rtdb, `online/${currentUser.uid}`);
    set(onlineRef, true);
    onDisconnect(onlineRef).set(false);
    return () => set(onlineRef, false);
  }, [currentUser]);

  // ── Play sound on new notification ────────────────────────
  useEffect(() => {
    // Feo : ny notification système (FCM) irery no maneno — tsy misy feo in-app intsony
    prevNotif.current = notifCount;
  }, [notifCount]);

  // Dock flottant style Telegram — icônes remplies, couleur par couleur
  // Dock flottant — 3 couleurs du logo uniquement : bleu / rose / doré
  const bottomNav = [
    { path: '/',                            AIcon: HiHome,      label: t('home'),          color: '#1877F2' },
    { path: '/reels',                       AIcon: HiFilm,      label: 'Vidéos',           color: '#FF2D8D' },
    { path: '/friends',                     AIcon: HiUserGroup, label: t('friends'),       color: '#F2B300' },
    { path: '/messages',                    AIcon: HiChat,      label: t('messages'),      color: '#1877F2', badge: msgCount },
    { path: '/notifications',               AIcon: HiBell,      label: t('notifications'), color: '#FF2D8D', badge: notifCount },
    { path: `/profile/${currentUser?.uid}`, AIcon: HiUser,      label: t('profile'),       color: '#F2B300' },
  ];

  const isActive = p => {
    if (p === '/') return location.pathname === '/';
    if (p.startsWith('/profile')) return location.pathname.startsWith('/profile');
    return location.pathname.startsWith(p);
  };

  async function handleSearch(val) {
    setSearch(val);
    if (!val.trim()) { setSearchResults({ users: [], posts: [] }); setSearchOpen(false); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const low = val.toLowerCase();

        // Search users
        const uSnap = await getDocs(collection(db, 'users'));
        const users = uSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => u.fullName?.toLowerCase().includes(low) || u.username?.toLowerCase().includes(low))
          .slice(0, 5);

        // Search posts (recent 80)
        const pSnap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(80)));
        const posts = pSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p =>
            p.content?.toLowerCase().includes(low) ||
            p.authorName?.toLowerCase().includes(low) ||
            (p.isSale && p.lieu?.toLowerCase().includes(low))
          )
          .slice(0, 8);

        setSearchResults({ users, posts });
        setSearchOpen(true);
      } catch {}
    }, 300);
  }

  useEffect(() => {
    const fn = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  async function handleLogout() {
    setDrawerOpen(false);
    // Mettre hors-ligne sans bloquer la déconnexion si ça échoue
    try { await set(ref(rtdb, `online/${currentUser.uid}`), false); } catch {}
    try { await logout(); } catch {}
    // Après signOut, PrivateRoute redirige automatiquement vers /login
    navigate('/login', { replace: true });
  }

  // Drawer nav — icônes classiques (même style que bottom nav)
  const drawerNav = [
    { path: '/',                            Icon: HiOutlineHome,      AIcon: HiHome,      label: t('home') },
    { path: '/friends',                     Icon: HiOutlineUserGroup, AIcon: HiUserGroup, label: t('friends') },
    { path: '/groups',                      Icon: HiOutlineUserGroup, AIcon: HiUserGroup, label: 'Groupes' },
    { path: '/saved',                       Icon: HiOutlineBookmark,  AIcon: HiBookmark,  label: 'Enregistrements' },
    { path: '/messages',                    Icon: HiOutlineChat,      AIcon: HiChat,      label: t('messages'),      badge: msgCount },
    { path: '/notifications',               Icon: HiOutlineBell,      AIcon: HiBell,      label: t('notifications'), badge: notifCount },
    { path: `/profile/${currentUser?.uid}`, Icon: HiOutlineUser,      AIcon: HiUser,      label: t('profile') },
    { path: '/settings',                    Icon: HiOutlineCog,       AIcon: HiCog,       label: t('settings') },
  ];

  const bg   = isDark ? '#050505' : 'white';
  const bdr  = isDark ? '#232733' : '#E4E6EB';
  const text = isDark ? '#E4E6EB' : '#050505';

  // Categorize post results
  const ventes  = searchResults.posts.filter(p => p.isSale);
  const videos  = searchResults.posts.filter(p => !p.isSale && p.mediaType === 'video');
  const photos  = searchResults.posts.filter(p => !p.isSale && p.mediaType === 'image');
  const textPosts = searchResults.posts.filter(p => !p.isSale && p.mediaType !== 'video' && p.mediaType !== 'image');
  const hasResults = searchResults.users.length > 0 || searchResults.posts.length > 0;

  function SearchCategory({ icon, label, items, onItem }) {
    if (!items.length) return null;
    return (
      <>
        <div style={{ padding: '7px 14px 3px', fontSize: 10, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
          {icon} {label}
        </div>
        {items.map(p => (
          <div key={p.id} onClick={() => onItem(p)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', borderBottom: `1px solid ${bdr}` }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: isDark ? '#232733' : '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
              {p.isSale ? '🏷️' : p.mediaType === 'video' ? '🎬' : p.mediaURL ? '📸' : '📝'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 12, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content || 'Publication'}</p>
              <p style={{ fontSize: 11, color: '#65676B' }}>{p.authorName}{p.isSale && p.price ? ` · ${p.price.toLocaleString()} Ar` : ''}</p>
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: isDark ? '#0B0D12' : '#FFFFFF', paddingBottom: 96, color: text }}>

      {/* Overlay */}
      {drawerOpen && <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }} />}

      {/* ── Drawer ──────────────────────────────────────────────── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, background: bg, zIndex: 201,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
        boxShadow: drawerOpen ? '4px 0 24px rgba(24,119,242,.18)' : 'none',
        borderRight: `1px solid ${bdr}`,
      }}>
        {/* Header */}
        <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src='/tsengo-logo.png' alt="Traingo" style={{ width:48, height:48, objectFit:"contain" }}/>
            <span style={{ fontWeight: 900, fontSize: 18 }}><span style={{ color:'#1877F2' }}>trai</span><span style={{ color:'#FF2D8D' }}>ngo</span></span>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={22} /></button>
        </div>

        {/* User mini */}
        {userProfile && (
          <div onClick={() => { navigate(`/profile/${currentUser?.uid}`); setDrawerOpen(false); }}
            style={{ padding: '14px 16px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <img src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.fullName || 'U')}&background=1877F2&color=fff`}
              alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E4E6EB' }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userProfile.fullName}
                {userProfile.isVip && <img src='/vip-badge.png' style={{ width:24, height:24, marginLeft:5, verticalAlign:'middle', display:'inline-block', flexShrink:0, objectFit:'contain' }} alt='VIP'/>}
              </p>
              <p style={{ fontSize: 12, color: '#65676B' }}>@{userProfile.username}</p>
            </div>
          </div>
        )}

        {/* Nav — icônes classiques */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {drawerNav.map(item => {
            const active = isActive(item.path);
            const IconComp = active ? item.AIcon : item.Icon;
            return (
              <button key={item.path} onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
                  background: active ? (isDark ? '#232733' : '#F0F2F5') : 'none', border: 'none',
                  borderLeft: `3px solid ${active ? '#1877F2' : 'transparent'}`, cursor: 'pointer',
                  color: active ? '#1877F2' : isDark ? '#65676B' : '#65676B',
                  fontWeight: active ? 700 : 500, fontSize: 15, textAlign: 'left',
                }}>
                <IconComp size={21} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge > 0 && <span style={{ background: '#1877F2', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{item.badge > 9 ? '9+' : item.badge}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '8px 0', borderTop: `1px solid ${bdr}` }}>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#1877F2', fontWeight: 600, fontSize: 15 }}>
            <HiLogout size={20} /> Se déconnecter
          </button>
        </div>
      </aside>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="navbar" style={{ position: 'sticky', top: 0, zIndex: 100, background: bg, borderBottom: `1px solid ${bdr}` }}>

        {/* Rangée unique (format Facebook) : Menu | Logo | Recherche ronde | Messages rond */}
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#050505', flexShrink: 0, padding: 2 }}>
            <HiMenu size={26} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1, minWidth: 0 }} onClick={() => navigate('/')}>
            <img src='/tsengo-logo.png' alt="Traingo" style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />
            <span style={{ fontWeight: 900, fontSize: 21, letterSpacing: -1, whiteSpace: 'nowrap' }}>
              <span style={{ color: '#1877F2' }}>trai</span><span style={{ color: '#FF2D8D' }}>ngo</span>
            </span>
          </div>

          {/* Recherche — bouton rond (format Facebook), à gauche du bouton messages */}
          <button onClick={() => navigate('/search')}
            style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0F2F5', border: 'none', cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HiSearch size={20} />
          </button>

          {/* Messages — bouton rond */}
          <button onClick={() => navigate('/messages')}
            style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', background: '#F0F2F5', border: 'none', cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HiChat size={20} />
            {msgCount > 0 && (
              <span style={{ position: 'absolute', top: -2, right: -2, background: '#FF1744', color: 'white', borderRadius: '50%', minWidth: 17, height: 17, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', border: '2px solid white' }}>
                {msgCount > 9 ? '9+' : msgCount}
              </span>
            )}
          </button>
        </div>

      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: 0, width: '100%' }}>{children}</main>

      {/* ── Indicateur d'upload en arrière-plan ────────────────── */}
      {uploadState && (
        <div style={{ position: 'fixed', left: 16, right: 16, bottom: 92, zIndex: 220, maxWidth: 480, margin: '0 auto',
          background: uploadState.status === 'error' ? '#FDE8EF' : 'white',
          border: `1.5px solid ${uploadState.status === 'error' ? '#FF2D8D' : '#E4E6EB'}`,
          borderRadius: 16, padding: '10px 14px', boxShadow: '0 6px 24px rgba(5,5,5,.18)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, fontFamily: 'Poppins' }}>
            {uploadState.status === 'compressing' && <>🎞️ <span>Compression de la vidéo — {uploadState.pct}%</span></>}
            {uploadState.status === 'uploading' && <>📤 <span>{uploadState.label} — {uploadState.pct}%</span></>}
            {uploadState.status === 'saving'    && <>⏳ <span>Publication en cours...</span></>}
            {uploadState.status === 'done'      && <>✅ <span style={{ color: '#1877F2' }}>Publié !</span></>}
            {uploadState.status === 'error'     && <>⚠️ <span style={{ color: '#FF2D8D' }}>Échec : {uploadState.error}</span></>}
          </div>
          {(uploadState.status === 'uploading' || uploadState.status === 'compressing') && (
            <div style={{ height: 5, background: '#F0F2F5', borderRadius: 4, marginTop: 7, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${uploadState.pct}%`, background: 'linear-gradient(90deg,#1877F2,#FF2D8D,#F2B300)', borderRadius: 4, transition: 'width .3s' }} />
            </div>
          )}
          {(uploadState.status === 'uploading' || uploadState.status === 'saving' || uploadState.status === 'compressing') && (
            <p style={{ fontSize: 10, color: '#65676B', marginTop: 5, fontFamily: 'Poppins' }}>Vous pouvez continuer à naviguer — l'envoi continue en arrière-plan.</p>
          )}
        </div>
      )}

      {/* ── Dock flottant (style Telegram) ─────────────────────── */}
      <nav className="floating-dock">
        {bottomNav.map(({ path, AIcon, label, badge, color }) => {
          const active = isActive(path);
          return (
            <button key={path} className={`dock-item ${active ? 'active' : ''}`} onClick={() => navigate(path)}
              style={{ color: active ? color : (isDark ? '#8A93A6' : '#65676B'), '--dock-glow': color + '66' }}>
              <span className="dock-icon" style={{ background: active ? color : (color + '22') }}>
                <AIcon size={21} color={active ? 'white' : color} />
                {badge > 0 && <span className="notif-badge">{badge > 9 ? '9+' : badge}</span>}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}