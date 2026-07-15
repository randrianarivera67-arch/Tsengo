// src/components/PullToRefresh.jsx
// Rafitra "tirer pour actualiser" mahomby amin'ny WEB **sy** ny APK natif
// (JS/touch tsotra — tsy miankina amin'ny overscroll an'ny navigateur, izay
// tsy misy ao anaty WebView Capacitor). Mamaly koa ny "tapotra Accueil
// rehefa efa ao Accueil" (événement window "trengo:refresh-home").
import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 70;   // segondra fitiavana mba hiantsoana ny refresh
const MAX_PULL  = 110;

export default function PullToRefresh({ onRefresh }) {
  const [pull, setPull] = useState(0);      // 0..MAX_PULL, an'ny visuel
  const [spinning, setSpinning] = useState(false);
  const startY = useRef(0);
  const dragging = useRef(false);
  const atTop = useRef(true);

  function scrollTop() {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function doRefresh(fromGesture) {
    setSpinning(true);
    window.scrollTo({ top: 0, behavior: fromGesture ? 'auto' : 'smooth' });
    try { onRefresh && onRefresh(); } catch (e) { /* ignore */ }
    setTimeout(() => { setSpinning(false); setPull(0); }, 700);
  }

  useEffect(() => {
    function onTouchStart(e) {
      if (spinning) return;
      atTop.current = scrollTop() <= 2;
      if (!atTop.current) return;
      startY.current = e.touches[0].clientY;
      dragging.current = true;
    }
    function onTouchMove(e) {
      if (!dragging.current || spinning) return;
      if (scrollTop() > 2) { dragging.current = false; setPull(0); return; }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { setPull(0); return; }
      // resistance : tsy mihoatra ny MAX_PULL, ary mihena kely arakaraka ny halavany
      const p = Math.min(MAX_PULL, dy * 0.5);
      setPull(p);
      if (p > 12 && e.cancelable) e.preventDefault();
    }
    function onTouchEnd() {
      if (!dragging.current) return;
      dragging.current = false;
      if (pull >= THRESHOLD) doRefresh(true);
      else setPull(0);
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pull, spinning]);

  // Tapotra "Accueil" rehefa efa ao Accueil -> mitovy fihetsika
  useEffect(() => {
    function onHomeTap() { doRefresh(false); }
    window.addEventListener('trengo:refresh-home', onHomeTap);
    return () => window.removeEventListener('trengo:refresh-home', onHomeTap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = pull > 0 || spinning;
  const size = spinning ? 34 : Math.min(34, 14 + pull * 0.2);
  const rotation = spinning ? undefined : Math.min(180, (pull / THRESHOLD) * 180);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90,
        display: 'flex', justifyContent: 'center',
        height: visible ? Math.max(pull, spinning ? 50 : 0) : 0,
        overflow: 'hidden', transition: dragging.current ? 'none' : 'height .25s ease',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        marginTop: 10, width: size, height: size, borderRadius: '50%',
        background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: rotation !== undefined ? `rotate(${rotation}deg)` : 'none',
      }}>
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none"
          style={spinning ? { animation: 'trengo-spin .7s linear infinite' } : undefined}>
          <path d="M12 4a8 8 0 1 1-7.446 5.032" stroke="#FF2D8D" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M4 4v5h5" stroke="#FF2D8D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <style>{`@keyframes trengo-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
