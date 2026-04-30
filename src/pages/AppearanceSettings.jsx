// src/pages/AppearanceSettings.jsx
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { HiArrowLeft, HiSun, HiMoon, HiCheck } from 'react-icons/hi';

const THEMES = [
  {
    value: 'light',
    label: 'Rose & Blanc',
    desc: 'Fond blanc, rose clair',
    icon: HiSun,
    preview: ['#FFFFFF', '#FFE4F3', '#E91E8C'],
  },
  {
    value: 'dark',
    label: 'Rose & Nuit',
    desc: 'Fond sombre, accents roses',
    icon: HiMoon,
    preview: ['#1A0A12', '#2D1220', '#E91E8C'],
  },
];

export default function AppearanceSettings() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E91E8C', display: 'flex', alignItems: 'center' }}>
          <HiArrowLeft size={22} />
        </button>
        <h2 style={{ fontWeight: 700, fontSize: 20, color: '#E91E8C' }}>{t('appearance')}</h2>
      </div>

      <p style={{ fontSize: 13, color: '#8B5A6F', marginBottom: 20 }}>
        Safidio ny endrika maha-hita ny Tsengo.
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
                border: isActive ? '2px solid #E91E8C' : '2px solid #FFE4F3',
                borderRadius: 16, padding: 16, cursor: 'pointer',
                background: isActive ? '#FFF0F8' : 'white',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 16,
              }}
            >
              {/* Color preview */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {th.preview.map((c, i) => (
                  <div key={i} style={{ width: 20, height: 40, borderRadius: 6, background: c, border: '1px solid #E8C5D8' }} />
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Icon size={18} color={isActive ? '#E91E8C' : '#C4829F'} />
                  <p style={{ fontWeight: 700, fontSize: 15, color: isActive ? '#E91E8C' : '#2D1220' }}>{th.label}</p>
                </div>
                <p style={{ fontSize: 12, color: '#8B5A6F' }}>{th.desc}</p>
              </div>
              {isActive && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E91E8C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HiCheck size={16} color="white" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, borderRadius: 16, overflow: 'hidden', height: 70, background: 'linear-gradient(135deg,#E91E8C,#FF6BB5,#FFB3D9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 38, height: 38, background: 'white', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#E91E8C' }}>T</div>
        <span style={{ color: 'white', fontWeight: 800, fontSize: 22, marginLeft: 10 }}>Tsengo</span>
      </div>
    </div>
  );
}
