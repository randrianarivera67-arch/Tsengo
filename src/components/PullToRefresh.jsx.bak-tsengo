import { useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Pull-to-refresh "façon Facebook" :
//  - Résistance élastique (courbe non linéaire) rehefa misintona midina
//  - Effet RESSORT (mievotra / spring bounce) rehefa alefa ny tanana
//  - Logo Tsengo mihodina + mievotra mandritra ny chargement
//  - Miandry ny fahavitan'ny onRefresh() MARINA (Promise) fa tsy 800ms raikitra
//  - Tsy "silent no-op" intsony : na misy chargement mandeha aza dia mbola
//    tanterahina ny refresh (ny logique dia ao amin'ny onRefresh)
// ─────────────────────────────────────────────────────────────────────────────

const THRESHOLD = 72;   // halavan'ny fisintonana ilaina vao refresh
const MAX_PULL  = 150;  // fetra ambony (élastique)
const MIN_SPIN  = 650;  // faharetan'ny spinner farafahakeliny (ms) — tsy "flash"

export default function PullToRefresh({ onRefresh }) {
  const [pull, setPullState]   = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [springing, setSpringing] = useState(false); // animation ressort am-piverenana
  const pullRef      = useRef(0);
  const spinningRef  = useRef(false);
  const startY       = useRef(0);
  const dragging     = useRef(false);
  const draggingUI   = useRef(false);

  function setPull(v) { pullRef.current = v; setPullState(v); }

  function scrollTopOf(target) {
    let el = target;
    while (el && el.nodeType === 1 && el !== document.body) {
      try {
        const oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 2) {
          return el.scrollTop;
        }
      } catch (e) { /* ignore */ }
      el = el.parentElement;
    }
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  async function doRefresh() {
    if (spinningRef.current) return;
    spinningRef.current = true;
    setSpinning(true);
    setSpringing(true);           // mievotra mankamin'ny toerana "spinner"
    setPull(THRESHOLD);           // mijanona eo amin'ny haavon'ny spinner
    const t0 = Date.now();
    try {
      const r = onRefresh && onRefresh();
      if (r && typeof r.then === 'function') await r;   // miandry ny chargement MARINA
    } catch (e) { /* ignore */ }
    const wait = Math.max(0, MIN_SPIN - (Date.now() - t0));
    setTimeout(() => {
      spinningRef.current = false;
      setSpinning(false);
      setPull(0);                 // mikatona miaraka amin'ny transition ressort
      setTimeout(() => setSpringing(false), 450);
    }, wait);
  }

  useEffect(() => {
    function onStart(e) {
      if (spinningRef.current) return;
      if (scrollTopOf(e.target) > 2) { dragging.current = false; return; }
      startY.current = e.touches[0].clientY;
      dragging.current = true;
      draggingUI.current = false;
    }
    function onMove(e) {
      if (!dragging.current || spinningRef.current) return;
      if (scrollTopOf(e.target) > 2) { dragging.current = false; draggingUI.current = false; setPull(0); return; }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { draggingUI.current = false; setPull(0); return; }
      // Résistance élastique : mihamafy arakaraka ny halaviran'ny fisintonana
      const eased = MAX_PULL * (1 - Math.exp(-dy / 160));
      draggingUI.current = true;
      setSpringing(false);
      setPull(Math.min(MAX_PULL, eased));
      if (pullRef.current > 10 && e.cancelable) e.preventDefault();
    }
    function onEnd() {
      if (!dragging.current) return;
      dragging.current = false;
      draggingUI.current = false;
      if (pullRef.current >= THRESHOLD) doRefresh();
      else { setSpringing(true); setPull(0); setTimeout(() => setSpringing(false), 450); }
    }
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tap "Accueil" eo amin'ny barre de navigation → refresh koa
  useEffect(() => {
    function onHomeTap() { doRefresh(); }
    window.addEventListener('trengo:refresh-home', onHomeTap);
    return () => window.removeEventListener('trengo:refresh-home', onHomeTap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible  = pull > 0 || spinning;
  const progress = Math.min(1, pull / THRESHOLD);
  const size     = spinning ? 46 : Math.min(46, 22 + pull * 0.26);

  return (
    <div aria-hidden="true" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90,
      display: 'flex', justifyContent: 'center',
      height: visible ? Math.max(pull, spinning ? 68 : 0) : 0,
      overflow: 'visible', pointerEvents: 'none',
      transition: draggingUI.current
        ? 'none'
        : (springing ? 'height .45s cubic-bezier(.2,1.4,.4,1)' : 'height .25s ease'),
    }}>
      <div style={{
        marginTop: 12, width: size, height: size, borderRadius: '50%',
        background: '#fff', boxShadow: '0 4px 18px rgba(0,0,0,.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: spinning ? 1 : 0.35 + progress * 0.65,
        transform: `rotate(${progress * 180}deg)`,
        transition: draggingUI.current ? 'none' : 'transform .45s cubic-bezier(.2,1.4,.4,1)',
      }}>
        <img src="/icon-192.png" alt="" width={size * 0.68} height={size * 0.68}
          style={{
            borderRadius: '50%',
            transform: spinning ? undefined : `scale(${0.7 + progress * 0.3})`,
            animation: spinning ? 'tsengo-spin-breathe .8s ease-in-out infinite' : undefined,
          }} />
      </div>
      <style>{`@keyframes tsengo-spin-breathe {
        0%   { transform: scale(.82) rotate(0deg);   opacity:.75; }
        50%  { transform: scale(1.14) rotate(180deg); opacity:1;   }
        100% { transform: scale(.82) rotate(360deg);  opacity:.75; }
      }`}</style>
    </div>
  );
}
