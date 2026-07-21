// src/pages/AppearanceSettings.jsx
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { HiArrowLeft, HiSun, HiMoon, HiCheck } from 'react-icons/hi';

const THEMES = [
  {
    value: 'light',
    label: 'Clair',
    desc: 'Fond clair',
    icon: HiSun,
    preview: ['#FFFFFF', '#E4E6EB', '#1877F2'],
  },
  {
    value: 'dark',
    label: 'Sombre',
    desc: 'Fond sombre',
    icon: HiMoon,
    preview: ['#0B0D12', '#050505', '#1877F2'],
  },
];

export default function AppearanceSettings() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1877F2', display: 'flex', alignItems: 'center' }}>
          <HiArrowLeft size={22} />
        </button>
        <h2 style={{ fontWeight: 700, fontSize: 20, color: '#1877F2' }}>{t('appearance')}</h2>
      </div>

      <p style={{ fontSize: 13, color: '#65676B', marginBottom: 20 }}>
        Safidio ny endrika maha-hita ny Trengo.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {THEMES.map(th => {
          const Icon = th.icon;
          const isActive = theme === th.value;
          return (
            <div
              key={th.value}
              onClick={() => toggleTheme(th.value)}
              style={{
                border: isActive ? '2px solid #1877F2' : '2px solid #E4E6EB',
                borderRadius: 16, padding: 16, cursor: 'pointer',
                background: isActive ? '#F0F2F5' : 'white',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 16,
              }}
            >
              {/* Color preview */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {th.preview.map((c, i) => (
                  <div key={i} style={{ width: 20, height: 40, borderRadius: 6, background: c, border: '1px solid #E4E6EB' }} />
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Icon size={18} color={isActive ? '#1877F2' : '#65676B'} />
                  <p style={{ fontWeight: 700, fontSize: 15, color: isActive ? '#1877F2' : '#050505' }}>{th.label}</p>
                </div>
                <p style={{ fontSize: 12, color: '#65676B' }}>{th.desc}</p>
              </div>
              {isActive && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HiCheck size={16} color="white" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, borderRadius: 16, overflow: 'hidden', height: 70, background: 'linear-gradient(135deg,#1877F2,#63A9FF,#FFB3D9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src='/trengo-logo.png' alt="Trengo" style={{ width: 54, height: 54, objectFit: 'contain', background: 'white', borderRadius: 12, padding: 4 }} />
        <span style={{ color: 'white', fontWeight: 800, fontSize: 22, marginLeft: 10 }}>Trengo</span>
      </div>
    </div>
  );
}
