// src/hooks/useKeyboardInset.js
// Haavon'ny clavier (px). 0 raha mikatona.
//
// Ny `visualViewport` dia fenitra navigateur : mihena ny haavony rehefa
// miakatra ny clavier. Ny haavo LEHIBE INDRINDRA hita no fototra ampitahana
// (ny `window.innerHeight` dia mihena koa amin'ny Chrome Android).
import { useEffect, useState, useRef } from 'react';

export default function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  const baseRef = useRef(0);   // haavo lehibe indrindra hita (clavier mikatona)

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;                       // navigateur tranainy → 0 foana
    // ⚠️ TSY azo ampiasaina ny `window.innerHeight` : amin'ny Chrome Android
    // dia MIHENA KOA izy rehefa miakatra ny clavier (layout viewport resize),
    // ka lasa 0 foana ny elanelana. Ny haavo LEHIBE INDRINDRA hita no fototra.
    const update = () => {
      const h = vv.height;
      if (h > baseRef.current) baseRef.current = h;      // clavier mikatona
      const gap = Math.max(0, baseRef.current - h);
      // < 80 px : barre navigateur na fiovana kely, tsy clavier
      setInset(gap > 80 ? Math.round(gap) : 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
