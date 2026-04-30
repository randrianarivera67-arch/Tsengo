// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #FFE4F3 0%, #FDF4F8 50%, #FFE4F3 100%)',
      padding: 20
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="tsengo-logo" style={{ width: 72, height: 72, fontSize: 40, margin: '0 auto 12px' }}>T</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#E91E8C', letterSpacing: -1 }}>Tsengo</h1>
          <p style={{ color: '#C4829F', marginTop: 4, fontSize: 14 }}>{t('welcomeTo')} Tsengo</p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#2D1220' }}>{t('login')}</h2>

          {error && (
            <div style={{ background: '#FFE4F3', border: '1px solid #E91E8C', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#B5156E', fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#8B5A6F', marginBottom: 6, display: 'block' }}>{t('email')}</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="exemple@mail.com"
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#8B5A6F', marginBottom: 6, display: 'block' }}>{t('password')}</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8, width: '100%', padding: '12px' }}>
              {loading ? t('loading') : t('login')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#8B5A6F' }}>
            {t('noAccount')}{' '}
            <Link to="/register" style={{ color: '#E91E8C', fontWeight: 600, textDecoration: 'none' }}>
              {t('register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
