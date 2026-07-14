// src/components/PushDiagnostic.jsx
// Diagnostic push BLINDÉ : la plateforme s'affiche IMMÉDIATEMENT (synchrone),
// jamais bloqué sur "Chargement". Les parties async ont des timeouts.
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { sendTestPush } from '../utils/nativePush';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((res) => setTimeout(() => res(fallback), ms)),
  ]);
}

export default function PushDiagnostic({ uid }) {
  // ── SYNCHRONE : disponible dès le premier rendu ──
  const platform = Capacitor.getPlatform();          // 'android' | 'ios' | 'web'
  const isNative = Capacitor.isNativePlatform();     // true / false
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  const [permission, setPermission] = useState('…');
  const [tokenCount, setTokenCount] = useState('…');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  async function load() {
    setPermission('…'); setTokenCount('…');
    // Permission
    try {
      if (isNative) {
        const mod = await withTimeout(import('@capacitor/push-notifications'), 3500, null);
        if (mod && mod.PushNotifications) {
          const p = await withTimeout(mod.PushNotifications.checkPermissions(), 3500, { receive: 'timeout' });
          setPermission(p && p.receive ? p.receive : 'inconnu');
        } else setPermission('plugin absent');
      } else {
        setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'n/a');
      }
    } catch (e) { setPermission('err'); }
    // Tokens Firestore
    try {
      const snap = await withTimeout(getDoc(doc(db, 'users', uid)), 4000, null);
      const toks = (snap && snap.exists && snap.exists() && snap.data().fcmTokens) || [];
      setTokenCount(Array.isArray(toks) ? toks.length : 0);
    } catch { setTokenCount('err'); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [uid]);

  async function doTest() {
    setTesting(true); setResult(null);
    try { setResult(await sendTestPush(uid)); }
    catch (e) { setResult({ ok: false, status: 0, body: (e && e.message) || String(e) }); }
    setTesting(false);
  }

  const verdict = (isNative && platform === 'android')
    ? { txt: '✅ APK NATIF (Capacitor)', color: '#22c55e' }
    : (ua.indexOf('; wv)') !== -1)
      ? { txt: '⚠️ WebView / TWA (web)', color: '#f59e0b' }
      : { txt: '⚠️ PWA / navigateur (web)', color: '#f59e0b' };

  const row = (label, value, good) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderBottom: '1px solid #232733' }}>
      <span style={{ fontSize: 12, color: '#65676B', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'right', wordBreak: 'break-all', color: good === true ? '#22c55e' : good === false ? '#ef4444' : '#E4E6EB' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ background: '#050505', border: '1px solid #232733', borderRadius: 14, padding: '14px 16px', marginBottom: 14, fontFamily: 'Poppins' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: '#E4E6EB' }}>🔔 Diagnostic Push</p>
        <button onClick={load} style={{ background: '#232733', border: 'none', borderRadius: 16, padding: '5px 12px', color: '#65676B', cursor: 'pointer', fontSize: 12 }}>↻ Rafraîchir</button>
      </div>

      <div style={{ background: verdict.color + '22', border: '1px solid ' + verdict.color + '55', borderRadius: 10, padding: '8px 12px', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: verdict.color }}>{verdict.txt}</span>
      </div>

      {row('Plateforme', platform + (isNative ? ' (natif)' : ' (web)'), isNative)}
      {row('Permission', permission, permission === 'granted')}
      {row('Tokens (Firestore)', tokenCount, typeof tokenCount === 'number' && tokenCount > 0)}
      {row('Backend', BACKEND, undefined)}
      {row('User-Agent', ua.slice(0, 60) + (ua.length > 60 ? '…' : ''), undefined)}

      <button onClick={doTest} disabled={testing} style={{ width: '100%', marginTop: 12, background: testing ? '#232733' : 'linear-gradient(135deg,#1877F2,#42A5F5)', border: 'none', borderRadius: 20, padding: '10px 0', color: '#fff', fontWeight: 700, fontSize: 13, cursor: testing ? 'wait' : 'pointer', fontFamily: 'Poppins' }}>
        {testing ? 'Envoi…' : 'Envoyer un test push à moi-même'}
      </button>

      {result && (
        <div style={{ marginTop: 10, background: result.ok ? '#14532d' : '#3b0000', border: '1px solid ' + (result.ok ? '#16a34a' : '#ef4444'), borderRadius: 10, padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: result.ok ? '#86efac' : '#fca5a5' }}>
            {result.ok ? '✅ Backend OK' : '❌ Échec'} — HTTP {result.status}
          </p>
          {result.body && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, wordBreak: 'break-all' }}>{result.body}</p>}
        </div>
      )}

      <p style={{ fontSize: 11, color: '#65676B', marginTop: 10, lineHeight: 1.6 }}>
        Si <b>web</b> ici alors que tu as ouvert l'APK 11,7 Mo → c'est une autre appli (PWA/TWA) qui s'ouvre.
        Si <b>natif</b> + <b>Tokens ≥ 1</b> → le push natif est prêt.
      </p>
    </div>
  );
}
