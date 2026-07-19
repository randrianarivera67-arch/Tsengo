import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase';

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
  const [map, setMap] = useState(cache);
  useEffect(() => {
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
  }, []);
  return map;
}
