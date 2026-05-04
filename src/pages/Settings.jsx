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
            <svg style={{ marginLeft:4, verticalAlign:'middle', display:'inline-block', flexShrink:0 }} width='20' height='20' viewBox='0 0 100 100'><path d='M50 5 C53 5 55 8 58 9 C61 10 64 8 67 10 C70 12 69 15 71 18 C73 21 77 21 78 24 C79 27 77 30 78 33 C79 36 82 38 82 41 C82 44 79 46 79 49 C79 52 82 55 81 58 C80 61 77 62 75 65 C73 68 74 71 71 73 C68 75 65 74 62 76 C59 78 58 81 55 82 C52 83 49 81 46 82 C43 83 41 86 38 85 C35 84 34 81 31 79 C28 77 25 78 23 76 C21 74 22 71 20 68 C18 65 15 64 14 61 C13 58 15 55 14 52 C13 49 10 47 10 44 C10 41 13 39 13 36 C13 33 11 30 12 27 C13 24 16 23 18 20 C20 17 19 14 22 12 C25 10 28 11 31 9 C34 7 35 5 38 4 C41 3 44 5 47 5 Z' fill='#E91E8C'/><path d='M33 50 L44 62 L67 38' stroke='white' strokeWidth='8' strokeLinecap='round' strokeLinejoin='round' fill='none'/></svg>
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
