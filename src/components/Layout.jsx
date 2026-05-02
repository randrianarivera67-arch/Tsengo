// src/components/Layout.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang }  from '../context/LanguageContext';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import { useMessages }       from '../hooks/useMessages';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { ref, set, onDisconnect } from 'firebase/database';
import { db, rtdb } from '../firebase';
import { playNotificationSound } from '../utils/sound';
import {
  HiHome, HiOutlineHome, HiUser, HiOutlineUser,
  HiUserGroup, HiOutlineUserGroup, HiChat, HiOutlineChat,
  HiBell, HiOutlineBell, HiMenu, HiX, HiSearch, HiLogout, HiCog,
  HiOutlineCog, HiTag, HiFilm, HiPhotograph,
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
    if (notifCount > prevNotif.current) playNotificationSound();
    prevNotif.current = notifCount;
  }, [notifCount]);

  const bottomNav = [
    { path: '/',                            Icon: HiOutlineHome,      AIcon: HiHome,      label: t('home') },
    { path: '/friends',                     Icon: HiOutlineUserGroup, AIcon: HiUserGroup, label: t('friends') },
    { path: '/messages',                    Icon: HiOutlineChat,      AIcon: HiChat,      label: t('messages'),      badge: msgCount },
    { path: '/notifications',               Icon: HiOutlineBell,      AIcon: HiBell,      label: t('notifications'), badge: notifCount },
    { path: `/profile/${currentUser?.uid}`, Icon: HiOutlineUser,      AIcon: HiUser,      label: t('profile') },
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
    try {
      const onlineRef = ref(rtdb, `online/${currentUser.uid}`);
      await set(onlineRef, false);
      await logout();
      navigate('/login');
    } catch {}
  }

  // Drawer nav — icônes classiques (même style que bottom nav)
  const drawerNav = [
    { path: '/',                            Icon: HiOutlineHome,      AIcon: HiHome,      label: t('home') },
    { path: '/friends',                     Icon: HiOutlineUserGroup, AIcon: HiUserGroup, label: t('friends') },
    { path: '/messages',                    Icon: HiOutlineChat,      AIcon: HiChat,      label: t('messages'),      badge: msgCount },
    { path: '/notifications',               Icon: HiOutlineBell,      AIcon: HiBell,      label: t('notifications'), badge: notifCount },
    { path: `/profile/${currentUser?.uid}`, Icon: HiOutlineUser,      AIcon: HiUser,      label: t('profile') },
    { path: '/settings',                    Icon: HiOutlineCog,       AIcon: HiCog,       label: t('settings') },
  ];

  const bg   = isDark ? '#2D1220' : 'white';
  const bdr  = isDark ? '#4A2535' : '#FFE4F3';
  const text = isDark ? '#FFE4F3' : '#2D1220';

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
        <div style={{ padding: '7px 14px 3px', fontSize: 10, fontWeight: 700, color: '#C4829F', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
          {icon} {label}
        </div>
        {items.map(p => (
          <div key={p.id} onClick={() => onItem(p)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', borderBottom: `1px solid ${bdr}` }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: isDark ? '#4A2535' : '#FFE4F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
              {p.isSale ? '🏷️' : p.mediaType === 'video' ? '🎬' : p.mediaURL ? '📸' : '📝'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 12, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content || 'Publication'}</p>
              <p style={{ fontSize: 11, color: '#C4829F' }}>{p.authorName}{p.isSale && p.price ? ` · ${p.price.toLocaleString()} Ar` : ''}</p>
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: isDark ? '#1A0A12' : 'var(--gray-50)', paddingBottom: 70, color: text }}>

      {/* Overlay */}
      {drawerOpen && <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }} />}

      {/* ── Drawer ──────────────────────────────────────────────── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, background: bg, zIndex: 201,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
        boxShadow: drawerOpen ? '4px 0 24px rgba(233,30,140,.18)' : 'none',
        borderRight: `1px solid ${bdr}`,
      }}>
        {/* Header */}
        <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/tsengo-logo.png" alt="Tsengo" className="logo-shimmer" style={{ width:32, height:32, objectFit:"contain" }}/>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#E91E8C' }}>Tsengo</span>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F' }}><HiX size={22} /></button>
        </div>

        {/* User mini */}
        {userProfile && (
          <div onClick={() => { navigate(`/profile/${currentUser?.uid}`); setDrawerOpen(false); }}
            style={{ padding: '14px 16px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <img src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.fullName || 'U')}&background=E91E8C&color=fff`}
              alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFE4F3' }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userProfile.fullName}
                {userProfile.isVip && <span style={{ marginLeft: 5, background: 'linear-gradient(135deg,#E91E8C,#FF6BB5)', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 6 }}>VIP</span>}
              </p>
              <p style={{ fontSize: 12, color: '#C4829F' }}>@{userProfile.username}</p>
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
                  background: active ? (isDark ? '#4A2535' : '#FFF0F8') : 'none', border: 'none',
                  borderLeft: `3px solid ${active ? '#E91E8C' : 'transparent'}`, cursor: 'pointer',
                  color: active ? '#E91E8C' : isDark ? '#C4829F' : '#6B3A52',
                  fontWeight: active ? 700 : 500, fontSize: 15, textAlign: 'left',
                }}>
                <IconComp size={21} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge > 0 && <span style={{ background: '#E91E8C', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{item.badge > 9 ? '9+' : item.badge}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '8px 0', borderTop: `1px solid ${bdr}` }}>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#E91E8C', fontWeight: 600, fontSize: 15 }}>
            <HiLogout size={20} /> Se déconnecter
          </button>
        </div>
      </aside>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="navbar" style={{ position: 'sticky', top: 0, zIndex: 100, background: bg, borderBottom: `1px solid ${bdr}` }}>

        {/* Rangée 1 : Menu | Logo Tsengo | Icône Messages (rose) */}
        <div style={{ padding: '9px 14px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E91E8C', flexShrink: 0, padding: 2 }}>
            <HiMenu size={26} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1 }} onClick={() => navigate('/')}>
            <img src="/tsengo-logo.png" alt="Tsengo" className="logo-shimmer" style={{ width:30, height:30, objectFit:"contain" }}/>
            <span style={{ fontWeight: 800, fontSize: 20, color: '#E91E8C', letterSpacing: -1 }}>Tsengo</span>
          </div>

          {/* Icône Messages — rose, cercle */}
          <button onClick={() => navigate('/messages')} style={{ position: 'relative', background: 'linear-gradient(135deg,#E91E8C,#FF6BB5)', color: 'white', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 10px rgba(233,30,140,.4)' }}>
            <HiChat size={20} />
            {msgCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: '#FF1744', color: 'white', borderRadius: '50%', minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', border: '2px solid white' }}>
                {msgCount > 9 ? '9+' : msgCount}
              </span>
            )}
          </button>
        </div>

        {/* Rangée 2 : Barre de recherche multi-type */}
        <div ref={searchRef} style={{ padding: '0 14px 10px', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#C4829F', pointerEvents: 'none', zIndex: 1 }} size={15} />
            <input
              type="text"
              placeholder="Publications, personnes, ventes, vidéos, photos..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => search.trim() && setSearchOpen(true)}
              style={{
                width: '100%', padding: '8px 12px 8px 34px',
                border: `1.5px solid ${isDark ? '#4A2535' : '#FFE4F3'}`, borderRadius: 22,
                background: isDark ? '#3D1A2A' : '#FFF8FC', color: text,
                fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Poppins',
              }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setSearchResults({ users: [], posts: [] }); setSearchOpen(false); }}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', padding: 0 }}>
                <HiX size={14} />
              </button>
            )}
          </div>

          {/* Résultats de recherche */}
          {searchOpen && hasResults && (
            <div style={{
              position: 'absolute', top: 'calc(100% - 2px)', left: 14, right: 14, zIndex: 300,
              background: bg, border: `1px solid ${bdr}`, borderRadius: 14,
              boxShadow: '0 8px 30px rgba(233,30,140,.12)', overflow: 'hidden',
              maxHeight: 380, overflowY: 'auto',
            }}>
              {/* Personnes */}
              {searchResults.users.length > 0 && (
                <>
                  <div style={{ padding: '8px 14px 3px', fontSize: 10, fontWeight: 700, color: '#C4829F', textTransform: 'uppercase', letterSpacing: 1 }}>👤 Personnes</div>
                  {searchResults.users.map(u => (
                    <div key={u.id} onClick={() => { navigate(`/profile/${u.id}`); setSearch(''); setSearchOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: `1px solid ${bdr}` }}>
                      <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || 'U')}&background=E91E8C&color=fff`}
                        alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13, color: text }}>
                          {u.fullName}
                          {u.isVip && <span style={{ marginLeft: 4, background: 'linear-gradient(135deg,#E91E8C,#FF6BB5)', color: 'white', fontSize: 8, padding: '1px 4px', borderRadius: 5 }}>VIP</span>}
                        </p>
                        <p style={{ fontSize: 11, color: '#C4829F' }}>@{u.username}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Ventes */}
              {ventes.length > 0 && (
                <>
                  <div style={{ padding: '8px 14px 3px', fontSize: 10, fontWeight: 700, color: '#C4829F', textTransform: 'uppercase', letterSpacing: 1 }}>🏷️ Ventes</div>
                  {ventes.map(p => (
                    <div key={p.id} onClick={() => { navigate(`/post/${p.id}`); setSearch(''); setSearchOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: `1px solid ${bdr}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: isDark ? '#4A2535' : '#FFE4F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏷️</div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 12, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content || 'Vente'}</p>
                        <p style={{ fontSize: 11, color: '#E91E8C', fontWeight: 700 }}>{p.price?.toLocaleString()} Ar</p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Vidéos */}
              {videos.length > 0 && (
                <>
                  <div style={{ padding: '8px 14px 3px', fontSize: 10, fontWeight: 700, color: '#C4829F', textTransform: 'uppercase', letterSpacing: 1 }}>🎬 Vidéos</div>
                  {videos.map(p => (
                    <div key={p.id} onClick={() => { navigate(`/post/${p.id}`); setSearch(''); setSearchOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: `1px solid ${bdr}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: isDark ? '#4A2535' : '#FFE4F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎬</div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 12, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content || 'Vidéo'}</p>
                        <p style={{ fontSize: 11, color: '#C4829F' }}>{p.authorName}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Photos */}
              {photos.length > 0 && (
                <>
                  <div style={{ padding: '8px 14px 3px', fontSize: 10, fontWeight: 700, color: '#C4829F', textTransform: 'uppercase', letterSpacing: 1 }}>📸 Photos</div>
                  {photos.map(p => (
                    <div key={p.id} onClick={() => { navigate(`/post/${p.id}`); setSearch(''); setSearchOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: `1px solid ${bdr}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: isDark ? '#4A2535' : '#FFE4F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📸</div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 12, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content || 'Photo'}</p>
                        <p style={{ fontSize: 11, color: '#C4829F' }}>{p.authorName}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Publications texte */}
              {textPosts.length > 0 && (
                <>
                  <div style={{ padding: '8px 14px 3px', fontSize: 10, fontWeight: 700, color: '#C4829F', textTransform: 'uppercase', letterSpacing: 1 }}>📝 Publications</div>
                  {textPosts.map(p => (
                    <div key={p.id} onClick={() => { navigate(`/post/${p.id}`); setSearch(''); setSearchOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: `1px solid ${bdr}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: isDark ? '#4A2535' : '#FFE4F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📝</div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 12, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content}</p>
                        <p style={{ fontSize: 11, color: '#C4829F' }}>{p.authorName}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 16px' }}>{children}</main>

      {/* ── Bottom Nav ──────────────────────────────────────────── */}
      <nav className="navbar" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: bg, borderTop: `1px solid ${bdr}`,
        display: 'flex', padding: '6px 0',
        boxShadow: '0 -4px 20px rgba(233,30,140,.08)',
      }}>
        {bottomNav.map(({ path, Icon, AIcon, label, badge }) => {
          const active = isActive(path);
          return (
            <button key={path} className={`nav-item ${active ? 'active' : ''}`} onClick={() => navigate(path)}
              style={{ flex: 1, border: 'none', background: 'none', color: isDark ? (active ? '#E91E8C' : '#C4829F') : undefined }}>
              <span style={{ position: 'relative' }}>
                {active ? <AIcon size={22} color="#E91E8C" /> : <Icon size={22} color={isDark ? '#C4829F' : undefined} />}
                {badge > 0 && <span className="notif-badge">{badge > 9 ? '9+' : badge}</span>}
              </span>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
