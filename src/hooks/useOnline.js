import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase';
import { isLiteOn, subscribeLite } from '../utils/liteMode';

let cache = {};
const listeners = new Set();
let unsubGlobal = null;
let refCount = 0;

function ensureSubscribed() {
  if (unsubGlobal) return;
  unsubGlobal = onValue(ref(rtdb, 'online'), snap => {
    cache = snap.val() || {};
    listeners.forEach(cb => { try { cb(cache); } catch {} });
  }, () => {});
}

export function useOnline() {
  const [lite, setLiteState] = useState(isLiteOn());
  useEffect(() => subscribeLite(setLiteState), []);

  const [map, setMap] = useState(() => (isLiteOn() ? {} : cache));
  useEffect(() => {
    // ── MODE LITE ────────────────────────────────────────────────────────
    // Ny listener `online` dia mandefa ny tabilao MANONTOLO amin'ny mpampiasa
    // REHETRA isaky ny misy olona misokatra na mikatona ny app. Io no loharano
    // lehibe indrindra amin'ny data mitohy. Amin'ny Lite dia tsy misy mihitsy
    // — very ny 点 maitso, fa tsy misy octet lany.
    if (lite) { setMap({}); return; }
    refCount++;
    ensureSubscribed();
    const cb = m => setMap({ ...m });
    listeners.add(cb);
    setMap({ ...cache });
    return () => {
      listeners.delete(cb);
      refCount--;
      if (refCount <= 0 && unsubGlobal) { unsubGlobal(); unsubGlobal = null; }
    };
  }, [lite]);
  return map;
}
