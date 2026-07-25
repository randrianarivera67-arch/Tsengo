import { useEffect, useRef, useState } from 'react';

const CHECK_MS = 30 * 60 * 1000;
const FIRST_MS = 15 * 1000;

function currentEntry() {
  const el = document.querySelector('script[type="module"][src*="/assets/index-"]');
  return el ? el.getAttribute('src') : null;
}

export default function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const mine = currentEntry();
    if (!mine) return;
    let stopped = false;

    async function check() {
      if (stopped || doneRef.current) return;
      try {
        const res = await fetch('/index.html?_=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const html = await res.text();
        const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
        if (m && m[1] !== mine) { doneRef.current = true; setReady(true); }
      } catch { /* silencieux */ }
    }

    const t  = setTimeout(check, FIRST_MS);
    const id = setInterval(check, CHECK_MS);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      stopped = true;
      clearTimeout(t); clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  if (!ready) return null;

  return (
    <div style={{
      position: 'fixed', left: 16, right: 16, bottom: 150, zIndex: 219,
      maxWidth: 480, margin: '0 auto',
      background: 'linear-gradient(135deg,#1877F2,#4A9BFF)', color: '#fff',
      borderRadius: 16, padding: '11px 14px', boxShadow: '0 6px 22px rgba(0,0,0,.22)',
      display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Poppins',
    }}>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>Mise à jour disponible</span>
      <button
        onClick={() => { try { window.location.reload(); } catch {} }}
        style={{
          background: '#fff', color: '#1877F2', border: 'none', borderRadius: 14,
          padding: '7px 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins',
        }}>
        Recharger
      </button>
      <button
        onClick={() => setReady(false)}
        aria-label="Fermer"
        style={{ background: 'rgba(255,255,255,.22)', color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>
        ×
      </button>
    </div>
  );
}
