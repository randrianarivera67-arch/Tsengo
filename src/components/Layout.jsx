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
import { parseAppLink } from '../utils/appLink';
// identity.js neutralisé — import retiré
import { getCart, subscribeCart } from '../utils/cart';
import { NeonChart } from './NeonIcons';
import { subscribeUpload } from '../utils/uploadManager';
import {
  HiHome, HiOutlineHome, HiUser, HiOutlineUser,
  HiUserGroup, HiOutlineUserGroup, HiChat, HiOutlineChat, HiPaperAirplane, HiOutlinePaperAirplane,
  HiBell, HiOutlineBell, HiMenu, HiX, HiSearch, HiLogout, HiCog,
  HiOutlineCog, HiTag, HiFilm, HiPhotograph,
  HiBookmark, HiOutlineBookmark, HiCalendar, HiSpeakerphone, HiShoppingBag, HiChevronRight,
  HiMicrophone, HiIdentification, HiDocumentText, HiChartBar, HiSwitchHorizontal, HiCheck, HiShoppingCart, HiShieldCheck,
} from 'react-icons/hi';

// Icône "JEJO" — wordmark rose clay 3D + étoiles + smiley (style bijou)
function JejoIcon({ w = 90 }) {
  return (
    <svg width={w} height={w * 0.5} viewBox="0 0 130 64" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="jejoTxt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF7DC0"/><stop offset="45%" stopColor="#FF2E8E"/><stop offset="100%" stopColor="#DA0F68"/>
        </linearGradient>
        <radialGradient id="jejoSm" cx="36%" cy="30%" r="80%">
          <stop offset="0" stopColor="#FFA6D2"/><stop offset="50%" stopColor="#FF3D95"/><stop offset="100%" stopColor="#D80F6C"/>
        </radialGradient>
        <linearGradient id="jejoStar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFC0E2"/><stop offset="1" stopColor="#FF2D8D"/>
        </linearGradient>
        <filter id="jejoSh" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.4" floodColor="#C60E62" floodOpacity="0.45"/>
        </filter>
      </defs>
      <path d="M10 32 C12.5 32 13.5 25 14 22.5 C14.5 25 15.5 32 18 32 C15.5 32 14.5 39 14 41.5 C13.5 39 12.5 32 10 32 Z" fill="url(#jejoStar)"/>
      <path d="M106 14 C107.8 14 108.5 9.5 109 7.8 C109.5 9.5 110.2 14 112 14 C110.2 14 109.5 18.5 109 20.2 C108.5 18.5 107.8 14 106 14 Z" fill="url(#jejoStar)"/>
      <g filter="url(#jejoSh)">
        <text x="20" y="45" fontFamily="Poppins, Arial, sans-serif" fontWeight="900" fontSize="38" fill="url(#jejoTxt)" letterSpacing="-1.5">JEJO</text>
      </g>
      <text x="20" y="45" fontFamily="Poppins, Arial, sans-serif" fontWeight="900" fontSize="38" fill="#fff" letterSpacing="-1.5" style={{ opacity: 0.28, clipPath: 'inset(0 0 55% 0)' }}>JEJO</text>
      <g transform="translate(110,40)" filter="url(#jejoSh)">
        <circle r="12" fill="url(#jejoSm)"/>
        <ellipse cx="-3.6" cy="-4.6" rx="4" ry="2.6" fill="#fff" opacity="0.5"/>
        <circle cx="-4" cy="-1" r="1.7" fill="#800a45"/><circle cx="4" cy="-1" r="1.7" fill="#800a45"/>
        <path d="M-5 4 Q0 8.5 5 4" stroke="#800a45" strokeWidth="1.9" fill="none" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

// Icône navbar claymorphism 3D (état NON sélectionné — icône couleur, sans fond)
function ClayNavIcon({ type, color = '#1877F2', size = 38 }) {
  const blue = color === '#1877F2';
  const l = blue ? '#7CB8FF' : '#FFE08A';
  const m = blue ? '#2E8BFF' : '#F5C518';
  const d = blue ? '#1667D8' : '#D69A00';
  const gid = 'clayG_' + type, shid = 'clayS_' + type;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <defs>
        <radialGradient id={gid} cx="35%" cy="28%" r="90%">
          <stop offset="0" stopColor={l}/><stop offset="45%" stopColor={m}/><stop offset="100%" stopColor={d}/>
        </radialGradient>
        <filter id={shid} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="2.8" floodColor={d} floodOpacity="0.4"/>
        </filter>
      </defs>
      <g filter={'url(#' + shid + ')'}>
        {type === 'home' && <>
          <path d="M32 12 C33.4 12 34.5 12.7 35.6 13.6 L54 28 C55.4 29.2 56 30.6 56 32.4 L56 47 C56 50 54 52 51 52 L13 52 C10 52 8 50 8 47 L8 32.4 C8 30.6 8.6 29.2 10 28 L28.4 13.6 C29.5 12.7 30.6 12 32 12 Z" fill={'url(#' + gid + ')'}/>
          <rect x="26" y="38" width="12" height="14" rx="4" fill={d} opacity="0.5"/>
          <ellipse cx="24" cy="24" rx="7" ry="4" fill="#fff" opacity="0.28" transform="rotate(-32 24 24)"/>
        </>}
        {type === 'amis' && <>
          <circle cx="42" cy="21" r="8" fill={'url(#' + gid + ')'}/>
          <path d="M30 50 C30 41 35 36 42 36 C49 36 54 41 54 50 C54 52 52.5 53 51 53 L33 53 C31.5 53 30 52 30 50 Z" fill={'url(#' + gid + ')'}/>
          <circle cx="24" cy="23" r="9.5" fill={'url(#' + gid + ')'}/>
          <path d="M9 53 C9 43 15 37 24 37 C33 37 39 43 39 53 C39 55 37.5 56 36 56 L12 56 C10.5 56 9 55 9 53 Z" fill={'url(#' + gid + ')'}/>
          <ellipse cx="20" cy="20" rx="4.5" ry="3" fill="#fff" opacity="0.4" transform="rotate(-30 20 20)"/>
        </>}
        {type === 'plane' && <>
          <path d="M52 14 C54 13.2 55.5 15 54.7 17 L44 48 C43.3 50 40.7 50.4 39.4 48.7 L32 39 L46 22 L26 35 L14.5 30.5 C12.6 29.7 12.5 27 14.4 26.2 Z" fill={'url(#' + gid + ')'}/>
          <path d="M32 39 L32 50 C32 51.6 34 52.3 35 51 L39.4 45.5 Z" fill={d} opacity="0.6"/>
          <ellipse cx="30" cy="24" rx="6" ry="2.4" fill="#fff" opacity="0.4" transform="rotate(-30 30 24)"/>
        </>}
        {type === 'profil' && <>
          <circle cx="32" cy="22" r="11" fill={'url(#' + gid + ')'}/>
          <path d="M12 52 C12 40 21 33 32 33 C43 33 52 40 52 52 C52 54.5 50 56 47.5 56 L16.5 56 C14 56 12 54.5 12 52 Z" fill={'url(#' + gid + ')'}/>
          <ellipse cx="27" cy="18" rx="5" ry="3.2" fill="#fff" opacity="0.4" transform="rotate(-30 27 18)"/>
        </>}
      </g>
    </svg>
  );
}

export default function Layout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { t }     = useLang();
  const { currentUser, userProfile, logout } = useAuth();
  const { theme } = useTheme();
  const { unreadCount: notifCount } = useNotifications();
  const { unreadCount: msgCount }   = useMessages();

  // ✅ Badge demandes d'amis reçues
  const [friendReqCount, setFriendReqCount] = useState(0);
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'friendRequests'),
      where('toUid', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, snap => setFriendReqCount(snap.size), () => {});
    return unsub;
  }, [currentUser]);
  const identity = { type: 'user' };
  const [cartCount, setCartCount] = useState(() => { try { return getCart().length; } catch { return 0; } });
  useEffect(() => subscribeCart(items => setCartCount(items.length)), []);


  // Page Sera supprimée — subscribeIdentity retiré

  // Page Sera supprimée
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'pages'), where('admins', 'array-contains', currentUser.uid));
    const unsub = onSnapshot(q, snap => setMyPagesList(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    return () => unsub();
  }, [currentUser]);

  // ── Lecture tokana : rehefa misy audio/vidéo miainga dia ajanona ny hafa rehetra ──
  useEffect(() => {
    const onPlay = e => {
      const el = e.target;
      if (!(el instanceof HTMLMediaElement)) return;
      document.querySelectorAll('audio, video').forEach(m => { if (m !== el && !m.paused) { try { m.pause(); } catch {} } });
    };
    document.addEventListener('play', onPlay, true);
    return () => document.removeEventListener('play', onPlay, true);
  }, []);

  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [search,        setSearch]        = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], posts: [] });
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const [uploadState,   setUploadState]   = useState(null);
  const [liveInfoOpen,  setLiveInfoOpen]  = useState(false);
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

  // ── Mode identité : page Sera active = ilay page no "miasa" eran'ny appli ──
  const isPageMode = false;
  const profilePath = `/profile/${currentUser?.uid}`;

  // Dock flottant style Telegram — icônes remplies, couleur par couleur
  // Dock flottant — 3 couleurs du logo uniquement : bleu / rose / doré
  // Notifications afindra any amin'ny top bar — ny "Revy" (Reels) no centré eto
    const bottomNav = [
    { path: '/',           icon: 'home',   color: '#1877F2', label: 'Accueil' },
    isPageMode
      ? { path: `/pages/${identity.id}`, navState: { openFollowers: true }, icon: 'amis', color: '#F5C518', label: 'Abonnés' }
      : { path: '/friends', icon: 'amis',   color: '#F5C518', label: 'Amis', badge: friendReqCount },
    { path: '/reels',      isJejo: true,   label: 'JEJO' },
    { path: '/messages',   icon: 'plane',  color: '#F5C518', label: 'Messages', badge: msgCount },
    { path: profilePath,   icon: 'profil', color: '#1877F2', label: isPageMode ? 'Page' : 'Profil' },
  ];

  const isActive = p => {
    if (p === '/') return location.pathname === '/';
    if (p.startsWith('/profile')) return location.pathname.startsWith('/profile');
    return location.pathname.startsWith(p);
  };

  async function handleSearch(val) {
    setSearch(val);
    // Lien Trengo collé → ouvrir directement la page
    const link = parseAppLink(val);
    if (link) { setSearch(''); setSearchOpen(false); setSearchBarOpen(false); navigate(link); return; }
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

  // Navigation rapide — horizontale, ambony indrindra (matetika ampiasaina)
  const quickNav = [
    { path: '/',            AIcon: HiHome,          label: t('home'),          color1:'#1B84FF', color2:'#1877F2' },
    isPageMode
      ? { path: `/pages/${identity.id}`, navState: { openFollowers: true }, AIcon: HiUserGroup, label: 'Abonnés', color1:'#FFD84D', color2:'#F5C518' }
      : { path: '/friends', AIcon: HiUserGroup,     label: t('friends'),       color1:'#FFD84D', color2:'#F5C518' },
    { path: '/messages',    AIcon: HiPaperAirplane, label: t('messages'),      color1:'#63A9FF', color2:'#1877F2', badge: msgCount },
    { path: '/notifications', AIcon: HiBell,        label: t('notifications'), color1:'#FF7AB8', color2:'#FF2D8D', badge: notifCount },
    { path: profilePath,    AIcon: HiUser,          label: isPageMode ? 'Page' : t('profile'), color1:'#63A9FF', color2:'#1877F2' },
  ];

  // Hub — grille d'icônes (fonctionnalités). Miova arakaraka ny identité (compte / page Sera).
  const drawerNav = isPageMode ? [
    { path: '/groups',        AIcon: HiUserGroup,    label: 'Groupes',          sub: 'Communautés',              color1:'#8F7BFF', color2:'#5E4BDB' },
    { path: '/events',        AIcon: HiCalendar,     label: 'Événements',       sub: 'Créez, participez',        color1:'#3DD9C4', color2:'#12A48D' },
    { path: '/announcements', AIcon: HiSpeakerphone, label: 'Annonces',         sub: 'Petites annonces',         color1:'#FF9A5A', color2:'#FF7A00' },
    { path: '/saved',         AIcon: HiBookmark,     label: 'Enregistrements',  sub: 'Vos posts sauvegardés',    color1:'#FFD84D', color2:'#F5C518' },
    { path: `/pages/${identity.id}`, navState: { openStats: true }, AIcon: HiChartBar, label: 'Statistiques', sub: 'Abonnés, vues, réactions', color1:'#3DD9C4', color2:'#12A48D' },
    { path: '/notes',         AIcon: HiDocumentText, label: 'Bloc-notes',       sub: 'Vos notes privées',        color1:'#FFD84D', color2:'#F2B300' },
  ] : [
    { path: '/groups',        AIcon: HiUserGroup,    label: 'Groupes',          sub: 'Communautés',          color1:'#8F7BFF', color2:'#5E4BDB' },
    { path: '/events',        AIcon: HiCalendar,     label: 'Événements',       sub: 'Créez, participez',    color1:'#3DD9C4', color2:'#12A48D' },
    { path: '/announcements', AIcon: HiSpeakerphone, label: 'Annonces',         sub: 'Petites annonces',     color1:'#FF9A5A', color2:'#FF7A00' },
    { path: '/shop',          AIcon: HiShoppingBag,  label: 'Boutique',         sub: 'Achetez, vendez',      color1:'#FF6FA5', color2:'#FF2D8D' },
    { path: '/saved',         AIcon: HiBookmark,     label: 'Enregistrements',  sub: 'Vos posts sauvegardés',color1:'#FFD84D', color2:'#F5C518' },
    { path: '/stats',         AIcon: HiChartBar,     label: 'Statistiques',     sub: 'Abonnés, vues, réactions', color1:'#3DD9C4', color2:'#12A48D' },
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

  // ── Reels : plein écran tanteraka, tsy misy navbar/topbar/dock ──
  const isReels = location.pathname.startsWith('/reels');
  if (isReels) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 10 }}>
        {children}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: isDark ? '#0B0D12' : '#FFFFFF', paddingBottom: 96, color: text }}>

      {/* ── Menu plein écran (hamburger) ────────────────────────── */}
      <aside style={{
        position: 'fixed', inset: 0, background: bg, zIndex: 201,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}><span style={{ color:'#1877F2' }}>Tre</span><span style={{ color:'#FF2D8D' }}>ngo</span></span>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ background: isDark ? '#232733' : '#F0F2F5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#65676B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HiX size={20} /></button>
        </div>

        {/* User mini + points/rôle — mampiseho ilay page raha mode "page" no active */}
        {isPageMode ? (
          <div onClick={() => { navigate(`/pages/${identity.id}`); setDrawerOpen(false); }}
            style={{ margin: '4px 16px 10px', padding: '14px', borderRadius: 16, background: isDark ? '#15181F' : '#F0F2F5', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <span style={{ width: 52, height: 52, borderRadius: 14, overflow: 'hidden', background: 'linear-gradient(145deg,#63A9FF,#1877F2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid white' }}>
              {identity.photoURL ? <img src={identity.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <HiIdentification size={24} color="white" />}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontWeight: 800, fontSize: 16, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{identity.name}</p>
              <p style={{ fontSize: 12, color: '#1877F2', fontWeight: 700 }}>📄 Page Sera</p>
            </div>
            <HiChevronRight size={18} color="#65676B" />
          </div>
        ) : userProfile && (
          <div onClick={() => { navigate(`/profile/${currentUser?.uid}`); setDrawerOpen(false); }}
            style={{ margin: '4px 16px 10px', padding: '14px', borderRadius: 16, background: isDark ? '#15181F' : '#F0F2F5', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <img src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.fullName || 'U')}&background=1877F2&color=fff`}
              alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid white' }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontWeight: 800, fontSize: 16, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userProfile.fullName}
                {userProfile.isVip && <img src='/vip-badge.png' style={{ width:22, height:22, marginLeft:5, verticalAlign:'middle', display:'inline-block', flexShrink:0, objectFit:'contain' }} alt='VIP'/>}
              </p>
              <p style={{ fontSize: 12, color: '#1877F2', fontWeight: 700 }}>
                {userProfile.accountType === 'artist' ? '🎤 Compte Artiste' : '@' + userProfile.username}
              </p>
              {typeof userProfile.followers !== 'undefined' && (
                <p style={{ fontSize: 11, color: '#65676B', marginTop: 2 }}>{(userProfile.followers || []).length} abonnés</p>
              )}
            </div>
            <HiChevronRight size={18} color="#65676B" />
          </div>
        )}

        {/* Navigation rapide — horizontale, ambony indrindra, endrika premium */}
        <div className="quicknav-row" style={{ flexShrink: 0 }}>
          {quickNav.map(item => {
            const active = isActive(item.path);
            const IconComp = item.AIcon;
            return (
              <button key={item.label} onClick={() => { navigate(item.path, item.navState ? { state: item.navState } : undefined); setDrawerOpen(false); }}
                className={`quicknav-item ${active ? 'active' : ''}`} style={{ position: 'relative' }}>
                <span className="quicknav-icon icon-sweep" style={{ background: `linear-gradient(145deg, ${item.color1}, ${item.color2})`, '--glow': item.color2 + '66' }}>
                  <IconComp size={20} color="white" />
                </span>
                {item.badge > 0 && <span className="notif-badge" style={{ top: 2, right: 'calc(50% - 24px)', zIndex: 3 }}>{item.badge > 9 ? '9+' : item.badge}</span>}
                <span className="quicknav-label" style={{ color: text }}>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Grille d'icônes colorées (format hub) */}
        <nav style={{ flex: 1, padding: '4px 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {drawerNav.map(item => {
            const active = isActive(item.path);
            const IconComp = item.AIcon;
            return (
              <button key={item.label} onClick={() => { navigate(item.path, item.navState ? { state: item.navState } : undefined); setDrawerOpen(false); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px', textAlign: 'left',
                  background: isDark ? '#15181F' : 'white', position: 'relative',
                  border: `1.5px solid ${active ? '#1877F2' : bdr}`, borderRadius: 16, cursor: 'pointer',
                  boxShadow: active ? '0 2px 10px rgba(24,119,242,.18)' : '0 1px 3px rgba(0,0,0,.06)',
                }}>
                <span className="icon-badge-3d icon-sweep" style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(145deg, ${item.color1}, ${item.color2})`, '--sweep-delay': Math.random() * 2 }}>
                  <IconComp size={22} color="white" />
                </span>
                {item.badge > 0 && <span className="notif-badge" style={{ top: 10, left: 46, zIndex: 3 }}>{item.badge > 9 ? '9+' : item.badge}</span>}
                <span style={{ fontWeight: 700, fontSize: 14, color: text }}>{item.label}</span>
                <span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>{item.sub}</span>
              </button>
            );
          })}

          {/* Artiste — canal artiste (musique/vidéo) : tsy miseho raha mode "page Sera" no active */}
          {!isPageMode && (
            <button onClick={() => { navigate('/artists'); setDrawerOpen(false); }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px', textAlign: 'left',
                background: isDark ? '#15181F' : 'white', border: `1.5px solid ${bdr}`, borderRadius: 16, cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,.06)',
              }}>
              <span className="icon-badge-3d icon-sweep" style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(145deg, #FF6FA5, #FF2D8D)', '--sweep-delay': Math.random() * 2 }}>
                <HiMicrophone size={22} color="white" />
              </span>
              <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Artiste</span>
              <span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>Musique, vidéos, canal</span>
            </button>
          )}
        </nav>

        {/* Bloc-notes */}
        <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          <button onClick={() => { navigate('/notes'); setDrawerOpen(false); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px', textAlign: 'left', background: isDark ? '#15181F' : 'white', border: `1.5px solid ${bdr}`, borderRadius: 16, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <span className="icon-badge-3d" style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(145deg,#FFD84D,#F2B300)' }}>
              <HiDocumentText size={22} color="white" />
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Bloc-notes</span>
            <span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>Vos notes privées</span>
          </button>
        </div>

        {/* Panel Admin — admin ihany */}
        {userProfile?.isAdmin && (
          <div style={{ padding: '0 14px 6px' }}>
            <button onClick={() => { navigate('/admin'); setDrawerOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', textAlign: 'left', background: isDark ? '#15181F' : '#F7F8FA', border: `1.5px solid ${isActive('/admin') ? '#FF2D8D' : bdr}`, borderRadius: 14, cursor: 'pointer' }}>
              <span className="icon-badge-3d" style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(145deg,#FF2D8D,#FF7AB8)', flexShrink: 0 }}>
                <HiShieldCheck size={20} color="white" />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: text }}>Panel Admin</span>
                <span style={{ display: 'block', fontSize: 11, color: '#65676B' }}>Utilisateurs, boost, diagnostic</span>
              </span>
              <HiChevronRight size={18} color="#65676B" />
            </button>
          </div>

        {/* Paramètres — atokana ambany indrindra (tsy atambatra amin'ny hafa) */}
        <div style={{ padding: '0 14px 6px' }}>
          <button onClick={() => { navigate('/settings'); setDrawerOpen(false); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', textAlign: 'left', background: isDark ? '#15181F' : '#F7F8FA', border: `1.5px solid ${isActive('/settings') ? '#1877F2' : bdr}`, borderRadius: 14, cursor: 'pointer' }}>
            <span className="icon-badge-3d" style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(145deg,#AEB4BD,#7C8591)', flexShrink: 0 }}>
              <HiCog size={20} color="white" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: text }}>{t('settings')}</span>
              <span style={{ display: 'block', fontSize: 11, color: '#65676B' }}>Compte, apparence</span>
            </span>
            <HiChevronRight size={18} color="#65676B" />
          </button>
        </div>

        {/* Logout */}
        <div style={{ padding: '8px 0', borderTop: `1px solid ${bdr}` }}>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#1877F2', fontWeight: 600, fontSize: 15 }}>
            <HiLogout size={20} /> Se déconnecter
          </button>
        </div>
      </aside>

      {/* ── Modal : Live (info honnête — pas encore disponible) ── */}
      {liveInfoOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setLiveInfoOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 24, maxWidth: 340, textAlign: 'center' }}>
            <div className="icon-badge-3d" style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(145deg,#FF6B6B,#E0242D)', margin: '0 auto 14px' }}>
              <HiSpeakerphone size={30} color="white" />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>Le Live arrive bientôt</h3>
            <p style={{ fontSize: 13, color: '#65676B', lineHeight: 1.6, marginBottom: 16 }}>
              La diffusion en direct demande une infrastructure vidéo spécifique, pas encore mise en place sur Trengo.
              En attendant, vous pouvez partager vos moments avec une <strong>Story</strong> ou un <strong>Reel</strong>.
            </p>
            <button onClick={() => setLiveInfoOpen(false)} className="btn-blue" style={{ padding: '10px 28px', fontSize: 14, borderRadius: 20 }}>Compris</button>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="navbar" style={{ position: 'sticky', top: 0, zIndex: 100, background: bg, borderBottom: `1px solid ${bdr}` }}>

        {/* Rangée unique (format Facebook) : Menu | Logo | Recherche ronde | Messages rond */}
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#050505', flexShrink: 0, padding: 2 }}>
            <HiMenu size={26} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1, minWidth: 0 }} onClick={() => navigate('/')}>
            <span style={{ fontWeight: 900, fontSize: 28, letterSpacing: -1, whiteSpace: 'nowrap' }}>
              <span style={{ color: '#1877F2' }}>Tre</span><span style={{ color: '#FF2D8D' }}>ngo</span>
            </span>
          </div>

          {/* Panier — bouton rond, mitovy amin'ny icônes topbar hafa */}
          <button onClick={() => navigate('/shop', { state: { openCart: true } })}
            title="Panier"
            style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', background: '#F0F2F5', border: 'none', cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HiShoppingCart size={20} />
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: -2, right: -2, background: '#FF2D8D', color: 'white', borderRadius: '50%', minWidth: 17, height: 17, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', border: '2px solid white' }}>
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>

          {/* Recherche — bouton rond (format Facebook), à gauche du bouton messages */}
          <button onClick={() => navigate('/search')}
            style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0F2F5', border: 'none', cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HiSearch size={20} />
          </button>

          {/* Messages — bouton rond */}
          <button onClick={() => navigate('/messages')}
            style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', background: '#F0F2F5', border: 'none', cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HiPaperAirplane size={19} />
            {msgCount > 0 && (
              <span style={{ position: 'absolute', top: -2, right: -2, background: '#FF1744', color: 'white', borderRadius: '50%', minWidth: 17, height: 17, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', border: '2px solid white' }}>
                {msgCount > 9 ? '9+' : msgCount}
              </span>
            )}
          </button>

          {/* Notifications — bouton rond, afindra avy amin'ny dock ambany, mihetsika raha misy notif vaovao */}
          <button onClick={() => navigate('/notifications')}
            className={notifCount > 0 ? 'bell-shake' : ''}
            style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', background: '#F0F2F5', border: 'none', cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HiBell size={20} />
            {notifCount > 0 && (
              <span style={{ position: 'absolute', top: -2, right: -2, background: '#FF1744', color: 'white', borderRadius: '50%', minWidth: 17, height: 17, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', border: '2px solid white' }}>
                {notifCount > 9 ? '9+' : notifCount}
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
            {uploadState.status === 'uploading' && <>📤 <span>{uploadState.label} — {uploadState.pct}%</span></>}
            {uploadState.status === 'saving'    && <>⏳ <span>Publication en cours...</span></>}
            {uploadState.status === 'done'      && <>✅ <span style={{ color: '#1877F2' }}>Publié !</span></>}
            {uploadState.status === 'error'     && <>⚠️ <span style={{ color: '#FF2D8D' }}>Échec : {uploadState.error}</span></>}
          </div>
          {uploadState.status === 'uploading' && (
            <div style={{ height: 5, background: '#F0F2F5', borderRadius: 4, marginTop: 7, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${uploadState.pct}%`, background: 'linear-gradient(90deg,#1877F2,#FF2D8D,#F2B300)', borderRadius: 4, transition: 'width .3s' }} />
            </div>
          )}
          {(uploadState.status === 'uploading' || uploadState.status === 'saving') && (
            <p style={{ fontSize: 10, color: '#65676B', marginTop: 5, fontFamily: 'Poppins' }}>Vous pouvez continuer à naviguer — l'envoi continue en arrière-plan.</p>
          )}
        </div>
      )}

      {/* ── Dock flottant — clay 3D, JEJO au centre ────────────── */}
      <nav className="floating-dock">
        {bottomNav.map(({ path, navState, icon, badge, color, isJejo, label }) => {
          const active = isActive(path);
          const FilledIcon = icon === 'home' ? HiHome : icon === 'amis' ? HiUserGroup : icon === 'plane' ? HiPaperAirplane : HiUser;
          return (
            <button key={label} className={`dock-item ${active ? 'active' : ''}`} onClick={() => navigate(path, navState ? { state: navState } : undefined)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1, padding: '4px 0' }}>
              {isJejo ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 46, transform: active ? 'scale(1.06)' : 'scale(1)', transition: 'transform .2s' }}>
                  <JejoIcon w={90} />
                </span>
              ) : active ? (
                <span style={{
                  width: 46, height: 46, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `linear-gradient(150deg, ${color === '#1877F2' ? '#4E9BFF' : '#FFD84D'}, ${color === '#1877F2' ? '#1667D8' : '#D69A00'})`,
                  boxShadow: `0 5px 12px ${color}66, inset 0 1.5px 2px rgba(255,255,255,.5), inset 0 -3px 5px rgba(0,0,0,.18)`,
                }}>
                  <FilledIcon size={24} color="#fff" />
                </span>
              ) : (
                <span style={{ width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClayNavIcon type={icon} color={color} size={38} />
                </span>
              )}
              {badge > 0 && <span className="notif-badge" style={{ top: 2, right: 'calc(50% - 26px)' }}>{badge > 9 ? '9+' : badge}</span>}
              {!isJejo && <span className="dock-label" style={{ color: active ? '#111' : '#8A8F98', fontWeight: active ? 800 : 600 }}>{label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}