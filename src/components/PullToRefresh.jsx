import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 70;
const MAX_PULL = 110;

export default function PullToRefresh({ onRefresh }) {
  const [pull, setPullState] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const pullRef = useRef(0);
  const spinningRef = useRef(false);
  const startY = useRef(0);
  const dragging = useRef(false);

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

  function doRefresh() {
    spinningRef.current = true;
    setSpinning(true);
    try { onRefresh && onRefresh(); } catch (e) { /* ignore */ }
    setTimeout(() => { spinningRef.current = false; setSpinning(false); setPull(0); }, 800);
  }

  useEffect(() => {
    function onStart(e) {
      if (spinningRef.current) return;
      if (scrollTopOf(e.target) > 2) { dragging.current = false; return; }
      startY.current = e.touches[0].clientY;
      dragging.current = true;
    }
    function onMove(e) {
      if (!dragging.current || spinningRef.current) return;
      if (scrollTopOf(e.target) > 2) { dragging.current = false; setPull(0); return; }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { setPull(0); return; }
      setPull(Math.min(MAX_PULL, dy * 0.5));
      if (pullRef.current > 12 && e.cancelable) e.preventDefault();
    }
    function onEnd() {
      if (!dragging.current) return;
      dragging.current = false;
      if (pullRef.current >= THRESHOLD) doRefresh(); else setPull(0);
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
  }, []);

  useEffect(() => {
    function onHomeTap() { doRefresh(); }
    window.addEventListener('trengo:refresh-home', onHomeTap);
    return () => window.removeEventListener('trengo:refresh-home', onHomeTap);
  }, []);

  const visible = pull > 0 || spinning;
  const size = spinning ? 46 : Math.min(46, 20 + pull * 0.28);
  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div aria-hidden="true" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90,
      display: 'flex', justifyContent: 'center',
      height: visible ? Math.max(pull, spinning ? 64 : 0) : 0,
      overflow: 'hidden', transition: dragging.current ? 'none' : 'height .25s ease',
      pointerEvents: 'none',
    }}>
      <div style={{
        marginTop: 12, width: size, height: size, borderRadius: '50%',
        background: '#fff', boxShadow: '0 3px 14px rgba(0,0,0,.20)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: spinning ? 1 : 0.4 + progress * 0.6,
      }}>
        <img src="/icon-192.png" alt="" width={size * 0.66} height={size * 0.66}
          style={{
            borderRadius: '50%',
            transform: spinning ? undefined : `scale(${0.7 + progress * 0.3})`,
            animation: spinning ? 'trengo-breathe .9s ease-in-out infinite' : undefined,
          }} />
      </div>
      <style>{`@keyframes trengo-breathe { 0%,100% { transform: scale(0.82); opacity: .7; } 50% { transform: scale(1.12); opacity: 1; } }`}</style>
    </div>
  );
}
