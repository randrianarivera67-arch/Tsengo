// src/pages/Settings.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { HiLogout, HiGlobe, HiColorSwatch, HiSun, HiMoon, HiUser, HiShieldCheck } from 'react-icons/hi';

const LANGS = [
  { code: 'mg', label: 'Malagasy', flag: '🇲🇬' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function Settings() {
  const { logout, currentUser, userProfile } = useAuth();
  const { t, lang, changeLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleLogout() {
    if (!window.confirm('Hivoaka ve ianao?')) return;
    await logout();
    navigate('/login');
  }

  return (
    <div style={{ padding: '16px 12px' }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, color: '#E91E8C', marginBottom: 20 }}>{t('settings')}</h2>

      {/* Profile summary */}
      <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <img
          src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName || 'U')}&background=E91E8C&color=fff`}
          alt="" className="avatar" style={{ width: 54, height: 54 }}
        />
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#2D1220' }}>{userProfile?.fullName}</p>
          <p style={{ fontSize: 13, color: '#C4829F' }}>@{userProfile?.username}</p>
          <p style={{ fontSize: 12, color: '#8B5A6F' }}>{currentUser?.email}</p>
        </div>
        <button
          onClick={() => navigate(`/profile/${currentUser?.uid}`)}
          style={{ marginLeft: 'auto', background: '#FFE4F3', border: 'none', borderRadius: 20, padding: '6px 14px', color: '#E91E8C', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
        >
          <HiUser size={14} style={{ display: 'inline', marginRight: 4 }} />
          {t('editProfile')}
        </button>
      </div>

      {/* Language */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <HiGlobe color="#E91E8C" size={20} />
          <h3 style={{ fontWeight: 700, fontSize: 15, color: '#2D1220' }}>{t('language')}</h3>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => changeLang(l.code)}
              style={{
                padding: '10px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontFamily: 'Poppins', fontWeight: 600, fontSize: 14,
                background: lang === l.code ? '#E91E8C' : '#FFE4F3',
                color: lang === l.code ? 'white' : '#E91E8C',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s',
                boxShadow: lang === l.code ? '0 3px 12px rgba(233,30,140,0.3)' : 'none',
              }}
            >
              <span style={{ fontSize: 18 }}>{l.flag}</span> {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <HiColorSwatch color="#E91E8C" size={20} />
          <h3 style={{ fontWeight: 700, fontSize: 15, color: '#2D1220' }}>{t('appearance')}</h3>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { value: 'light', label: 'Rose & Blanc', icon: HiSun },
            { value: 'dark', label: 'Rose & Nuit', icon: HiMoon },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => toggleTheme(value)}
              style={{
                flex: 1, padding: '12px 10px', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontFamily: 'Poppins', fontWeight: 600, fontSize: 13,
                background: theme === value ? '#E91E8C' : '#FFE4F3',
                color: theme === value ? 'white' : '#E91E8C',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'all 0.2s',
                boxShadow: theme === value ? '0 4px 15px rgba(233,30,140,0.3)' : 'none',
              }}
            >
              <Icon size={22} />
              {label}
            </button>
          ))}
        </div>

        {/* Color preview */}
        <div style={{ marginTop: 14, borderRadius: 12, overflow: 'hidden', height: 60, background: 'linear-gradient(135deg, #E91E8C, #FF6BB5, #FFB3D9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="tsengo-logo" style={{ width: 36, height: 36, fontSize: 20 }}>T</div>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 20, marginLeft: 8 }}>Tsengo</span>
        </div>
      </div>

      {/* About */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <HiShieldCheck color="#E91E8C" size={20} />
          <h3 style={{ fontWeight: 700, fontSize: 15, color: '#2D1220' }}>Momba Tsengo</h3>
        </div>
        <p style={{ fontSize: 13, color: '#8B5A6F', lineHeight: 1.6 }}>
          Tsengo dia tambajotra sosialy malagasy — ahazoanao mizara, mivarotra ary miresaka amin'ny namanao.
        </p>
        <p style={{ fontSize: 12, color: '#C4829F', marginTop: 8 }}>Version 1.0.0</p>
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
        <HiLogout size={20} />
        {t('logout')}
      </button>
    </div>
  );
}
