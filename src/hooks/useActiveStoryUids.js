import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

let uidCache = new Set();
let docsCache = [];
const listeners = new Set();
let unsubGlobal = null;
let refCount = 0;

function ensureSubscribed() {
  if (unsubGlobal) return;
  const q = query(collection(db, 'stories'), orderBy('ts', 'desc'), limit(300));
  unsubGlobal = onSnapshot(q, snap => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const uids = new Set();
    const docs = [];
    snap.docs.forEach(d => {
      const data = d.data();
      if ((data.ts || 0) <= cutoff) return;
      uids.add(data.uid);
      docs.push({ id: d.id, ...data });
    });
    uidCache = uids;
    docsCache = docs;
    listeners.forEach(cb => { try { cb(); } catch {} });
  }, () => {});
}

function useStoriesSubscription(pick) {
  const [value, setValue] = useState(pick);
  useEffect(() => {
    refCount++;
    ensureSubscribed();
    const cb = () => setValue(pick());
    listeners.add(cb);
    cb();
    return () => {
      listeners.delete(cb);
      refCount--;
      if (refCount <= 0 && unsubGlobal) { unsubGlobal(); unsubGlobal = null; }
    };
  }, []);
  return value;
}

export function useActiveStoryUids() {
  return useStoriesSubscription(() => new Set(uidCache));
}

export function useActiveStories() {
  return useStoriesSubscription(() => docsCache);
}
