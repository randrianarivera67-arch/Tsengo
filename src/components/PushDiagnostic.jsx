// src/components/PushDiagnostic.jsx
// Diagnostic push (panel admin) : montre où la chaîne casse.
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getPushState, sendTestPush } from '../utils/nativePush';

export default function PushDiagnostic({ uid }) {
  const [state, setState] = useState(null);
  const [tokenCount, setTokenCount] = useState(null);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  async function refresh() {
    try {
      const st = await getPushState();
      setState(st);
    } catch (e) {
      setState({ native:false, platform:'?', permission:'erreur', hasToken:false, token:null, error:(e&&e.message)||String(e), backend:'?', hasSecret:false });
    }
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      const toks = (snap.exists() && snap.data().fcmTokens) || [];
      setTokenCount(Array.isArray(toks) ? toks.length : 0);
    } catch { setTokenCount(null); }
  }
  useEffect(() => { refresh(); }, [uid]);

  async function doTest() {
    setTesting(true); setResult(null);
    const r = await sendTestPush(uid);
    setResult(r);
    setTesting(false);
  }

  const row = (label, value, good) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderBottom: '1px solid #232733' }}>
      <span style={{ fontSize: 12, color: '#65676B' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: good === true ? '#22c55e' : good === false ? '#ef4444' : '#E4E6EB', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ background: '#050505', border: '1px solid #232733', borderRadius: 14, padding: '14px 16px', marginBottom: 14, fontFamily: 'Poppins' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: '#E4E6EB' }}>🔔 Diagnostic Push</p>
        <button onClick={refresh} style={{ background: '#232733', border: 'none', borderRadius: 16, padding: '5px 12px', color: '#65676B', cursor: 'pointer', fontSize: 12 }}>↻ Rafraîchir</button>
      </div>

      {!state ? <p style={{ color: '#65676B', fontSize: 12 }}>Chargement…</p> : (
        <>
          {row('Plateforme', state.platform + (state.native ? ' (natif)' : ' (web)'), state.native)}
          {row('Permission', state.permission, state.permission === 'granted')}
          {row('Token cet appareil', state.hasToken ? state.token : 'aucun', state.hasToken)}
          {row('Tokens enregistrés (Firestore)', tokenCount === null ? '?' : tokenCount, tokenCount > 0)}
          {row('Backend', state.backend, undefined)}
          {row('Secret backend', state.hasSecret ? 'présent' : 'MANQUANT', state.hasSecret)}
          {state.error && row('Dernière erreur', state.error, false)}

          <button onClick={doTest} disabled={testing} style={{ width: '100%', marginTop: 12, background: testing ? '#232733' : 'linear-gradient(135deg,#1877F2,#42A5F5)', border: 'none', borderRadius: 20, padding: '10px 0', color: '#fff', fontWeight: 700, fontSize: 13, cursor: testing ? 'wait' : 'pointer', fontFamily: 'Poppins' }}>
            {testing ? 'Envoi…' : 'Envoyer un test push à moi-même'}
          </button>

          {result && (
            <div style={{ marginTop: 10, background: result.ok ? '#14532d' : '#3b0000', border: `1px solid ${result.ok ? '#16a34a' : '#ef4444'}`, borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: result.ok ? '#86efac' : '#fca5a5' }}>
                {result.ok ? '✅ Backend OK' : '❌ Échec'} — HTTP {result.status}
              </p>
              {result.body && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, wordBreak: 'break-all' }}>{result.body}</p>}
              <p style={{ fontSize: 11, color: '#65676B', marginTop: 6 }}>
                {result.ok
                  ? 'Si aucune notification n\'apparaît malgré HTTP 200 : le backend envoie sans bloc notification{title,body}, ou aucun token valide.'
                  : 'Le backend a refusé/est injoignable (Render endormi, secret, ou /notify absent).'}
              </p>
            </div>
          )}

          <p style={{ fontSize: 11, color: '#65676B', marginTop: 10, lineHeight: 1.6 }}>
            Lecture : <b>Tokens = 0</b> → registration échoue (google-services.json / plugin / permission).
            <b> Tokens &gt; 0 + test ❌</b> → backend. <b>Test ✅ mais rien</b> → payload backend (data-only) ou canal.
          </p>
        </>
      )}
    </div>
  );
}
