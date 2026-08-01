// src/pages/SecuritySettings.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyBeforeUpdateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser, signOut } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { HiArrowLeft, HiMail, HiLockClosed, HiQuestionMarkCircle, HiChevronRight, HiCheckCircle, HiX, HiPause, HiTrash } from 'react-icons/hi';

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
  const [confirmText, setConfirmText] = useState('');   // fanamarinana « SUPPRIMER »

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

  /**
   * DÉSACTIVER — azo averina. Ny publication sy commentaire TAZONINA.
   * Miverina ho velona rehefa miditra indray ny mpampiasa.
   */
  async function handleDeactivate() {
    if (!currentPassword) { setError('Entrez votre mot de passe.'); return; }
    if (!window.confirm(
      'Désactiver votre compte ?\n\n' +
      "Votre profil ne sera plus visible. Vos publications et commentaires sont conservés.\n" +
      'Vous pouvez réactiver à tout moment en vous reconnectant.'
    )) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      await reauthenticate();
      await updateDoc(doc(db, 'users', currentUser.uid), {
        disabled: true, disabledAt: serverTimestamp(),
      });
      await signOut(auth);
    } catch (e) {
      setError(e.code === 'auth/wrong-password' ? 'Mot de passe incorrect.'
             : e.code === 'auth/too-many-requests' ? 'Trop de tentatives. Réessayez plus tard.'
             : 'Erreur : ' + (e.message || e.code));
    } finally { setLoading(false); }
  }

  /**
   * SUPPRIMER — TSY AZO AVERINA.
   *
   * ⚠️ Ny publication sy ny commentaire dia TSY fafana eto : an-jatony ny
   * écriture, ary raha tapaka eo antenatenany dia hisy données very antsasany.
   * Ny fomba mety dia asa backend (fanadiovana miandalana). Eto dia :
   *   • marihina deletedAt sy disabled
   *   • diovina ny données manokana (sary, bio, telefaona…)
   *   • fafana ny kaonty Auth → tsy azo idirana intsony
   */
  async function handleDeleteAccount() {
    if (!currentPassword) { setError('Entrez votre mot de passe.'); return; }
    if (confirmText.trim().toUpperCase() !== 'SUPPRIMER') {
      setError('Tapez SUPPRIMER pour confirmer.'); return;
    }
    if (!window.confirm(
      'SUPPRIMER DÉFINITIVEMENT votre compte ?\n\n' +
      'Cette action est IRRÉVERSIBLE.\n' +
      'Vous perdrez l\'accès à votre profil, vos messages et votre boutique.'
    )) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      await reauthenticate();
      // Fanadiovana ny données manokana ALOHAN'ny famafana ny Auth
      await updateDoc(doc(db, 'users', currentUser.uid), {
        disabled: true, deletedAt: serverTimestamp(),
        photoURL: '', photoThumb: '', coverURL: '', bio: '', phone: '',
      }).catch(() => {});
      await deleteUser(currentUser);
    } catch (e) {
      setError(e.code === 'auth/wrong-password' ? 'Mot de passe incorrect.'
             : e.code === 'auth/requires-recent-login' ? 'Reconnectez-vous puis réessayez.'
             : e.code === 'auth/too-many-requests' ? 'Trop de tentatives. Réessayez plus tard.'
             : 'Erreur : ' + (e.message || e.code));
    } finally { setLoading(false); }
  }

  const items = [
    { key: 'email', icon: HiMail, label: 'Modifier l\'email', desc: currentUser?.email, color: '#3b82f6' },
    { key: 'password', icon: HiLockClosed, label: 'Modifier le mot de passe', desc: '••••••••', color: '#8b5cf6' },
    { key: 'help', icon: HiQuestionMarkCircle, label: 'Aide & Support', desc: 'Contacter l\'assistance', color: '#10b981' },
    { key: 'deactivate', icon: HiPause, label: 'Désactiver mon compte', desc: 'Réversible à tout moment', color: '#f59e0b' },
    { key: 'delete', icon: HiTrash, label: 'Supprimer mon compte', desc: 'Action irréversible', color: '#ef4444' },
  ];

  return (
    <div style={{ padding: '16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => { if (section) { setSection(null); setMessage(null); setError(null); } else navigate('/settings'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1877F2', display: 'flex', alignItems: 'center' }}>
          <HiArrowLeft size={22} />
        </button>
        <h2 style={{ fontWeight: 700, fontSize: 20, color: '#1877F2' }}>Sécurité</h2>
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
                  borderBottom: i < items.length - 1 ? '1px solid #F0F2F5' : 'none',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0F2F5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 38, height: 38, borderRadius: 12, background: item.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={item.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: '#65676B' }}>{item.desc}</p>
                </div>
                <HiChevronRight size={18} color="#65676B" />
              </div>
            );
          })}
        </div>
      )}

      {section === 'email' && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: '#1877F2' }}>Modifier l'email</h3>
          <p style={{ fontSize: 12, color: '#65676B', marginBottom: 16 }}>Email actuel : <strong>{currentUser?.email}</strong></p>
          <input className="input" placeholder="Nouveau email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ marginBottom: 10 }} type="email" />
          <input className="input" placeholder="Mot de passe actuel" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={{ marginBottom: 16 }} type="password" />
          <button className="btn-primary" onClick={handleEmailUpdate} disabled={loading} style={{ width: '100%' }}>
            {loading ? '...' : 'Mettre à jour'}
          </button>
        </div>
      )}

      {section === 'password' && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: '#1877F2' }}>Modifier le mot de passe</h3>
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
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: '#1877F2' }}>Aide & Support</h3>
          <p style={{ fontSize: 14, color: '#65676B', lineHeight: 1.7, marginBottom: 20 }}>
            Misy olana ve ianao na manana fanontaniana momba ny Trengo?<br/>
            Mifandraisa aminay amin'ny alalan'ny e-mail eto ambany.
          </p>
          <a
            href="mailto:randrianarivera67@gmail.com"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'linear-gradient(135deg,#FF2D8D,#FF7AB8)',
              color: 'white', borderRadius: 25, padding: '12px 20px',
              textDecoration: 'none', fontWeight: 700, fontSize: 14,
            }}
          >
            <HiMail size={18} /> randrianarivera67@gmail.com
          </a>
          <div style={{ marginTop: 14, padding: 14, background: '#F0F2F5', borderRadius: 12 }}>
            <p style={{ fontSize: 12, color: '#65676B', lineHeight: 1.6 }}>
              📋 Raha manana olana momba ny kaonty, ny password, na ny fonctionnalité rehetra dia mira e-mail dia valiana vetivety.
            </p>
          </div>
        </div>
      )}
      {(section === 'deactivate' || section === 'delete') && (() => {
        const isDel = section === 'delete';
        const col = isDel ? '#ef4444' : '#f59e0b';
        return (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ background: isDel ? '#fef2f2' : '#fffbeb',
                          border: '1px solid ' + (isDel ? '#fca5a5' : '#fcd34d'),
                          borderRadius: 12, padding: 14, marginBottom: 18 }}>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: isDel ? '#991b1b' : '#92400e', marginBottom: 6 }}>
                {isDel ? 'Action irréversible' : 'Action réversible'}
              </p>
              <p style={{ fontSize: 12.5, lineHeight: 1.65, color: '#65676B' }}>
                {isDel
                  ? "Votre compte sera supprimé définitivement. Vous perdrez l'accès à votre profil, vos messages et votre boutique. Cette action ne peut pas être annulée."
                  : "Votre profil ne sera plus visible. Vos publications et commentaires sont conservés. Reconnectez-vous à tout moment pour réactiver."}
              </p>
            </div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Mot de passe actuel
            </label>
            <input type="password" className="input" value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••"
              style={{ width: '100%', padding: '11px 14px', fontSize: 14, marginBottom: 14 }} />

            {isDel && (
              <>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Tapez <b style={{ color: col }}>SUPPRIMER</b> pour confirmer
                </label>
                <input className="input" value={confirmText}
                  onChange={e => setConfirmText(e.target.value)} placeholder="SUPPRIMER"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, marginBottom: 14 }} />
              </>
            )}

            <button
              onClick={isDel ? handleDeleteAccount : handleDeactivate}
              disabled={loading || !currentPassword || (isDel && confirmText.trim().toUpperCase() !== 'SUPPRIMER')}
              style={{
                width: '100%', padding: '13px', borderRadius: 25, border: 'none',
                background: col, color: 'white', fontFamily: 'Poppins', fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
                opacity: (loading || !currentPassword || (isDel && confirmText.trim().toUpperCase() !== 'SUPPRIMER')) ? .5 : 1,
              }}>
              {loading ? 'Veuillez patienter…' : (isDel ? 'Supprimer définitivement' : 'Désactiver mon compte')}
            </button>

            <button onClick={() => { setSection(null); setConfirmText(''); setCurrentPassword(''); setError(null); }}
              style={{ width: '100%', padding: '11px', marginTop: 10, borderRadius: 25,
                       border: '1px solid #E4E6EB', background: 'white', fontFamily: 'Poppins',
                       fontSize: 14, color: '#65676B', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        );
      })()}
    </div>
  );
}
