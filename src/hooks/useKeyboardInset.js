// src/hooks/useKeyboardInset.js
// Haavon'ny clavier (px). 0 raha mikatona.
//
// Ny `visualViewport` dia fenitra navigateur : rehefa miakatra ny clavier dia
// mihena ny haavony nefa tsy miova ny `window.innerHeight`. Ny elanelana no
// haavon'ny clavier. Mandeha ao anaty WebView Capacitor.
import { useEffect, useState } from 'react';

export default function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;                       // navigateur tranainy → 0 foana
    const update = () => {
      const gap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // < 80 px : barre navigateur, tsy clavier
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
