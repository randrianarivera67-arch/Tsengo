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
            <svg style={{ marginLeft:4, verticalAlign:'middle', display:'inline-block', flexShrink:0 }} width='20' height='20' viewBox='0 0 32 32'><circle cx='16' cy='16' r='10' fill='#E91E8C'/><path d='M11 16.5l3.5 3.5 6.5-7' stroke='white' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' fill='none'/><polygon points='16,2 16.8,4.5 19.5,4.5 17.3,6 18.1,8.5 16,7 13.9,8.5 14.7,6 12.5,4.5 15.2,4.5' fill='#FF6BB5' opacity='0.9'/><polygon points='28,10 28.5,11.5 30,11.5 28.8,12.4 29.3,14 28,13 26.7,14 27.2,12.4 26,11.5 27.5,11.5' fill='#FF6BB5' opacity='0.8'/><polygon points='28,22 28.5,23.5 30,23.5 28.8,24.4 29.3,26 28,25 26.7,26 27.2,24.4 26,23.5 27.5,23.5' fill='#FFB3D9' opacity='0.7'/><polygon points='4,10 4.5,11.5 6,11.5 4.8,12.4 5.3,14 4,13 2.7,14 3.2,12.4 2,11.5 3.5,11.5' fill='#FF6BB5' opacity='0.8'/><polygon points='4,22 4.5,23.5 6,23.5 4.8,24.4 5.3,26 4,25 2.7,26 3.2,24.4 2,23.5 3.5,23.5' fill='#FFB3D9' opacity='0.7'/></svg>
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
