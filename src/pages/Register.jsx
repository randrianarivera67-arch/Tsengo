// src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// ✅ FIX: Strong password validation
const PASSWORD_MIN = 8;
const USERNAME_REGEX = /^[a-z0-9_.]{3,30}$/;

export default function Register() {
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  function getPasswordStrength(pw) {
    let score = 0;
    if (pw.length >= PASSWORD_MIN) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0–4
  }

  const pwStrength = getPasswordStrength(form.password);
  const pwColors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  const pwLabels = ['Malemy loatra', 'Miandany', 'Tsara', 'Matanjaka'];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // ✅ FIX: Stronger validations
    if (form.fullName.trim().length < 2) return setError('Anarana 2 tarehintsoratra farafahakeliny');
    if (!USERNAME_REGEX.test(form.username.toLowerCase())) {
      return setError('Username: litera kely, isa, underscore, dot ihany (3–30 chars)');
    }
    if (form.password.length < PASSWORD_MIN) return setError(`Teny miafina ${PASSWORD_MIN} tarehintsoratra farafahakeliny`);
    if (form.password !== form.confirm) return setError('Teny miafina tsy mitovy / Mots de passe différents');

    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('username', '==', form.username.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) return setError('Username efa ampiasaina / Username déjà utilisé');

      await register(form.email, form.password, form.fullName.trim(), form.username);
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email efa ampiasaina / Email déjà utilisé');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email tsy mety / Email invalide');
      } else {
        setError(t('error') + ': ' + err.message);
      }
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #E4E6EB 0%, #F0F2F5 50%, #E4E6EB 100%)',
      padding: 20
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/tsengo-logo.png" alt="Traingo" className="logo-shimmer" style={{ width:64, height:64, objectFit:"contain", margin:"0 auto 10px", display:"block" }}/>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1877F2', letterSpacing: -1 }}>Traingo</h1>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#050505' }}>{t('createAccount')}</h2>

          {error && (
            <div style={{ background: '#E4E6EB', border: '1px solid #1877F2', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#0E5FCB', fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Full name */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#65676B', marginBottom: 5, display: 'block' }}>{t('fullName')}</label>
              <input className="input" type="text" name="fullName" value={form.fullName} onChange={handleChange} required placeholder="Rakoto Andry" maxLength={60} autoComplete="name" />
            </div>

            {/* Username */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#65676B', marginBottom: 5, display: 'block' }}>{t('username')}</label>
              <input className="input" type="text" name="username" value={form.username} onChange={handleChange} required placeholder="rakoto_andry" maxLength={30} autoComplete="username" />
              <p style={{ fontSize: 11, color: '#65676B', marginTop: 3 }}>Litera kely, isa, underscore, dot ihany</p>
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#65676B', marginBottom: 5, display: 'block' }}>{t('email')}</label>
              <input className="input" type="email" name="email" value={form.email} onChange={handleChange} required placeholder="exemple@mail.com" autoComplete="email" />
            </div>

            {/* Password + strength indicator */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#65676B', marginBottom: 5, display: 'block' }}>{t('password')}</label>
              <input className="input" type="password" name="password" value={form.password} onChange={handleChange} required placeholder="••••••••" minLength={PASSWORD_MIN} autoComplete="new-password" />
              {form.password.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i < pwStrength ? pwColors[pwStrength - 1] : '#E4E6EB', transition: 'background 0.3s' }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: pwColors[Math.max(0, pwStrength - 1)] }}>{pwLabels[Math.max(0, pwStrength - 1)]}</p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#65676B', marginBottom: 5, display: 'block' }}>{t('confirmPassword')}</label>
              <input className="input" type="password" name="confirm" value={form.confirm} onChange={handleChange} required placeholder="••••••••" minLength={PASSWORD_MIN} autoComplete="new-password" />
              {form.confirm.length > 0 && form.password !== form.confirm && (
                <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>Teny miafina tsy mitovy</p>
              )}
            </div>

            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8, width: '100%', padding: '12px' }}>
              {loading ? t('loading') : t('createAccount')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: '#65676B' }}>
            {t('alreadyAccount')}{' '}
            <Link to="/login" style={{ color: '#1877F2', fontWeight: 600, textDecoration: 'none' }}>
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
