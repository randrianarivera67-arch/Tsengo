// src/pages/SecuritySettings.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyBeforeUpdateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { HiArrowLeft, HiMail, HiLockClosed, HiQuestionMarkCircle, HiChevronRight, HiCheckCircle, HiX } from 'react-icons/hi';

export default function SecuritySettings() {
  const { currentUser } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [section, setSection] = useState(null); // 'email' | 'password' | 'help'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  async function reauthenticate() {
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
  }

  async function handleEmailUpdate() {
    if (!newEmail.trim() || !currentPassword) return;
    setLoading(true); setError(null);
    try {
      await reauthenticate();
      await verifyBeforeUpdateEmail(currentUser, newEmail.trim());
      setMessage('Email de vérification envoyé ! Vérifiez votre boîte mail.');
      setNewEmail(''); setCurrentPassword('');
    } catch (err) {
      setError(err.message.includes('wrong-password') ? 'Mot de passe incorrect' : err.message);
    }
    setLoading(false);
  }

  async function handlePasswordUpdate() {
    if (!newPassword || newPassword !== confirmPassword) { setError('Les mots de passe ne correspondent pas'); return; }
    if (newPassword.length < 6) { setError('Minimum 6 caractères'); return; }
    setLoading(true); setError(null);
    try {
      await reauthenticate();
      await updatePassword(currentUser, newPassword);
      setMessage('Mot de passe mis à jour !');
      setNewPassword(''); setConfirmPassword(''); setCurrentPassword('');
    } catch (err) {
      setError(err.message.includes('wrong-password') ? 'Mot de passe actuel incorrect' : err.message);
    }
    setLoading(false);
  }

  const items = [
    { key: 'email', icon: HiMail, label: 'Modifier l\'email', desc: currentUser?.email, color: '#3b82f6' },
    { key: 'password', icon: HiLockClosed, label: 'Modifier le mot de passe', desc: '••••••••', color: '#8b5cf6' },
    { key: 'help', icon: HiQuestionMarkCircle, label: 'Aide & Support', desc: 'Contacter l\'assistance', color: '#10b981' },
  ];

  return (
    <div style={{ padding: '16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => { if (section) { setSection(null); setMessage(null); setError(null); } else navigate('/settings'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E91E8C', display: 'flex', alignItems: 'center' }}>
          <HiArrowLeft size={22} />
        </button>
        <h2 style={{ fontWeight: 700, fontSize: 20, color: '#E91E8C' }}>Sécurité</h2>
      </div>

      {message && (
        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#065f46' }}>
          <HiCheckCircle size={18} color="#10b981" /> {message}
        </div>
      )}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#991b1b' }}>
          <HiX size={18} color="#ef4444" /> {error}
        </div>
      )}

      {!section && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                onClick={() => { setSection(item.key); setMessage(null); setError(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', cursor: 'pointer',
                  borderBottom: i < items.length - 1 ? '1px solid #FFF0F8' : 'none',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#FFF8FC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 38, height: 38, borderRadius: 12, background: item.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={item.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: '#C4829F' }}>{item.desc}</p>
                </div>
                <HiChevronRight size={18} color="#C4829F" />
              </div>
            );
          })}
        </div>
      )}

      {section === 'email' && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: '#E91E8C' }}>Modifier l'email</h3>
          <p style={{ fontSize: 12, color: '#8B5A6F', marginBottom: 16 }}>Email actuel : <strong>{currentUser?.email}</strong></p>
          <input className="input" placeholder="Nouveau email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ marginBottom: 10 }} type="email" />
          <input className="input" placeholder="Mot de passe actuel" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={{ marginBottom: 16 }} type="password" />
          <button className="btn-primary" onClick={handleEmailUpdate} disabled={loading} style={{ width: '100%' }}>
            {loading ? '...' : 'Mettre à jour'}
          </button>
        </div>
      )}

      {section === 'password' && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: '#E91E8C' }}>Modifier le mot de passe</h3>
          <input className="input" placeholder="Mot de passe actuel" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={{ marginBottom: 10 }} type="password" />
          <input className="input" placeholder="Nouveau mot de passe" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ marginBottom: 10 }} type="password" />
          <input className="input" placeholder="Confirmer mot de passe" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ marginBottom: 16 }} type="password" />
          <button className="btn-primary" onClick={handlePasswordUpdate} disabled={loading} style={{ width: '100%' }}>
            {loading ? '...' : 'Mettre à jour'}
          </button>
        </div>
      )}

      {section === 'help' && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: '#E91E8C' }}>Aide & Support</h3>
          <p style={{ fontSize: 14, color: '#8B5A6F', lineHeight: 1.7, marginBottom: 20 }}>
            Misy olana ve ianao na manana fanontaniana momba ny Tsengo?<br/>
            Mifandraisa aminay amin'ny alalan'ny e-mail eto ambany.
          </p>
          <a
            href="mailto:randrianarivera67@gmail.com"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'linear-gradient(135deg,#E91E8C,#FF6BB5)',
              color: 'white', borderRadius: 25, padding: '12px 20px',
              textDecoration: 'none', fontWeight: 700, fontSize: 14,
            }}
          >
            <HiMail size={18} /> randrianarivera67@gmail.com
          </a>
          <div style={{ marginTop: 14, padding: 14, background: '#FFF0F8', borderRadius: 12 }}>
            <p style={{ fontSize: 12, color: '#C4829F', lineHeight: 1.6 }}>
              📋 Raha manana olana momba ny kaonty, ny password, na ny fonctionnalité rehetra dia mira e-mail dia valiana vetivety.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
