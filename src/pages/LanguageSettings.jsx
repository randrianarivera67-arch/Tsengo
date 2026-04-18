// src/pages/LanguageSettings.jsx
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { HiArrowLeft, HiCheck } from 'react-icons/hi';

const LANGS = [
  { code: 'mg', label: 'Malagasy', flag: '🇲🇬', desc: 'Teny malagasy' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', desc: 'Langue française' },
  { code: 'en', label: 'English', flag: '🇬🇧', desc: 'English language' },
];

export default function LanguageSettings() {
  const { lang, changeLang, t } = useLang();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E91E8C', display: 'flex', alignItems: 'center' }}>
          <HiArrowLeft size={22} />
        </button>
        <h2 style={{ fontWeight: 700, fontSize: 20, color: '#E91E8C' }}>{t('language')}</h2>
      </div>

      <p style={{ fontSize: 13, color: '#8B5A6F', marginBottom: 20 }}>
        Misafidy ny fiteny ampiasaina ao amin'ny Tsengo.
      </p>

      <div className="card" style={{ overflow: 'hidden' }}>
        {LANGS.map((l, i) => (
          <div
            key={l.code}
            onClick={() => changeLang(l.code)}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '16px 20px', cursor: 'pointer',
              background: lang === l.code ? '#FFF0F8' : 'white',
              borderBottom: i < LANGS.length - 1 ? '1px solid #FFF0F8' : 'none',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: 32 }}>{l.flag}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: lang === l.code ? 700 : 600, fontSize: 15, color: lang === l.code ? '#E91E8C' : '#2D1220' }}>{l.label}</p>
              <p style={{ fontSize: 12, color: '#C4829F' }}>{l.desc}</p>
            </div>
            {lang === l.code && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E91E8C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiCheck size={16} color="white" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
