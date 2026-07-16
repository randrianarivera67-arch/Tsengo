// src/pages/Settings.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useEffect } from 'react';
import { isDataSaverOn, setDataSaver } from '../utils/dataSaver';
import BoostOrderModal from '../components/BoostOrderModal';
import {
  HiLogout, HiGlobe, HiColorSwatch, HiUser, HiShieldCheck,
  HiChevronRight, HiStar, HiSpeakerphone, HiInformationCircle
} from 'react-icons/hi';

export default function Settings() {
  const { logout, currentUser, userProfile } = useAuth();
  const { t } = useLang();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [dataSaver, setDataSaverState] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  useEffect(() => { setDataSaverState(isDataSaverOn()); }, []);
  function toggleDataSaver() {
    const next = !dataSaver;
    setDataSaverState(next);
    setDataSaver(next);
  }

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
      icon: HiSpeakerphone, label: 'Booster mon profil',
      sublabel: 'Augmenter la visibilité',
      path: '#boost', color: '#1877F2'
    },
  ];

  return (
    <div style={{ padding: '16px 12px' }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, color: '#1877F2', marginBottom: 20 }}>{t('settings')}</h2>

      {/* Profile summary */}
      <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <img
            src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName||'U')}&background=1877F2&color=fff`}
            alt="" className="avatar" style={{ width: 54, height: 54 }}
          />
          {userProfile?.isVip && (
            <img src='/vip-badge.png' style={{ width:32, height:32, marginLeft:5, verticalAlign:'middle', display:'inline-block', flexShrink:0, objectFit:'contain' }} alt='VIP'/>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 16 }}>{userProfile?.fullName}</p>
          <p style={{ fontSize: 13, color: '#65676B' }}>@{userProfile?.username}</p>
          <p style={{ fontSize: 12, color: '#65676B' }}>{currentUser?.email}</p>
        </div>
        <button
          onClick={() => navigate(`/profile/${currentUser?.uid}`)}
          style={{ background: '#E4E6EB', border: 'none', borderRadius: 20, padding: '6px 14px', color: '#1877F2', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
        >
          <HiUser size={14} style={{ display: 'inline', marginRight: 4 }} />
          {t('editProfile')}
        </button>
      </div>

      {/* Économiser des données */}
      <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: '#1877F215', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>📶</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, fontSize: 14 }}>Économiser des données</p>
          <p style={{ fontSize: 12, color: '#65676B' }}>
            {dataSaver ? "Les vidéos ne se lancent plus automatiquement" : "Les vidéos peuvent se lancer automatiquement"}
          </p>
        </div>
        <button onClick={toggleDataSaver} role="switch" aria-checked={dataSaver}
          style={{ width: 46, height: 26, borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
            background: dataSaver ? '#1877F2' : '#E4E6EB', position: 'relative', transition: 'background .2s' }}>
          <span style={{ position: 'absolute', top: 3, left: dataSaver ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left .2s' }} />
        </button>
      </div>

      {/* Menu items */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={item.path}
              onClick={() => item.path === '#boost' ? setBoostOpen(true) : navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', cursor: 'pointer',
                borderBottom: i < menuItems.length - 1 ? '1px solid #F0F2F5' : 'none',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F0F2F5'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 38, height: 38, borderRadius: 12, background: item.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={item.color} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</p>
                <p style={{ fontSize: 12, color: '#65676B' }}>{item.sublabel}</p>
              </div>
              <HiChevronRight size={18} color="#65676B" />
            </div>
          );
        })}
      </div>

      {/* About */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <HiInformationCircle color="#1877F2" size={20} />
          <h3 style={{ fontWeight: 700, fontSize: 15 }}>Momba Trengo</h3>
        </div>
        <p style={{ fontSize: 13, color: '#65676B', lineHeight: 1.6 }}>
          Trengo dia tambajotra sosialy malagasy — ahazoanao mizara, mivarotra ary miresaka amin'ny namanao.
        </p>
        <p style={{ fontSize: 12, color: '#65676B', marginTop: 8 }}>Version 2.0.0</p>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%', padding: 14, borderRadius: 16, border: '2px solid #1877F2',
          background: 'white', cursor: 'pointer', color: '#1877F2',
          fontFamily: 'Poppins', fontWeight: 700, fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#1877F2'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#1877F2'; }}
      >
        <HiLogout size={20} /> {t('logout')}
      </button>

      {boostOpen && currentUser && (
        <BoostOrderModal
          target={{ type: 'profile', id: currentUser.uid, ownerUid: currentUser.uid, title: userProfile?.fullName || 'Mon profil', thumbnailURL: userProfile?.photoURL || '' }}
          onClose={() => setBoostOpen(false)}
        />
      )}
    </div>
  );
}
