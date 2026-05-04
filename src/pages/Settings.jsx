// src/pages/Settings.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  HiLogout, HiGlobe, HiColorSwatch, HiUser, HiShieldCheck,
  HiChevronRight, HiStar, HiSpeakerphone, HiInformationCircle
} from 'react-icons/hi';

export default function Settings() {
  const { logout, currentUser, userProfile } = useAuth();
  const { t } = useLang();
  const { theme } = useTheme();
  const navigate = useNavigate();

  async function handleLogout() {
    if (!window.confirm('Hivoaka ve ianao?')) return;
    await logout();
    navigate('/login');
  }

  const menuItems = [
    {
      icon: HiGlobe, label: t('language'),
      sublabel: 'Malagasy / Français / English',
      path: '/settings/language', color: '#3b82f6'
    },
    {
      icon: HiColorSwatch, label: t('appearance'),
      sublabel: theme === 'dark' ? 'Mode nuit' : 'Mode clair',
      path: '/settings/appearance', color: '#8b5cf6'
    },
    {
      icon: HiShieldCheck, label: 'Sécurité',
      sublabel: 'Email, mot de passe, aide',
      path: '/settings/security', color: '#10b981'
    },
    {
      icon: HiStar, label: 'Compte VIP',
      sublabel: 'Badge rose + avantages exclusifs',
      path: '/vip', color: '#f59e0b'
    },
    {
      icon: HiSpeakerphone, label: 'Booster un post',
      sublabel: 'Augmenter la visibilité',
      path: '/boost', color: '#E91E8C'
    },
  ];

  return (
    <div style={{ padding: '16px 12px' }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, color: '#E91E8C', marginBottom: 20 }}>{t('settings')}</h2>

      {/* Profile summary */}
      <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <img
            src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName||'U')}&background=E91E8C&color=fff`}
            alt="" className="avatar" style={{ width: 54, height: 54 }}
          />
          {userProfile?.isVip && (
            <svg style={{ marginLeft:4, verticalAlign:'middle', display:'inline-block', flexShrink:0 }} width='22' height='22' viewBox='0 0 48 48'><path d='M24 1 L25.2 4.5 L28 3 L26 6 L29.5 7 L26 8 L28 11 L25.2 9.5 L24 13 L22.8 9.5 L20 11 L22 8 L18.5 7 L22 6 L20 3 L22.8 4.5 Z' fill='#FF6BB5'/><path d='M38 8 L38.8 10.5 L41.5 10.5 L39.5 12 L40.3 14.5 L38 13 L35.7 14.5 L36.5 12 L34.5 10.5 L37.2 10.5 Z' fill='#FF6BB5'/><path d='M10 8 L10.8 10.5 L13.5 10.5 L11.5 12 L12.3 14.5 L10 13 L7.7 14.5 L8.5 12 L6.5 10.5 L9.2 10.5 Z' fill='#FF6BB5'/><path d='M44 22 L44.8 24.5 L47.5 24.5 L45.5 26 L46.3 28.5 L44 27 L41.7 28.5 L42.5 26 L40.5 24.5 L43.2 24.5 Z' fill='#FFB3D9'/><path d='M4 22 L4.8 24.5 L7.5 24.5 L5.5 26 L6.3 28.5 L4 27 L1.7 28.5 L2.5 26 L0.5 24.5 L3.2 24.5 Z' fill='#FFB3D9'/><path d='M38 36 L38.8 38.5 L41.5 38.5 L39.5 40 L40.3 42.5 L38 41 L35.7 42.5 L36.5 40 L34.5 38.5 L37.2 38.5 Z' fill='#FF6BB5'/><path d='M10 36 L10.8 38.5 L13.5 38.5 L11.5 40 L12.3 42.5 L10 41 L7.7 42.5 L8.5 40 L6.5 38.5 L9.2 38.5 Z' fill='#FF6BB5'/><circle cx='24' cy='24' r='14' fill='#E91E8C'/><path d='M17 24.5l4.5 4.5 9-10' stroke='white' strokeWidth='2.8' strokeLinecap='round' strokeLinejoin='round' fill='none'/></svg>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 16 }}>{userProfile?.fullName}</p>
          <p style={{ fontSize: 13, color: '#C4829F' }}>@{userProfile?.username}</p>
          <p style={{ fontSize: 12, color: '#8B5A6F' }}>{currentUser?.email}</p>
        </div>
        <button
          onClick={() => navigate(`/profile/${currentUser?.uid}`)}
          style={{ background: '#FFE4F3', border: 'none', borderRadius: 20, padding: '6px 14px', color: '#E91E8C', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
        >
          <HiUser size={14} style={{ display: 'inline', marginRight: 4 }} />
          {t('editProfile')}
        </button>
      </div>

      {/* Menu items */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', cursor: 'pointer',
                borderBottom: i < menuItems.length - 1 ? '1px solid #FFF0F8' : 'none',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFF8FC'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 38, height: 38, borderRadius: 12, background: item.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={item.color} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</p>
                <p style={{ fontSize: 12, color: '#C4829F' }}>{item.sublabel}</p>
              </div>
              <HiChevronRight size={18} color="#C4829F" />
            </div>
          );
        })}
      </div>

      {/* About */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <HiInformationCircle color="#E91E8C" size={20} />
          <h3 style={{ fontWeight: 700, fontSize: 15 }}>Momba Tsengo</h3>
        </div>
        <p style={{ fontSize: 13, color: '#8B5A6F', lineHeight: 1.6 }}>
          Tsengo dia tambajotra sosialy malagasy — ahazoanao mizara, mivarotra ary miresaka amin'ny namanao.
        </p>
        <p style={{ fontSize: 12, color: '#C4829F', marginTop: 8 }}>Version 2.0.0</p>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%', padding: 14, borderRadius: 16, border: '2px solid #E91E8C',
          background: 'white', cursor: 'pointer', color: '#E91E8C',
          fontFamily: 'Poppins', fontWeight: 700, fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#E91E8C'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#E91E8C'; }}
      >
        <HiLogout size={20} /> {t('logout')}
      </button>
    </div>
  );
}
