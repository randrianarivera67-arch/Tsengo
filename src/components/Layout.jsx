// src/components/Layout.jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useMessages } from '../hooks/useMessages';
import {
  collection, query, where, getDocs, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  HiHome, HiOutlineHome,
  HiUser, HiOutlineUser,
  HiUserGroup, HiOutlineUserGroup,
  HiChat, HiOutlineChat,
  HiBell, HiOutlineBell,
  HiCog, HiOutlineCog,
  HiSearch, HiX,
} from 'react-icons/hi';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const { currentUser } = useAuth();
  const { unreadCount: notifCount } = useNotifications();
  const { unreadCount: msgCount } = useMessages();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const navItems = [
    { path: '/', icon: HiOutlineHome, activeIcon: HiHome, label: t('home') },
    { path: '/friends', icon: HiOutlineUserGroup, activeIcon: HiUserGroup, label: t('friends') },
    { path: '/messages', icon: HiOutlineChat, activeIcon: HiChat, label: t('messages'), badge: msgCount },
    { path: '/notifications', icon: HiOutlineBell, activeIcon: HiBell, label: t('notifications'), badge: notifCount },
    { path: `/profile/${currentUser?.uid}`, icon: HiOutlineUser, activeIcon: HiUser, label: t('profile') },
    { path: '/settings', icon: HiOutlineCog, activeIcon: HiCog, label: t('settings') },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path.startsWith('/profile')) return location.pathname.startsWith('/profile');
    return location.pathname.startsWith(path);
  };

  async function handleSearch(val) {
    setSearchQuery(val);
    if (!val.trim() || val.length < 2) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const results = { users: [], posts: [], sales: [], media: [] };

      // Search users
      const uq1 = query(collection(db, 'users'),
        where('fullName', '>=', val), where('fullName', '<=', val + '\uf8ff'), limit(4));
      const uq2 = query(collection(db, 'users'),
        where('username', '>=', val.toLowerCase()), where('username', '<=', val.toLowerCase() + '\uf8ff'), limit(4));
      const [us1, us2] = await Promise.all([getDocs(uq1), getDocs(uq2)]);
      const uMap = {};
      [...us1.docs, ...us2.docs].forEach(d => { if (d.id !== currentUser.uid) uMap[d.id] = { id: d.id, ...d.data() }; });
      results.users = Object.values(uMap).slice(0, 5);

      // Search posts & sales
      const pq = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
      const pSnap = await getDocs(pq);
      const allPosts = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const v = val.toLowerCase();
      const matched = allPosts.filter(p =>
        p.content?.toLowerCase().includes(v) ||
        p.authorName?.toLowerCase().includes(v) ||
        (p.isSale && p.price?.toString().includes(v))
      );
      results.posts = matched.filter(p => !p.isSale && !p.mediaURL).slice(0, 3);
      results.sales = matched.filter(p => p.isSale).slice(0, 3);
      results.media = matched.filter(p => p.mediaURL).slice(0, 4);

      setSearchResults(results);
    } catch (err) { console.error(err); }
    setSearching(false);
  }

  function clearSearch() { setSearchQuery(''); setSearchResults(null); }

  const hasResults = searchResults && (
    searchResults.users.length + searchResults.posts.length +
    searchResults.sales.length + searchResults.media.length > 0
  );

  const av = (name, photo) => photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=E91E8C&color=fff`;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', paddingBottom: '70px' }}>
      {/* Top bar */}
      <header className="navbar" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'white', borderBottom: '1px solid #FFE4F3',
        padding: '10px 14px',
      }}>
        {/* Row 1: Logo + Messages */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="tsengo-logo" style={{ width: 36, height: 36, fontSize: 20 }}>T</div>
            <span style={{ fontWeight: 800, fontSize: 22, color: '#E91E8C', letterSpacing: -1 }}>Tsengo</span>
          </div>
          <button onClick={() => navigate('/messages')}
            style={{ background: 'linear-gradient(135deg, #E91E8C, #FF6BB5)', color: 'white', border: 'none', borderRadius: 20, padding: '6px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            {t('messages')} {msgCount > 0 && `(${msgCount})`}
          </button>
        </div>

        {/* Row 2: Search bar */}
        <div style={{ position: 'relative' }}>
          <HiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#C4829F', zIndex: 1 }} size={16} />
          <input
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Rechercher personnes, publications, ventes..."
            style={{
              width: '100%', padding: '8px 36px 8px 32px', borderRadius: 20,
              border: '1.5px solid #FFE4F3', background: '#FDF4F8',
              fontSize: 13, fontFamily: 'Poppins', outline: 'none',
              boxSizing: 'border-box', color: '#2D1220',
            }}
          />
          {searchQuery && (
            <button onClick={clearSearch}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F' }}>
              <HiX size={15} />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {searchResults && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'white', borderBottom: '1px solid #FFE4F3',
            boxShadow: '0 8px 24px rgba(233,30,140,0.1)',
            maxHeight: 380, overflowY: 'auto', zIndex: 200,
          }}>
            {!hasResults ? (
              <p style={{ padding: '16px', textAlign: 'center', color: '#C4829F', fontSize: 13 }}>Tsy hita</p>
            ) : (
              <>
                {/* Users */}
                {searchResults.users.length > 0 && (
                  <div>
                    <p style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: '#C4829F', textTransform: 'uppercase' }}>Personnes</p>
                    {searchResults.users.map(u => (
                      <div key={u.id} onClick={() => { navigate(`/profile/${u.id}`); clearSearch(); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #FDF4F8' }}>
                        <img src={av(u.fullName, u.photoURL)} alt="" style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #FFE4F3' }} />
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 13, color: '#2D1220' }}>{u.fullName}</p>
                          <p style={{ fontSize: 11, color: '#C4829F' }}>@{u.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Sales */}
                {searchResults.sales.length > 0 && (
                  <div>
                    <p style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: '#C4829F', textTransform: 'uppercase' }}>Ventes</p>
                    {searchResults.sales.map(p => (
                      <div key={p.id} onClick={() => { navigate('/'); clearSearch(); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #FDF4F8' }}>
                        {p.mediaURL
                          ? <img src={p.mediaURL} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                          : <div style={{ width: 40, height: 40, borderRadius: 8, background: '#FFE4F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏷</div>
                        }
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, color: '#2D1220', fontWeight: 500 }}>{p.content?.slice(0, 40)}</p>
                          <p style={{ fontSize: 12, color: '#E91E8C', fontWeight: 700 }}>{Number(p.price).toLocaleString()} Ar</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Posts */}
                {searchResults.posts.length > 0 && (
                  <div>
                    <p style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: '#C4829F', textTransform: 'uppercase' }}>Publications</p>
                    {searchResults.posts.map(p => (
                      <div key={p.id} onClick={() => { navigate('/'); clearSearch(); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #FDF4F8' }}>
                        <img src={av(p.authorName, p.authorPhoto)} alt="" style={{ width: 34, height: 34, borderRadius: '50%' }} />
                        <div>
                          <p style={{ fontSize: 13, color: '#2D1220' }}>{p.content?.slice(0, 50)}</p>
                          <p style={{ fontSize: 11, color: '#C4829F' }}>{p.authorName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Media */}
                {searchResults.media.length > 0 && (
                  <div>
                    <p style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: '#C4829F', textTransform: 'uppercase' }}>Photos & Vidéos</p>
                    <div style={{ display: 'flex', gap: 6, padding: '4px 14px 10px', flexWrap: 'wrap' }}>
                      {searchResults.media.map(p => (
                        <div key={p.id} onClick={() => { navigate('/'); clearSearch(); }}
                          style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
                          {p.mediaType === 'image'
                            ? <img src={p.mediaURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <video src={p.mediaURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </header>

      {/* Content */}
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 16px' }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'white', borderTop: '1px solid #FFE4F3',
        display: 'flex', alignItems: 'center',
        padding: '8px 4px', boxShadow: '0 -4px 20px rgba(233,30,140,0.08)'
      }} className="navbar">
        {navItems.map(({ path, icon: Icon, activeIcon: ActiveIcon, label, badge }) => {
          const active = isActive(path);
          return (
            <button key={path} className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(path)} style={{ border: 'none', background: 'none' }}>
              <span style={{ position: 'relative' }}>
                {active ? <ActiveIcon size={22} color="#E91E8C" /> : <Icon size={22} />}
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
