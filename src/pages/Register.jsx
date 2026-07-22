// src/pages/Register.jsx — Inscription Trengo en 3 étapes
// Étape 1 : création du compte (nom, username, email, mot de passe)
// Étape 2 : infos du profil (travail, étude, villes, contact, site web) — Ignorer possible
// Étape 3 : photo de profil + photo de couverture — Ignorer possible
import { GENDERS, detectLocation } from '../utils/geoLocate';
import { useState, useRef } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToCloudinary } from '../utils/cloudinary';

// ✅ FIX: Strong password validation
const PASSWORD_MIN = 8;
const USERNAME_REGEX = /^[a-z0-9_.]{3,30}$/;

export default function Register() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirm: '' });
  const [infoForm, setInfoForm] = useState({ work: '', study: '', hometown: '', currentCity: '', phone: '', website: '', gender: '', country: '', countryCode: '' });
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoNote, setGeoNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Étape 3 — photos
  const [profileFile, setProfileFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [uploadPct, setUploadPct] = useState(0);
  const profileRef = useRef();
  const coverRef = useRef();

  const { register, currentUser, setUserProfile } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  // Rehefa vita ny fanamboarana kaonty (étape 3), tsy tokony hiverina eto intsony.
  if (currentUser && !creating) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleInfoChange = (e) => setInfoForm(p => ({ ...p, [e.target.name]: e.target.value }));

  // Maka ny ville + pays amin'ny alalan'ny GPS. Facultatif tanteraka :
  // raha lavina na tsy mety dia soratan'ny mpampiasa an-tanana fotsiny.
  async function useMyLocation() {
    setGeoBusy(true); setGeoNote('');
    const r = await detectLocation();
    setGeoBusy(false);
    if (!r.ok) { setGeoNote(r.message); return; }
    setInfoForm(p => ({
      ...p,
      currentCity: r.city || p.currentCity,
      country: r.country || p.country,
      countryCode: r.countryCode || p.countryCode,
    }));
    setGeoNote('Lieu détecté : ' + [r.city, r.country].filter(Boolean).join(', '));
  }

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

  // ── Étape 1 : angona ilaina, tsy mbola mamorona kaonty ────────
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
      // ✅ FIX permissions: verif username via doc usernames (etape1)
      const unameSnap = await getDoc(doc(db, 'usernames', form.username.toLowerCase()));
      if (unameSnap.exists()) {
        setLoading(false);
        return setError('Username efa ampiasaina / Username déjà utilisé');
      }
      setStep(2);
    } catch (err) {
      setError(t('error') + ': ' + err.message);
    }
    setLoading(false);
  }

  // ── Étape 2 : infos du profil (facultatif) ───────────────────
  function isValidWebsite(url) {
    if (!url) return true;
    return /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}([/?#].*)?$/.test(url.trim());
  }
  function isValidPhone(p) {
    if (!p) return true;
    return /^[+0-9 ().-]{7,20}$/.test(p.trim());
  }

  async function handleInfoSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isValidPhone(infoForm.phone)) return setError('Numéro de téléphone tsy mety / invalide');
    if (!isValidWebsite(infoForm.website)) return setError('Site web tsy mety / invalide (ex: monsite.com)');
    setStep(3);
  }

  // ── Étape 3 : photos (facultatif) ────────────────────────────
  function pickProfile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('Sary (image) ihany no azo alefa');
    if (f.size > 8 * 1024 * 1024) return setError('Sary lehibe loatra (max 8 Mo)');
    setError('');
    setProfileFile(f);
    setProfilePreview(URL.createObjectURL(f));
  }
  function pickCover(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('Sary (image) ihany no azo alefa');
    if (f.size > 10 * 1024 * 1024) return setError('Sary lehibe loatra (max 10 Mo)');
    setError('');
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  async function handlePhotosSubmit(e) {
    e.preventDefault();
    await finalizeAccount(false);
  }

  async function finalizeAccount(skipPhotos) {
    setError('');
    setLoading(true);
    setCreating(true);
    try {
      // Fanamarinana farany, sao efa nalain'olona ilay username nandritra ny fenoana étape 2-3
      // ✅ FIX permissions: verif username via doc usernames (finalize)
      const unameSnap2 = await getDoc(doc(db, 'usernames', form.username.toLowerCase()));
      if (unameSnap2.exists()) {
        setCreating(false);
        setLoading(false);
        setStep(1);
        return setError('Username efa ampiasaina / Username déjà utilisé — avero ny étape 1');
      }

      const res = await register(form.email, form.password, form.fullName.trim(), form.username);
      const uid = res.user.uid;

      const infoData = {
        work: infoForm.work.trim(),
        study: infoForm.study.trim(),
        hometown: infoForm.hometown.trim(),
        currentCity: infoForm.currentCity.trim(),
        phone: infoForm.phone.trim(),
        website: infoForm.website.trim(),
        gender: infoForm.gender,
        country: infoForm.country.trim(),
        countryCode: infoForm.countryCode,
      };
      if (Object.values(infoData).some(v => v)) {
        await updateDoc(doc(db, 'users', uid), infoData);
        setUserProfile(p => ({ ...(p || {}), ...infoData }));
      }

      if (!skipPhotos && (profileFile || coverFile)) {
        const photoUpdates = {};
        if (profileFile) {
          const r = await uploadToCloudinary(profileFile, 'trengo/avatars', p => setUploadPct(p));
          photoUpdates.photoURL = r.url;
        }
        if (coverFile) {
          setUploadPct(0);
          const r = await uploadToCloudinary(coverFile, 'trengo/covers', p => setUploadPct(p));
          photoUpdates.coverURL = r.url;
        }
        if (Object.keys(photoUpdates).length) {
          await updateDoc(doc(db, 'users', uid), photoUpdates);
          setUserProfile(p => ({ ...(p || {}), ...photoUpdates }));
        }
      }

      finishOnboarding();
    } catch (err) {
      setCreating(false);
      setLoading(false);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email efa ampiasaina / Email déjà utilisé — avero ny étape 1');
        setStep(1);
      } else if (err.code === 'auth/invalid-email') {
        setError('Email tsy mety / Email invalide — avero ny étape 1');
        setStep(1);
      } else {
        setError("Upload tsy nety, andramo indray na tsindrio 'Ignorer'");
      }
    }
  }

  function finishOnboarding() {
    setLoading(false);
    navigate('/', { replace: true });
  }

  const inputLabel = { fontSize: 13, fontWeight: 500, color: '#65676B', marginBottom: 5, display: 'block' };
  const errorBox = { background: '#E4E6EB', border: '1px solid #1877F2', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#0E5FCB', fontSize: 13 };
  const skipBtn = { background: 'none', border: '1px solid #CED0D4', borderRadius: 8, padding: '11px', color: '#65676B', fontWeight: 600, fontSize: 14, cursor: 'pointer', width: '100%' };

  // Indicateur d'étapes 1·2·3
  const StepDots = () => (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 5, background: i <= step ? '#1877F2' : '#E4E6EB', transition: 'all 0.3s' }} />
      ))}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundImage: 'linear-gradient(rgba(8, 30, 63, 0.35), rgba(8, 30, 63, 0.45)), url(/login-bg.jpg)',
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      padding: 20
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/trengo-logo.png" alt="Trengo" style={{ width:64, height:64, objectFit:"contain", margin:"0 auto 10px", display:"block", filter:'drop-shadow(0 4px 14px rgba(0,0,0,0.35))' }}/>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', letterSpacing: -1, textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>Trengo</h1>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <StepDots />

          {/* ════════ ÉTAPE 1 — Compte ════════ */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#050505' }}>{t('createAccount')}</h2>

              {error && <div style={errorBox}>{error}</div>}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Full name */}
                <div>
                  <label style={inputLabel}>{t('fullName')}</label>
                  <input className="input" type="text" name="fullName" value={form.fullName} onChange={handleChange} required placeholder="Rakoto Andry" maxLength={60} autoComplete="name" />
                </div>

                {/* Username */}
                <div>
                  <label style={inputLabel}>{t('username')}</label>
                  <input className="input" type="text" name="username" value={form.username} onChange={handleChange} required placeholder="rakoto_andry" maxLength={30} autoComplete="username" />
                  <p style={{ fontSize: 11, color: '#65676B', marginTop: 3 }}>Litera kely, isa, underscore, dot ihany</p>
                </div>

                {/* Email */}
                <div>
                  <label style={inputLabel}>{t('email')}</label>
                  <input className="input" type="email" name="email" value={form.email} onChange={handleChange} required placeholder="exemple@mail.com" autoComplete="email" />
                </div>

                {/* Password + strength indicator */}
                <div>
                  <label style={inputLabel}>{t('password')}</label>
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
                  <label style={inputLabel}>{t('confirmPassword')}</label>
                  <input className="input" type="password" name="confirm" value={form.confirm} onChange={handleChange} required placeholder="••••••••" minLength={PASSWORD_MIN} autoComplete="new-password" />
                  {form.confirm.length > 0 && form.password !== form.confirm && (
                    <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>Teny miafina tsy mitovy</p>
                  )}
                </div>

                <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8, width: '100%', padding: '12px' }}>
                  {loading ? t('loading') : 'Suivant / Manaraka'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: '#65676B' }}>
                {t('alreadyAccount')}{' '}
                <Link to="/login" style={{ color: '#1877F2', fontWeight: 600, textDecoration: 'none' }}>
                  {t('login')}
                </Link>
              </p>
            </>
          )}

          {/* ════════ ÉTAPE 2 — Infos du profil ════════ */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: '#050505' }}>Fanampim-panazavana / À propos de vous</h2>
              <p style={{ fontSize: 13, color: '#65676B', marginBottom: 18 }}>Tsy voatery fenoina — azonao atao ny manindry « Ignorer ».</p>

              {error && <div style={errorBox}>{error}</div>}

              <form onSubmit={handleInfoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={inputLabel}>Travail</label>
                  <input className="input" type="text" name="work" value={infoForm.work} onChange={handleInfoChange} placeholder="Ex : Développeur chez Trengo" maxLength={80} />
                </div>
                <div>
                  <label style={inputLabel}>Étude</label>
                  <input className="input" type="text" name="study" value={infoForm.study} onChange={handleInfoChange} placeholder="Ex : Université d'Antananarivo" maxLength={80} />
                </div>
                <div>
                  <label style={inputLabel}>Ville d'origine</label>
                  <input className="input" type="text" name="hometown" value={infoForm.hometown} onChange={handleInfoChange} placeholder="Ex : Toamasina" maxLength={60} />
                </div>
                <div>
                  <label style={inputLabel}>Genre</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {GENDERS.map(g => (
                      <button key={g.value} type="button"
                        onClick={() => setInfoForm(p => ({ ...p, gender: p.gender === g.value ? '' : g.value }))}
                        style={{
                          flex: 1, padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
                          fontFamily: 'Poppins', fontWeight: 600, fontSize: 13,
                          border: infoForm.gender === g.value ? 'none' : '1px solid #E4E6EB',
                          background: infoForm.gender === g.value ? 'linear-gradient(135deg,#FF2D8D,#FF7AB8)' : '#FFFFFF',
                          color: infoForm.gender === g.value ? '#fff' : '#65676B',
                        }}>{g.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={inputLabel}>Ville actuelle</label>
                  <input className="input" type="text" name="currentCity" value={infoForm.currentCity} onChange={handleInfoChange} placeholder="Ex : Antananarivo" maxLength={60} />
                </div>
                <div>
                  <label style={inputLabel}>Pays</label>
                  <input className="input" type="text" name="country" value={infoForm.country}
                    onChange={e => setInfoForm(p => ({ ...p, country: e.target.value, countryCode: '' }))}
                    placeholder="Ex : Madagascar" maxLength={60} />
                  <button type="button" onClick={useMyLocation} disabled={geoBusy}
                    style={{
                      marginTop: 8, width: '100%', padding: '10px', borderRadius: 12, border: '1px solid #1877F2',
                      background: geoBusy ? '#E4E6EB' : '#EAF2FF', color: geoBusy ? '#65676B' : '#1877F2',
                      fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, cursor: geoBusy ? 'wait' : 'pointer',
                    }}>
                    {geoBusy ? 'Localisation en cours…' : 'Détecter ma ville et mon pays'}
                  </button>
                  {geoNote && <p style={{ fontSize: 11.5, color: '#65676B', marginTop: 6, lineHeight: 1.45 }}>{geoNote}</p>}
                </div>
                <div>
                  <label style={inputLabel}>Contact</label>
                  <input className="input" type="tel" name="phone" value={infoForm.phone} onChange={handleInfoChange} placeholder="+261 34 00 000 00" maxLength={20} autoComplete="tel" />
                </div>
                <div>
                  <label style={inputLabel}>Site web</label>
                  <input className="input" type="text" name="website" value={infoForm.website} onChange={handleInfoChange} placeholder="monsite.com" maxLength={100} autoComplete="url" />
                </div>

                <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 4, width: '100%', padding: '12px' }}>
                  {loading ? t('loading') : 'Continuer / Hanohy'}
                </button>
                <button type="button" onClick={() => { setError(''); setStep(3); }} disabled={loading} style={skipBtn}>
                  Ignorer
                </button>
              </form>
            </>
          )}

          {/* ════════ ÉTAPE 3 — Photos ════════ */}
          {step === 3 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: '#050505' }}>Sary / Vos photos</h2>
              <p style={{ fontSize: 13, color: '#65676B', marginBottom: 18 }}>Ampio sary profil sy couverture — na tsindrio « Ignorer ».</p>

              {error && <div style={errorBox}>{error}</div>}

              <form onSubmit={handlePhotosSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Couverture + avatar preview (style profil) */}
                <div style={{ position: 'relative', marginBottom: 34 }}>
                  <div
                    onClick={() => !loading && coverRef.current.click()}
                    style={{
                      height: 120, borderRadius: 12, cursor: 'pointer', overflow: 'hidden',
                      background: coverPreview ? 'transparent' : 'linear-gradient(120deg,#63A9FF,#1877F2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                    }}
                  >
                    {coverPreview
                      ? <img src={coverPreview} alt="couverture" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>📷 Photo de couverture</span>}
                  </div>
                  <input ref={coverRef} type="file" accept="image/*" onChange={pickCover} style={{ display: 'none' }} />

                  <div
                    onClick={() => !loading && profileRef.current.click()}
                    style={{
                      position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: -30,
                      width: 84, height: 84, borderRadius: '50%', border: '4px solid white', cursor: 'pointer',
                      background: profilePreview ? 'transparent' : '#E4E6EB', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
                    }}
                  >
                    {profilePreview
                      ? <img src={profilePreview} alt="profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 24 }}>👤</span>}
                  </div>
                  <input ref={profileRef} type="file" accept="image/*" onChange={pickProfile} style={{ display: 'none' }} />
                </div>

                <p style={{ fontSize: 12, color: '#65676B', textAlign: 'center', marginTop: 4 }}>
                  Tsindrio ny boribory = sary profil · Tsindrio ny takelaka = couverture
                </p>

                {loading && (
                  <div>
                    <div style={{ height: 6, background: '#E4E6EB', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${uploadPct}%`, background: '#1877F2', transition: 'width 0.2s' }} />
                    </div>
                    <p style={{ fontSize: 11, color: '#65676B', marginTop: 4, textAlign: 'center' }}>Upload… {uploadPct}%</p>
                  </div>
                )}

                <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px' }}>
                  {loading ? t('loading') : t('createAccount')}
                </button>
                <button type="button" onClick={() => finalizeAccount(true)} disabled={loading} style={skipBtn}>
                  Ignorer
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
