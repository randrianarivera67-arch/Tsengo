// src/pages/Settings.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { HiLogout, HiGlobe, HiColorSwatch, HiSun, HiMoon, HiUser, HiShieldCheck, HiExclamation, HiEyeOff, HiTrash } from 'react-icons/hi';

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

  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    if (!window.confirm('Hivoaka ve ianao?')) return;
    await logout(); navigate('/login');
  }

  async function handleDeactivate() {
    if (!window.confirm(t('deactivateConfirm'))) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { deactivated: true });
      await logout(); navigate('/login');
    } catch (err) { setError(err.message); }
    setActionLoading(false);
  }

  async function handleDelete() {
    if (!password) { setError('Ilaina ny teny miafina'); return; }
    setActionLoading(true); setError('');
    try {
      // Re-authenticate
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      // Fafao Firestore data
      await updateDoc(doc(db, 'users', currentUser.uid), { deleted: true, fullName: 'Compte supprimé', photoURL: '', bio: '' });
      // Fafao Auth account
      await deleteUser(auth.currentUser);
      navigate('/login');
    } catch (err) {
      if (err.code === 'auth/wrong-password') setError('Teny miafina diso');
      else setError(err.message);
    }
    setActionLoading(false);
  }

  const av = userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName || 'U')}&background=E91E8C&color=fff`;

  return (
    <div style={{ padding: '16px 12px' }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, color: '#E91E8C', marginBottom: 20 }}>{t('settings')}</h2>

      {/* Profile summary */}
      <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={av} alt="" className="avatar" style={{ width: 54, height: 54 }} />
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#2D1220' }}>{userProfile?.fullName}</p>
          <p style={{ fontSize: 13, color: '#C4829F' }}>@{userProfile?.username}</p>
          <p style={{ fontSize: 12, color: '#8B5A6F' }}>{currentUser?.email}</p>
        </div>
        <button onClick={() => navigate(`/profile/${currentUser?.uid}`)}
          style={{ marginLeft: 'auto', background: '#FFE4F3', border: 'none', borderRadius: 20, padding: '6px 14px', color: '#E91E8C', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
          <HiUser size={14} style={{ display: 'inline', marginRight: 4 }} />{t('editProfile')}
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
            <button key={l.code} onClick={() => changeLang(l.code)}
              style={{ padding: '10px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 14, background: lang === l.code ? '#E91E8C' : '#FFE4F3', color: lang === l.code ? 'white' : '#E91E8C', display: 'flex', alignItems: 'center', gap: 6, boxShadow: lang === l.code ? '0 3px 12px rgba(233,30,140,0.3)' : 'none' }}>
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
          {[{ value: 'light', label: 'Rose & Blanc', icon: HiSun }, { value: 'dark', label: 'Rose & Nuit', icon: HiMoon }].map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => toggleTheme(value)}
              style={{ flex: 1, padding: '12px 10px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, background: theme === value ? '#E91E8C' : '#FFE4F3', color: theme === value ? 'white' : '#E91E8C', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, boxShadow: theme === value ? '0 4px 15px rgba(233,30,140,0.3)' : 'none' }}>
              <Icon size={22} />{label}
            </button>
          ))}
        </div>
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
        <p style={{ fontSize: 13, color: '#8B5A6F', lineHeight: 1.6 }}>Tsengo dia tambajotra sosialy malagasy — ahazoanao mizara, mivarotra ary miresaka amin'ny namanao.</p>
        <p style={{ fontSize: 12, color: '#C4829F', marginTop: 8 }}>Version 1.0.0</p>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        style={{ width: '100%', padding: 14, borderRadius: 16, border: '2px solid #E91E8C', background: 'white', cursor: 'pointer', color: '#E91E8C', fontFamily: 'Poppins', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}
        onMouseEnter={e => { e.currentTarget.style.background = '#E91E8C'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#E91E8C'; }}>
        <HiLogout size={20} />{t('logout')}
      </button>

      {/* ===== DANGER ZONE ===== */}
      <div className="card" style={{ padding: 16, border: '1.5px solid #FFD0D0', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <HiExclamation color="#ef4444" size={20} />
          <h3 style={{ fontWeight: 700, fontSize: 15, color: '#ef4444' }}>{t('accountDanger')}</h3>
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{error}</p>}

        {/* Désactiver */}
        <button onClick={() => setShowDeactivate(!showDeactivate)}
          style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid #f97316', background: showDeactivate ? '#fff7ed' : 'white', cursor: 'pointer', color: '#f97316', fontFamily: 'Poppins', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <HiEyeOff size={18} />{t('deactivateAccount')}
        </button>
        {showDeactivate && (
          <div style={{ background: '#fff7ed', borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <p style={{ fontSize: 13, color: '#92400e', marginBottom: 10 }}>{t('deactivateConfirm')}</p>
            <button onClick={handleDeactivate} disabled={actionLoading}
              style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {actionLoading ? t('loading') : t('deactivateAccount')}
            </button>
          </div>
        )}

        {/* Supprimer */}
        <button onClick={() => setShowDelete(!showDelete)}
          style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid #ef4444', background: showDelete ? '#fef2f2' : 'white', cursor: 'pointer', color: '#ef4444', fontFamily: 'Poppins', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <HiTrash size={18} />{t('deleteAccount')}
        </button>
        {showDelete && (
          <div style={{ background: '#fef2f2', borderRadius: 10, padding: 12, marginTop: 10 }}>
            <p style={{ fontSize: 13, color: '#991b1b', marginBottom: 10 }}>{t('deleteConfirm')}</p>
            <input className="input" type="password" placeholder="Teny miafina" value={password} onChange={e => setPassword(e.target.value)} style={{ marginBottom: 10, borderColor: '#fca5a5' }} />
            <button onClick={handleDelete} disabled={actionLoading}
              style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {actionLoading ? t('loading') : t('deleteAccount')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
