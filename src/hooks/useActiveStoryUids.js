// src/hooks/useActiveStoryUids.js
// Miverina Set() misy ny uid rehetra manana story mbola velona (< 24 ora) —
// ampiasaina hanaovana bordure bleu manodidina ny avatar n'aiza n'aiza.
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

let cache = new Set();
const listeners = new Set();
let unsubGlobal = null;
let refCount = 0;

function ensureSubscribed() {
  if (unsubGlobal) return;
  const q = query(collection(db, 'stories'), orderBy('ts', 'desc'), limit(300));
  unsubGlobal = onSnapshot(q, snap => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const next = new Set();
    snap.docs.forEach(d => {
      const data = d.data();
      if ((data.ts || 0) > cutoff) next.add(data.uid);
    });
    cache = next;
    listeners.forEach(cb => { try { cb(cache); } catch {} });
  }, () => {});
}

export function useActiveStoryUids() {
  const [uids, setUids] = useState(cache);
  useEffect(() => {
    refCount++;
    ensureSubscribed();
    const cb = s => setUids(new Set(s));
    listeners.add(cb);
    setUids(new Set(cache));
    return () => {
      listeners.delete(cb);
      refCount--;
      if (refCount <= 0 && unsubGlobal) { unsubGlobal(); unsubGlobal = null; }
    };
  }, []);
  return uids;
}
