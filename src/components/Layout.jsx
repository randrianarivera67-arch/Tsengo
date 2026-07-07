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
  HiUserGroup, HiOutlineUserGroup, HiChat, HiOutlineChat, HiPaperAirplane, HiOutlinePaperAirplane,
  HiBell, HiOutlineBell, HiMenu, HiX, HiSearch, HiLogout, HiCog,
  HiOutlineCog, HiTag, HiFilm, HiPhotograph,
  HiBookmark, HiOutlineBookmark, HiCalendar, HiSpeakerphone, HiShoppingBag, HiChevronRight,
  HiMicrophone, HiIdentification, HiDocumentText,
} from 'react-icons/hi';

// Pill "Revy" — recrée fidèlement l'image de référence : rectangle large,
// contour blanc, texte "Revy" + trait pointillé + triangle lecture
function RevyPill({ height = 42 }) {
  const w = height * 2.35;
  return (
    <svg width={w} height={height} viewBox="0 0 235 100" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="revyBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF4D9E"/>
          <stop offset="1" stopColor="#FF1D7E"/>
        </linearGradient>
        <linearGradient id="revyPlay" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF"/>
          <stop offset="0.5" stopColor="#E8ECF2"/>
          <stop offset="1" stopColor="#B8C0CC"/>
        </linearGradient>
      </defs>
      <rect x="3" y="8" width="229" height="84" rx="26" fill="url(#revyBg)"/>
      <text x="26" y="66" fontFamily="Poppins, 'Segoe UI', sans-serif" fontWeight="700" fontSize="44" letterSpacing="0.5" fill="white" fontStyle="italic">Revy</text>
      <circle cx="188" cy="50" r="26" fill="rgba(255,255,255,.16)"/>
      <path d="M178 36 L206 50 L178 64 Z" fill="url(#revyPlay)"/>
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

  // Dock flottant style Telegram — icônes remplies, couleur par couleur
  // Dock flottant — 3 couleurs du logo uniquement : bleu / rose / doré
  // Notifications afindra any amin'ny top bar — ny "Revy" (Reels) no centré eto
  const bottomNav = [
    { path: '/',                            AIcon: HiHome,          color: '#1877F2', label: 'Accueil' },
    { path: '/friends',                     AIcon: HiUserGroup,     color: '#F5C518', label: 'Amis' },
    { path: '/reels',                       isRevy: true,           color: '#FF1D7E', label: 'Revy' },
    { path: '/messages',                    AIcon: HiPaperAirplane, color: '#F5C518', label: 'Messages', badge: msgCount },
    { path: `/profile/${currentUser?.uid}`, AIcon: HiUser,          color: '#1877F2', label: 'Profil' },
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

  // Navigation rapide — horizontale, ambony indrindra (matetika ampiasaina)
  const quickNav = [
    { path: '/',                            AIcon: HiHome,          label: t('home'),          color1:'#1B84FF', color2:'#1877F2' },
    { path: '/friends',                     AIcon: HiUserGroup,     label: t('friends'),       color1:'#FFD84D', color2:'#F5C518' },
    { path: '/messages',                    AIcon: HiPaperAirplane, label: t('messages'),      color1:'#63A9FF', color2:'#1877F2', badge: msgCount },
    { path: '/notifications',               AIcon: HiBell,          label: t('notifications'), color1:'#FF7AB8', color2:'#FF2D8D', badge: notifCount },
    { path: `/profile/${currentUser?.uid}`, AIcon: HiUser,          label: t('profile'),       color1:'#63A9FF', color2:'#1877F2' },
  ];

  // Hub — grille d'icônes (fonctionnalités)
  const drawerNav = [
    { path: '/groups',                      AIcon: HiUserGroup,     label: 'Groupes',          sub: 'Communautés',          color1:'#8F7BFF', color2:'#5E4BDB' },
    { path: '/events',                      AIcon: HiCalendar,      label: 'Événements',       sub: 'Créez, participez',    color1:'#3DD9C4', color2:'#12A48D' },
    { path: '/announcements',               AIcon: HiSpeakerphone,  label: 'Annonces',         sub: 'Petites annonces',     color1:'#FF9A5A', color2:'#FF7A00' },
    { path: '/shop',                        AIcon: HiShoppingBag,   label: 'Boutique',         sub: 'Achetez, vendez',      color1:'#FF6FA5', color2:'#FF2D8D' },
    { path: '/saved',                       AIcon: HiBookmark,      label: 'Enregistrements',  sub: 'Vos posts sauvegardés',color1:'#FFD84D', color2:'#F5C518' },
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
            <img src='/tsengo-logo.png' alt="Traingo" style={{ width:44, height:44, objectFit:"contain" }}/>
            <span style={{ fontWeight: 900, fontSize: 18 }}><span style={{ color:'#1877F2' }}>trai</span><span style={{ color:'#FF2D8D' }}>ngo</span></span>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ background: isDark ? '#232733' : '#F0F2F5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#65676B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HiX size={20} /></button>
        </div>

        {/* User mini + points/rôle */}
        {userProfile && (
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
        <div className="quicknav-row">
          {quickNav.map(item => {
            const active = isActive(item.path);
            const IconComp = item.AIcon;
            return (
              <button key={item.path} onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                className={`quicknav-item ${active ? 'active' : ''}`}>
                <span className="quicknav-icon icon-sweep" style={{ background: `linear-gradient(145deg, ${item.color1}, ${item.color2})`, '--glow': item.color2 + '66' }}>
                  <IconComp size={20} color="white" />
                  {item.badge > 0 && <span className="notif-badge">{item.badge > 9 ? '9+' : item.badge}</span>}
                </span>
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
              <button key={item.path} onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px', textAlign: 'left',
                  background: isDark ? '#15181F' : 'white',
                  border: `1.5px solid ${active ? '#1877F2' : bdr}`, borderRadius: 16, cursor: 'pointer',
                  boxShadow: active ? '0 2px 10px rgba(24,119,242,.18)' : '0 1px 3px rgba(0,0,0,.06)',
                }}>
                <span className="icon-badge-3d icon-sweep" style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(145deg, ${item.color1}, ${item.color2})`, '--sweep-delay': Math.random() * 2 }}>
                  <IconComp size={22} color="white" />
                  {item.badge > 0 && <span className="notif-badge" style={{ zIndex: 2 }}>{item.badge > 9 ? '9+' : item.badge}</span>}
                </span>
                <span style={{ fontWeight: 700, fontSize: 14, color: text }}>{item.label}</span>
                <span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>{item.sub}</span>
              </button>
            );
          })}

          {/* Artiste — canal artiste (musique/vidéo), à la place du Live */}
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
        </nav>

        {/* Sera (Pages) et Bloc-notes */}
        <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={() => { navigate('/pages'); setDrawerOpen(false); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px', textAlign: 'left', background: isDark ? '#15181F' : 'white', border: `1.5px solid ${bdr}`, borderRadius: 16, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <span className="icon-badge-3d" style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(145deg,#63A9FF,#1877F2)' }}>
              <HiIdentification size={22} color="white" />
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Sera</span>
            <span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>Pages publiques</span>
          </button>
          <button onClick={() => { navigate('/notes'); setDrawerOpen(false); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px', textAlign: 'left', background: isDark ? '#15181F' : 'white', border: `1.5px solid ${bdr}`, borderRadius: 16, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <span className="icon-badge-3d" style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(145deg,#FFD84D,#F2B300)' }}>
              <HiDocumentText size={22} color="white" />
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Bloc-notes</span>
            <span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>Vos notes privées</span>
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
              La diffusion en direct demande une infrastructure vidéo spécifique, pas encore mise en place sur Traingo.
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

      {/* ── Dock flottant (style Telegram) ─────────────────────── */}
      <nav className="floating-dock">
        {bottomNav.map(({ path, AIcon, badge, color, isRevy }) => {
          const active = isActive(path);
          return (
            <button key={path} className={`dock-item ${active ? 'active' : ''}`} onClick={() => navigate(path)}
              style={{ color, '--dock-glow': color + '77', position: 'relative' }}>
              {isRevy ? (
                <span className="dock-icon" style={{ position:'relative', width:'auto', height:42, background:'none', boxShadow:'none', overflow:'visible' }}>
                  <RevyPill height={42} />
                </span>
              ) : (
                <span className="dock-icon" style={{
                  background: `linear-gradient(155deg, ${color}ee, ${color})`,
                  width: 42, height: 42,
                  boxShadow: `0 3px 8px ${color}55, inset 0 1px 2px rgba(255,255,255,.6), inset 0 -3px 6px rgba(0,0,0,.22)`,
                  opacity: active ? 1 : 0.82,
                }}>
                  <AIcon size={22} color="white" />
                </span>
              )}
              {/* Badge — ivelan'ny dock-icon (overflow:hidden), mba tsy ho voatapaka na hikorana */}
              {badge > 0 && <span className="notif-badge" style={{ top: 2, right: 'calc(50% - 26px)' }}>{badge > 9 ? '9+' : badge}</span>}
              <span className="dock-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}