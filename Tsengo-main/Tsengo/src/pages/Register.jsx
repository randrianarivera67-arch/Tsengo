// src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function Register() {
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Teny miafina tsy mitovy / Mots de passe différents');
    if (form.password.length < 6) return setError('Teny miafina 6 tarehintsoratra farafahakeliny');
    if (form.username.length < 3) return setError('Username 3 tarehintsoratra farafahakeliny');

    setLoading(true);
    try {
      // Check username unique
      const q = query(collection(db, 'users'), where('username', '==', form.username.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) return setError('Username efa ampiasaina / Username déjà utilisé');

      await register(form.email, form.password, form.fullName, form.username);
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email efa ampiasaina / Email déjà utilisé');
      } else {
        setError(t('error') + ': ' + err.message);
      }
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #FFE4F3 0%, #FDF4F8 50%, #FFE4F3 100%)',
      padding: 20
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="tsengo-logo" style={{ width: 64, height: 64, fontSize: 36, margin: '0 auto 10px' }}>T</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#E91E8C', letterSpacing: -1 }}>Tsengo</h1>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#2D1220' }}>{t('createAccount')}</h2>

          {error && (
            <div style={{ background: '#FFE4F3', border: '1px solid #E91E8C', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#B5156E', fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { name: 'fullName', label: t('fullName'), type: 'text', placeholder: 'Rakoto Andry' },
              { name: 'username', label: t('username'), type: 'text', placeholder: 'rakoto_andry' },
              { name: 'email', label: t('email'), type: 'email', placeholder: 'exemple@mail.com' },
              { name: 'password', label: t('password'), type: 'password', placeholder: '••••••••' },
              { name: 'confirm', label: t('confirmPassword'), type: 'password', placeholder: '••••••••' },
            ].map(({ name, label, type, placeholder }) => (
              <div key={name}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#8B5A6F', marginBottom: 5, display: 'block' }}>{label}</label>
                <input
                  className="input"
                  type={type}
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  required
                  placeholder={placeholder}
                />
              </div>
            ))}

            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8, width: '100%', padding: '12px' }}>
              {loading ? t('loading') : t('createAccount')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: '#8B5A6F' }}>
            {t('alreadyAccount')}{' '}
            <Link to="/login" style={{ color: '#E91E8C', fontWeight: 600, textDecoration: 'none' }}>
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
