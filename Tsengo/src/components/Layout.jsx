// src/components/Layout.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useMessages } from '../hooks/useMessages';
import {
  HiHome, HiOutlineHome,
  HiUser, HiOutlineUser,
  HiUserGroup, HiOutlineUserGroup,
  HiChat, HiOutlineChat,
  HiBell, HiOutlineBell,
  HiCog, HiOutlineCog,
} from 'react-icons/hi';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const { currentUser } = useAuth();
  const { unreadCount: notifCount } = useNotifications();
  const { unreadCount: msgCount } = useMessages();

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', paddingBottom: '70px' }}>
      {/* Top bar */}
      <header className="navbar" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'white', borderBottom: '1px solid #FFE4F3',
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="tsengo-logo" style={{ width: 36, height: 36, fontSize: 20 }}>T</div>
          <span style={{ fontWeight: 800, fontSize: 22, color: '#E91E8C', letterSpacing: -1 }}>Tsengo</span>
        </div>
        <button
          onClick={() => navigate('/messages')}
          style={{
            background: 'linear-gradient(135deg, #E91E8C, #FF6BB5)',
            color: 'white', border: 'none', borderRadius: 20,
            padding: '6px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13
          }}
        >
          {t('messages')} {msgCount > 0 && `(${msgCount})`}
        </button>
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
            <button
              key={path}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(path)}
              style={{ border: 'none', background: 'none' }}
            >
              <span style={{ position: 'relative' }}>
                {active
                  ? <ActiveIcon size={22} color="#E91E8C" />
                  : <Icon size={22} />
                }
                {badge > 0 && (
                  <span className="notif-badge">{badge > 9 ? '9+' : badge}</span>
                )}
              </span>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
