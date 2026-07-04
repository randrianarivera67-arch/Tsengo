// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { login } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Email na teny miafina diso / Email ou mot de passe incorrect');
    }
    setLoading(false);
  }

  // ✅ NEW: Forgot password
  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSent(true);
    } catch (err) {
      setError('Email tsy hita / Email introuvable');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #E4E6EB 0%, #F0F2F5 50%, #E4E6EB 100%)',
      padding: 20
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="/tsengo-logo.png" alt="Traingo" style={{ width:96, height:96, objectFit:"contain", margin:"0 auto 12px", display:"block" }}/>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1877F2', letterSpacing: -1 }}>Traingo</h1>
          <p style={{ color: '#65676B', marginTop: 4, fontSize: 14 }}>{t('welcomeTo')} Traingo</p>
        </div>

        {!showReset ? (
          <div className="card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#050505' }}>{t('login')}</h2>

            {error && (
              <div style={{ background: '#E4E6EB', border: '1px solid #1877F2', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#0E5FCB', fontSize: 13 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#65676B', marginBottom: 6, display: 'block' }}>{t('email')}</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="exemple@mail.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#65676B', marginBottom: 6, display: 'block' }}>{t('password')}</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  minLength={6}
                />
              </div>

              {/* ✅ NEW: Forgot password link */}
              <div style={{ textAlign: 'right', marginTop: -8 }}>
                <button
                  type="button"
                  onClick={() => { setShowReset(true); setError(''); setResetEmail(email); }}
                  style={{ background: 'none', border: 'none', color: '#1877F2', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
                >
                  Teny miafina hadinoina? / Mot de passe oublié?
                </button>
              </div>

              <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 4, width: '100%', padding: '12px' }}>
                {loading ? t('loading') : t('login')}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#65676B' }}>
              {t('noAccount')}{' '}
              <Link to="/register" style={{ color: '#1877F2', fontWeight: 600, textDecoration: 'none' }}>
                {t('register')}
              </Link>
            </p>
          </div>
        ) : (
          /* ✅ NEW: Reset password form */
          <div className="card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#050505' }}>Hamerina teny miafina</h2>
            <p style={{ fontSize: 13, color: '#65676B', marginBottom: 20 }}>
              Ampidiro ny email-nao ary handefa lien famerenana izahay.
            </p>

            {resetSent ? (
              <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 12, padding: '14px 16px', color: '#065f46', fontSize: 14 }}>
                ✅ Email nalefa! Jereo ny boîte mail-nao.
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {error && (
                  <div style={{ background: '#E4E6EB', border: '1px solid #1877F2', borderRadius: 10, padding: '10px 14px', color: '#0E5FCB', fontSize: 13 }}>
                    {error}
                  </div>
                )}
                <input
                  className="input"
                  type="email"
                  placeholder="exemple@mail.com"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? '...' : 'Mandefa email famerenana'}
                </button>
              </form>
            )}

            <button
              onClick={() => { setShowReset(false); setResetSent(false); setError(''); }}
              style={{ marginTop: 16, background: 'none', border: 'none', color: '#65676B', cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'center' }}
            >
              ← Hiverina amin'ny Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
